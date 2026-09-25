// Persistence layer. Maps between Supabase rows and the app's in-memory shapes.
//
// Every export is safe to call with no backend configured: it resolves to null
// and the caller keeps its optimistic local update. When Supabase IS set, these
// write through; RLS on the database enforces the bias shield and ownership.
//
// The app keys network entries by masked handle, so lookups resolve handle ->
// builder id at write time rather than threading uuids through the UI.

import { supabase, currentUser } from "./backend";

const rowToBuilder = (r, myId) => ({
  id: r.id,
  handle: r.masked_handle,
  role: r.role || "",
  summary: r.summary || "",
  skills: r.skills || [],
  dimensions: r.dimensions || [],
  profileStrength: r.profile_strength ?? 0,
  tier: r.tier || { name: "Unrated", color: "#4A5C68" },
  isYou: Boolean(myId && r.id === myId),
  isPremium: r.is_premium || false,
  premiumSince: r.premium_since || null,
});

async function myBuilder() {
  const user = await currentUser();
  if (!user) return null;
  const { data } = await supabase.from("builders").select("*").eq("owner_id", user.id).maybeSingle();
  return data || null;
}

async function myEmployer() {
  const user = await currentUser();
  if (!user) return null;
  const { data } = await supabase.from("employers").select("*").eq("owner_id", user.id).maybeSingle();
  return data || null;
}

// Reads the shared network: masked builder pool, my reveal-level rows where
// RLS allows (my own record, plus builders committed to interview with my org),
// my matches both as employer and as builder, squads, and my audit trail.
// Returns null when unconfigured so the caller keeps its seeded defaults.
export async function loadNetwork() {
  if (!supabase) return null;
  const [{ data: pub }, mine, employer, { data: fxRows }] = await Promise.all([
    supabase.from("builders_public").select("*"),
    myBuilder(),
    myEmployer(),
    supabase.from("fx_rates").select("*"),
  ]);
  const myId = mine?.id || null;

  // Owner-only assessment payloads (experience, transcript, cv) live in
  // builder_documents so the employer reveal grant never exposes them.
  const { data: docs } = myId
    ? await supabase.from("builder_documents").select("*").eq("builder_id", myId).maybeSingle()
    : { data: null };

  // Latest seeded FX quote the Finance derivation runs on (USD/NGN today).
  const fx = (fxRows || []).find(r => r.base_pair === "USD/NGN") || null;

  // RLS scopes this to rows I may read in full: mine + builders revealed to me.
  const { data: fullRows } = await supabase.from("builders").select("*");
  const fullById = Object.fromEntries((fullRows || []).map(r => [r.id, r]));
  const builders = (pub || []).map(m => rowToBuilder(fullById[m.id] || m, myId));

  // Matches I can see: my org's pipeline plus engagements involving my builder.
  const { data: matches } = await supabase.from("matches").select("*");
  const byBuilder = Object.fromEntries(builders.map(b => [b.id, b]));
  const pipeline = { shortlisted: [], interviewing: [], sow: [] };
  for (const m of matches || []) {
    const b = byBuilder[m.builder_id];
    if (!b || !pipeline[m.status]) continue;
    pipeline[m.status].push({ ...b, fit: m.fit, monthlyUsd: m.monthly_usd });
  }

  // Squads with my membership flag.
  const [{ data: squads }, { data: memberships }] = await Promise.all([
    supabase.from("squads").select("*"),
    myId ? supabase.from("squad_members").select("squad_id").eq("builder_id", myId) : { data: [] },
  ]);
  const mine2 = new Set((memberships || []).map(x => x.squad_id));
  const squadList = (squads || []).map(s => ({ ...s, joined: mine2.has(s.id) }));

  // My audit trail, newest first, in the app's { kind, ...payload, at } shape.
  const { data: audit } = await supabase.from("audit_events").select("*").order("created_at", { ascending: false });
  const auditList = (audit || []).map(e => ({ kind: e.kind, ...(e.payload || {}), at: Date.parse(e.created_at) }));

  return { builders, pipeline, squads: squadList, audit: auditList, me: mine, docs: docs || null, employer, fx };
}

// ---- writes (each resolves quietly when there is no backend or no session) ----

// Upserts keyed on owner_id: retaking the assessment refreshes the same row
// rather than creating a duplicate. The private payload (experience,
// transcript, accommodations, cv) goes to builder_documents, which employers
// can never read even after reveal.
export async function addBuilder(b) {
  if (!supabase) return;
  const user = await currentUser();
  if (!user) return;
  const fields = {
    owner_id: user.id,
    masked_handle: b.handle,
    name: b.name || null,
    city: b.city || null,
    role: b.role || "",
    summary: b.summary || "",
    skills: b.skills || [],
    dimensions: b.dimensions || [],
    profile_strength: b.profileStrength ?? null,
    tier: b.tier || null,
  };
  let { data: row, error } = await supabase.from("builders").upsert(fields, { onConflict: "owner_id" }).select("id").single();
  // Before the persistence migration lands there is no unique constraint on
  // owner_id; fall back to a plain insert so saves keep working meanwhile.
  if (error) ({ data: row } = await supabase.from("builders").insert(fields).select("id").single());
  if (!row) return;
  await supabase.from("builder_documents").upsert({
    builder_id: row.id,
    experience: b.experience || null,
    transcript: b.transcript || [],
    cv: b.cv || null,
    accommodations: b.accommodations || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "builder_id" });
}

// Partial update of the owner-only documents (CV saves, transcript, etc).
export async function saveBuilderDocs(patch) {
  if (!supabase) return;
  const me = await myBuilder();
  if (!me) return;
  await supabase.from("builder_documents").upsert(
    { builder_id: me.id, ...patch, updated_at: new Date().toISOString() },
    { onConflict: "builder_id" }
  );
}

// Experience Alchemist output lands on the reveal-level profile: the outcomes
// employers may eventually see, plus the integrity note attesting nothing was
// invented. The raw input text stays in builder_documents.
export async function saveAlchemist(result) {
  if (!supabase) return;
  const me = await myBuilder();
  if (!me) return;
  await supabase.from("builders").update({
    outcomes: result?.outcomes || [],
    integrity_note: result?.integrityNote || null,
  }).eq("id", me.id);
}

export async function removeBuilder(handle) {
  if (!supabase) return;
  await supabase.from("builders").delete().eq("masked_handle", handle);
}

// Upserts the employer's company record, keyed on the signed-in owner.
export async function saveCompany(company) {
  if (!supabase) return;
  const user = await currentUser();
  if (!user) return;
  await supabase.from("employers").upsert({
    owner_id: user.id,
    name: company.name, domain: company.domain, industry: company.industry,
    size: company.size, country: company.country, hiring_for: company.hiringFor,
  }, { onConflict: "owner_id" });
}

// Rewrites the current employer's pipeline to match the given stage map.
// Resolves handles to builder ids, upserts matches, and removes matches whose
// builder is no longer in any stage. SOW-stage entries also get an engagement.
export async function savePipeline(pipeline) {
  if (!supabase) return;
  const employer = await myEmployer();
  if (!employer) return;
  const stages = ["shortlisted", "interviewing", "sow"];
  const entries = stages.flatMap(status => (pipeline[status] || []).map(c => ({ status, c })));
  const handles = entries.map(e => e.c.handle);
  // Resolve handles through the masked view: the employer legitimately cannot
  // read builders rows that aren't revealed to them, and id+handle are the
  // public fields the view exists to expose.
  const { data: brows } = handles.length
    ? await supabase.from("builders_public").select("id, masked_handle").in("masked_handle", handles)
    : { data: [] };
  const idOf = Object.fromEntries((brows || []).map(b => [b.masked_handle, b.id]));

  const keep = [];
  for (const { status, c } of entries) {
    const bid = idOf[c.handle];
    if (!bid) continue;
    keep.push(bid);
    const { data: match } = await supabase.from("matches").upsert({
      builder_id: bid, employer_id: employer.id, status,
      fit: c.fit ?? null, monthly_usd: c.monthlyUsd ?? null,
    }, { onConflict: "builder_id,employer_id" }).select("id").single();
    if (status === "sow" && match?.id) {
      await supabase.from("engagements").upsert(
        { match_id: match.id, monthly_usd: c.monthlyUsd ?? null },
        { onConflict: "match_id" }
      );
    }
  }
  // Drop matches for this employer that are no longer in the pipeline.
  let q = supabase.from("matches").delete().eq("employer_id", employer.id);
  if (keep.length) q = q.not("builder_id", "in", `(${keep.join(",")})`);
  await q;
}

export async function joinSquad(squadId) {
  if (!supabase) return;
  const me = await myBuilder();
  if (!me) return;
  await supabase.from("squad_members").upsert({ squad_id: squadId, builder_id: me.id });
  await supabase.rpc("bump_squad_members", { p_squad: squadId, p_delta: 1 });
}

export async function leaveSquad(squadId) {
  if (!supabase) return;
  const me = await myBuilder();
  if (!me) return;
  await supabase.from("squad_members").delete().eq("squad_id", squadId).eq("builder_id", me.id);
  await supabase.rpc("bump_squad_members", { p_squad: squadId, p_delta: -1 });
}

export async function formSquad({ id, name, focus, pitch }) {
  if (!supabase) return;
  const me = await myBuilder();
  const squadId = id || "sq-" + Math.random().toString(36).slice(2, 8);
  await supabase.from("squads").insert({ id: squadId, name, focus, pitch, members: 1 });
  if (me) await supabase.from("squad_members").insert({ squad_id: squadId, builder_id: me.id });
}

// Persists the SOW draft and records the SROI derivation as a computed ledger
// row — the same math the Finance screen runs, stored so impact figures are
// reproducible rather than narrated. Each save appends a fresh computed_at row.
export async function saveSow(handle, sow) {
  if (!supabase) return;
  const employer = await myEmployer();
  if (!employer) return;
  const { data: b } = await supabase.from("builders_public").select("id").eq("masked_handle", handle).maybeSingle();
  if (!b) return;
  const { data: m } = await supabase.from("matches").select("id, monthly_usd").eq("employer_id", employer.id).eq("builder_id", b.id).maybeSingle();
  if (!m) return;
  const { data: eng } = await supabase.from("engagements")
    .upsert({ match_id: m.id, sow }, { onConflict: "match_id" })
    .select("id").single();
  if (!eng?.id) return;
  const { data: fx } = await supabase.from("fx_rates").select("rate").eq("base_pair", "USD/NGN").maybeSingle();
  const rate = fx?.rate ?? null;
  const monthly = m.monthly_usd || sow?.monthlyUsd || 0;
  if (!rate || !monthly) return;
  const grossUsd = monthly * 12;
  const grossLocal = grossUsd * Number(rate);
  await supabase.from("sroi_entries").insert({
    engagement_id: eng.id,
    gross_usd: grossUsd,
    fx_rate: rate,
    gross_local: grossLocal,
    retention_pct: 62,
    retained_local: Math.round(grossLocal * 62 / 100),
    sdg_tags: sow?.sdgTags || [],
  });
}

export async function logAudit(evt) {
  if (!supabase) return;
  const user = await currentUser();
  if (!user) return;
  const { kind, ...payload } = evt;
  await supabase.from("audit_events").insert({ owner_id: user.id, kind, payload });
}

export async function setPremium(isPremium) {
  if (!supabase) return;
  const me = await myBuilder();
  if (!me) return;
  await supabase.from("builders").update({
    is_premium: isPremium,
    premium_since: isPremium ? new Date().toISOString().slice(0, 10) : null,
  }).eq("id", me.id);
}
