import posthog, { DisplaySurveyType, SurveyPosition } from 'posthog-js';

const token = (import.meta.env.VITE_POSTHOG_PROJECT_TOKEN || import.meta.env.VITE_POSTHOG_KEY || '').trim();
const host = (import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com').trim();

export const hasPostHog = Boolean(token);

if (hasPostHog) {
  posthog.init(token, {
    api_host: host,
    capture_pageview: true,
    disable_surveys: false,
  });
}

export function showOpenFeedbackSurvey(): Promise<boolean> {
  if (!hasPostHog) return Promise.resolve(false);
  return new Promise((resolve) => {
    posthog.getSurveys((surveys) => {
      const survey = surveys.find((item) => item.name === 'Fumana - Open feedback');
      if (!survey) { resolve(false); return; }
      posthog.displaySurvey(survey.id, {
        displayType: DisplaySurveyType.Popover,
        ignoreConditions: true,
        ignoreDelay: true,
        position: SurveyPosition.Right,
      });
      resolve(true);
    }, true);
  });
}

export default posthog;
