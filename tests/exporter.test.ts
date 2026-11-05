import { describe, it, expect } from 'vitest';
import {
  buildTurnPlainText,
  buildTurnHtml,
  buildThreadPlainText,
  buildThreadHtml,
} from '../src/client/lib/exporter';
import type { ChatMessage, ChatThread } from '../src/shared/types';

describe('Model Output & Reasoning Exporter', () => {
  const userMsg: ChatMessage = {
    id: 'msg_1_u',
    role: 'user',
    content: 'Explain binary search in TypeScript.',
    createdAt: 1700000000000,
  };

  const assistantMsg: ChatMessage = {
    id: 'msg_1_a',
    role: 'assistant',
    content: 'Here is binary search:\n\n```ts\nfunction bs(arr: number[]) {}\n```',
    reasoning: 'First, consider the sorted array invariant and midpoint calculation.',
    modelId: 'deepseek-v4.1-flash',
    resolvedModelName: 'DeepSeek V4.1 Flash',
    providerUsed: 'opencode-go',
    latencyMs: 842,
    createdAt: 1700000001000,
  };

  const thread: ChatThread = {
    id: 'thr_1',
    title: 'Binary Search Discussion',
    messages: [userMsg, assistantMsg],
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  };

  it('builds structured plain text for a single turn with prompt, thinking trace, and output', () => {
    const txt = buildTurnPlainText(assistantMsg, userMsg, thread.title);
    expect(txt).toContain("THANH'S LLM ARENA — MODEL OUTPUT & REASONING EXPORT");
    expect(txt).toContain('Model    : DeepSeek V4.1 Flash');
    expect(txt).toContain('Provider : OPENCODE-GO');
    expect(txt).toContain('[USER PROMPT]');
    expect(txt).toContain('Explain binary search in TypeScript.');
    expect(txt).toContain('[THINKING TRACE //');
    expect(txt).toContain('First, consider the sorted array invariant');
    expect(txt).toContain('[MODEL OUTPUT // DeepSeek V4.1 Flash]');
    expect(txt).toContain('function bs(arr: number[]) {}');
  });

  it('builds standalone clean HTML layout for a single turn with collapsible reasoning and theme toggle', () => {
    const html = buildTurnHtml(assistantMsg, userMsg, thread.title);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('DeepSeek V4.1 Flash');
    expect(html).toContain('THINKING TRACE // REASONING');
    expect(html).toContain('First, consider the sorted array invariant');
    expect(html).toContain('class="code-block-wrap"');
    expect(html).toContain('id="toggle-theme-btn"');
    expect(html).toContain('id="toggle-thoughts-btn"');
  });

  it('builds full thread plain text and HTML exports', () => {
    const txt = buildThreadPlainText(thread);
    expect(txt).toContain('Binary Search Discussion');
    expect(txt).toContain('[THINKING TRACE //');
    expect(txt).toContain('[FINAL OUTPUT]');

    const html = buildThreadHtml(thread);
    expect(html).toContain('Binary Search Discussion');
    expect(html).toContain('[USER PROMPT]');
    expect(html).toContain('[DeepSeek V4.1 Flash]');
  });
});
