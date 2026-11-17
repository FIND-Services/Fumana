import 'posthog-js/dist/surveys';
import posthog, { DisplaySurveyType, SurveyPosition } from 'posthog-js';

// PostHog project tokens are public browser identifiers, not private API keys.
// Keep a production fallback so a Vercel placeholder cannot silently disable
// feedback. Environment values still take priority when they are valid.
const productionToken = 'phc_xY95jCwmBGRa4jNZyuG4LyJyBUf3NVxyoaNB7LuD4Qzf';
const configuredToken = (import.meta.env.VITE_POSTHOG_PROJECT_TOKEN || import.meta.env.VITE_POSTHOG_KEY || '').trim();
const token = configuredToken.startsWith('phc_') ? configuredToken : productionToken;
const host = (import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com').trim();

export const hasPostHog = Boolean(token);

if (hasPostHog) {
  posthog.init(token, {
    api_host: host,
    capture_pageview: true,
    disable_surveys: false,
    disable_external_dependency_loading: true,
  });
}

export function showOpenFeedbackSurvey(): Promise<boolean> {
  if (!hasPostHog) return Promise.resolve(false);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (shown: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(shown);
    };
    const timeoutId = window.setTimeout(() => finish(false), 10000);

    posthog.getSurveys((surveys, context) => {
      if (context && !context.isLoaded) {
        if (context.error) finish(false);
        return;
      }
      const survey = surveys.find((item) => item.name === 'Fumana - Open feedback');
      if (!survey) { finish(false); return; }
      posthog.displaySurvey(survey.id, {
        displayType: DisplaySurveyType.Popover,
        ignoreConditions: true,
        ignoreDelay: true,
        position: SurveyPosition.Right,
      });
      finish(true);
    }, true);
  });
}

export default posthog;
