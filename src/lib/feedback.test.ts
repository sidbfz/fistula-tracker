import assert from 'node:assert/strict';
import test from 'node:test';

import { createFeedbackDraft, FEEDBACK_EMAIL } from './feedback';

test('feedback is a draft for the support address with only version and platform details', () => {
  const draft = createFeedbackDraft({ version: '1.0.3', build: '6', platform: 'Android', systemVersion: '16' });
  const url = new URL(draft.url);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, FEEDBACK_EMAIL);
  assert.equal(url.searchParams.get('subject'), draft.subject);
  assert.equal(url.searchParams.get('body'), draft.body);
  assert.match(draft.body, /App version: 1\.0\.3 \(build 6\)/);
  assert.match(draft.body, /System: Android 16/);
  assert.match(draft.body, /Please do not include medical information/);
  assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
});

test('feedback URI safely encodes punctuation instead of injecting mail recipients or parameters', () => {
  const draft = createFeedbackDraft({ version: 'test & preview', build: '6', platform: 'Android', systemVersion: '16?cc=other@example.com' });
  const url = new URL(draft.url);
  assert.equal(url.searchParams.get('cc'), null);
  assert.equal(url.searchParams.get('subject'), draft.subject);
  assert.equal(url.searchParams.get('body'), draft.body);
});
