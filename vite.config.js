import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { ttsEndpoint } from './server/tts-endpoint.js'
import { claudeEndpoint } from './server/claude-endpoint.js'

const repoRoot = fileURLToPath(new URL('./', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads .env files (and process.env). These stay server-side: only
  // import.meta.env.VITE_* is exposed to the browser bundle, so the provider
  // keys passed into the endpoints below never reach the client.
  const env = loadEnv(mode, repoRoot, '')
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const pagesBase = repositoryName && !repositoryName.endsWith('.github.io')
    ? `/${repositoryName}/`
    : '/'
  return {
    // Environment files live beside this root config. Vite uses this for
    // VITE_* values; local API middleware receives the same complete object.
    envDir: repoRoot,
    // GitHub project sites live below /<repository>/, while an account site
    // (for example cyruskazi-lex.github.io) lives at the domain root.
    base: process.env.GITHUB_ACTIONS ? pagesBase : '/',
    plugins: [react(), ttsEndpoint(env), claudeEndpoint(env)],
  }
})
