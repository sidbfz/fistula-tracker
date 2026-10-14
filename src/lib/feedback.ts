export const FEEDBACK_EMAIL = 'fistulatracker@gmail.com';

export type FeedbackDetails = {
  version: string;
  build: string;
  platform: string;
  systemVersion: string;
};

export function createFeedbackDraft(details: FeedbackDetails) {
  const subject = `Fistula Tracker ${details.version} feedback`;
  const body = [
    `App version: ${details.version} (build ${details.build})`,
    `System: ${details.platform} ${details.systemVersion}`,
    '',
    'What were you trying to do?',
    '',
    'What happened?',
    '',
    'What did you expect?',
    '',
    'Steps to repeat the problem:',
    '',
    'Please do not include medical information, private photos or journal entries.',
  ].join('\n');

  return {
    subject,
    body,
    url: `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
