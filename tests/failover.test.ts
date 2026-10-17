import { describe, it, expect, vi } from 'vitest';
import { executeChatWithFailover } from '../src/server/routes/chat';
import type { SSEEvent } from '../src/shared/types';

describe('Automatic Provider Failover', () => {
  it('emits failover event and cascades to OpenRouter when OpenCode Go returns 401', async () => {
    const emitted: SSEEvent[] = [];
    const mockInvoker = vi
      .fn()
      .mockRejectedValueOnce(new Error('HTTP 401: api_key_expired'))
      .mockImplementationOnce(async (_spec, _messages, _keys, onDelta) => {
        onDelta({ type: 'reasoning', delta: 'Fallback reasoning' });
        onDelta({ type: 'text', delta: 'Fallback response OK' });
      });

    await executeChatWithFailover(
      {
        modelId: 'deepseek-v4.1-flash',
        providerOverride: 'auto',
        messages: [{ role: 'user', content: 'Hello' }],
      },
      { opencodeGo: 'expired', gemini: 'gem', openrouter: 'or' },
      (evt) => emitted.push(evt),
      mockInvoker
    );

    expect(emitted.some((e) => e.type === 'failover' && e.from === 'opencode-go' && e.to === 'openrouter')).toBe(true);
    expect(emitted.some((e) => e.type === 'text' && e.delta === 'Fallback response OK')).toBe(true);
    expect(emitted.some((e) => e.type === 'done')).toBe(true);
  });
});
