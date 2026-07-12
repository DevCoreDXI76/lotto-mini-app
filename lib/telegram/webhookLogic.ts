export type WebhookAction =
  | { type: 'launchMiniApp' }
  | { type: 'forwardFeedback'; text: string }
  | { type: 'ignore' };

export function classifyMessage(text: string | undefined): WebhookAction {
  if (!text) return { type: 'ignore' };
  const trimmed = text.trim();
  if (!trimmed) return { type: 'ignore' };
  if (trimmed.startsWith('/start')) return { type: 'launchMiniApp' };
  if (trimmed.startsWith('/')) return { type: 'ignore' };
  return { type: 'forwardFeedback', text: trimmed };
}
