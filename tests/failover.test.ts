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

  it('cascades to OpenRouter when primary provider times out waiting for first token', async () => {
    const emitted: SSEEvent[] = [];
    const mockInvoker = vi
      .fn()
      .mockImplementationOnce(async (_spec, _messages, _keys, _onDelta, signal) => {
        // Simulates a hung upstream that never emits a delta and waits for signal abort
        return new Promise<void>((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new Error('First token timeout (6s)'));
          });
        });
      })
      .mockImplementationOnce(async (_spec, _messages, _keys, onDelta) => {
        onDelta({ type: 'text', delta: 'OpenRouter rescued the request' });
      });

    await executeChatWithFailover(
      {
        modelId: 'gemini-3.8-flash',
        providerOverride: 'auto',
        messages: [{ role: 'user', content: 'Prompt' }],
      },
      { opencodeGo: 'op', gemini: 'gem', openrouter: 'or' },
      (evt) => emitted.push(evt),
      mockInvoker,
      undefined,
      { firstTokenTimeoutMs: 50 } // Fast 50ms timeout for test
    );

    expect(
      emitted.some(
        (e) =>
          e.type === 'failover' &&
          e.from === 'gemini' &&
          e.to === 'openrouter' &&
          /TIMEOUT/i.test(e.reason)
      )
    ).toBe(true);
    expect(emitted.some((e) => e.type === 'text' && e.delta === 'OpenRouter rescued the request')).toBe(true);
    expect(emitted.some((e) => e.type === 'done')).toBe(true);
  });

  it('cascades to fallback when primary yields empty stream', async () => {
    const emitted: SSEEvent[] = [];
    const mockInvoker = vi
      .fn()
      .mockRejectedValueOnce(new Error('Provider returned empty stream without text or reasoning'))
      .mockImplementationOnce(async (_spec, _messages, _keys, onDelta) => {
        onDelta({ type: 'text', delta: 'Recovered from empty stream' });
      });

    await executeChatWithFailover(
      {
        modelId: 'deepseek-v4.1-flash',
        providerOverride: 'auto',
        messages: [{ role: 'user', content: 'Test' }],
      },
      { opencodeGo: 'op', gemini: 'gem', openrouter: 'or' },
      (evt) => emitted.push(evt),
      mockInvoker
    );

    expect(
      emitted.some(
        (e) =>
          e.type === 'failover' &&
          e.from === 'opencode-go' &&
          e.to === 'openrouter' &&
          /EMPTY_STREAM/i.test(e.reason)
      )
    ).toBe(true);
    expect(emitted.some((e) => e.type === 'text' && e.delta === 'Recovered from empty stream')).toBe(true);
  });
});
