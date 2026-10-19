import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { PostHogProvider } from '@posthog/react'
import './index.css'
import App from './App.jsx'
import posthog from './lib/posthog'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </PostHogProvider>
  </StrictMode>,
)
