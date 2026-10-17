import { describe, it, expect } from 'vitest';
import {
  parseOpenAISSEData,
  parseAnthropicSSEData,
  parseGeminiSSEData,
} from '../src/server/providers/streamParsers';

describe('Multi-Protocol Stream Parsers', () => {
  it('parses OpenAI reasoning_content and content deltas', () => {
    const r1 = parseOpenAISSEData(
      JSON.stringify({ choices: [{ delta: { reasoning_content: 'Step 1...' } }] })
    );
    expect(r1).toEqual([{ type: 'reasoning', delta: 'Step 1...' }]);

    const r2 = parseOpenAISSEData(
      JSON.stringify({ choices: [{ delta: { content: 'Hello world' } }] })
    );
    expect(r2).toEqual([{ type: 'text', delta: 'Hello world' }]);
  });

  it('parses Anthropic thinking_delta and text_delta', () => {
    const t1 = parseAnthropicSSEData(
      JSON.stringify({
        type: 'content_block_delta',
        delta: { type: 'thinking_delta', thinking: 'Analyzing prompt...' },
      })
    );
    expect(t1).toEqual([{ type: 'reasoning', delta: 'Analyzing prompt...' }]);

    const t2 = parseAnthropicSSEData(
      JSON.stringify({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Result is 42.' },
      })
    );
    expect(t2).toEqual([{ type: 'text', delta: 'Result is 42.' }]);
  });

  it('parses Gemini thought parts and standard text parts', () => {
    const g1 = parseGeminiSSEData(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                { text: 'Thinking trace', thought: true },
                { text: 'Final answer' },
              ],
            },
          },
        ],
      })
    );
    expect(g1).toEqual([
      { type: 'reasoning', delta: 'Thinking trace' },
      { type: 'text', delta: 'Final answer' },
    ]);
  });
});
