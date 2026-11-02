import { describe, it, expect, vi } from 'vitest';
import { executeChatWithFailover } from '../src/server/routes/chat';
import { invokeProviderStream } from '../src/server/providers/adapters';
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

  it('serializes base64 image blocks for Anthropic protocol endpoints (e.g. qwen3.8-flash)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
      const sseBody = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Red square"}}\n\n';
      return new Response(sseBody, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    });

    const deltas: Array<{ type: string; delta: string }> = [];
    await invokeProviderStream(
      {
        provider: 'opencode-go',
        protocol: 'anthropic',
        targetModel: 'qwen3.8-flash',
        endpointUrl: 'https://opencode.ai/inference/go/anthropic/v1/messages',
      },
      [
        {
          role: 'user',
          content: '',
          attachments: [
            {
              id: 'att_1',
              name: 'test.png',
              mimeType: 'image/png',
              size: 128,
              kind: 'image',
              dataUrl: 'data:image/png;base64,QUJDRA==',
            },
          ],
        },
      ],
      { opencodeGo: 'key', gemini: 'key', openrouter: 'key' },
      (d) => deltas.push(d)
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    const parsedBody = JSON.parse(String(init?.body ?? '{}'));
    expect(parsedBody.messages[0].content).toEqual([
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: 'QUJDRA==',
        },
      },
      {
        type: 'text',
        text: 'Describe and analyze this image.',
      },
    ]);
    expect(deltas).toEqual([{ type: 'text', delta: 'Red square' }]);
    fetchSpy.mockRestore();
  });
});
