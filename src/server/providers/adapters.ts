import type { ApiKeysOverride, Attachment } from '../../shared/types';
import type { ProviderEndpointSpec } from '../config/models';
import {
  parseAnthropicSSEData,
  parseGeminiSSEData,
  parseOpenAISSEData,
  type ParsedDelta,
} from './streamParsers';

export interface InputMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

function buildContentWithTextAttachments(msg: InputMessage): string {
  const textFiles = (msg.attachments ?? []).filter((a) => a.kind === 'text' && a.textContent);
  const baseText =
    textFiles.length === 0
      ? msg.content
      : `${textFiles
          .map((f) => `--- FILE: ${f.name} ---\n${f.textContent}\n--- END FILE ---`)
          .join('\n\n')}\n\n${msg.content}`;

  const hasImages = (msg.attachments ?? []).some((a) => a.kind === 'image' && Boolean(a.dataUrl));
  if (!baseText.trim() && hasImages) {
    return 'Describe and analyze this image.';
  }
  return baseText;
}

interface ParsedImageAttachment {
  mimeType: string;
  base64: string;
  dataUrl: string;
}

function parseImageAttachment(att: Attachment): ParsedImageAttachment | null {
  if (att.kind !== 'image' || !att.dataUrl) return null;
  const trimmed = att.dataUrl.trim();
  const match = trimmed.match(/^data:([^;,]+);base64,(.+)$/s);
  if (match) {
    const mimeType = (match[1] || att.mimeType || 'image/png').trim();
    const base64 = match[2].replace(/\s/g, '');
    if (!base64) return null;
    return {
      mimeType,
      base64,
      dataUrl: `data:${mimeType};base64,${base64}`,
    };
  }
  const commaIdx = trimmed.indexOf(',');
  const rawBase64 = (commaIdx !== -1 ? trimmed.slice(commaIdx + 1) : trimmed).replace(/\s/g, '');
  if (!rawBase64) return null;
  const mimeType = (att.mimeType || 'image/png').trim();
  return {
    mimeType,
    base64: rawBase64,
    dataUrl: `data:${mimeType};base64,${rawBase64}`,
  };
}

export async function invokeProviderStream(
  spec: ProviderEndpointSpec,
  messages: InputMessage[],
  keys: Required<ApiKeysOverride>,
  onDelta: (delta: ParsedDelta) => void,
  signal?: AbortSignal
): Promise<void> {
  if (spec.protocol === 'gemini') {
    const url = `${spec.endpointUrl}?alt=sse&key=${encodeURIComponent(keys.gemini)}`;
    const contents = messages.map((m) => {
      const parts: Array<Record<string, unknown>> = [];
      for (const att of m.attachments ?? []) {
        const parsed = parseImageAttachment(att);
        if (parsed) {
          parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.base64 } });
        }
      }
      parts.push({ text: buildContentWithTextAttachments(m) });
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
    }
    await consumeSSEStream(res, parseGeminiSSEData, onDelta);
    return;
  }

  if (spec.protocol === 'anthropic') {
    const formatted = messages.map((m) => {
      const images = (m.attachments ?? [])
        .map(parseImageAttachment)
        .filter((img): img is ParsedImageAttachment => img !== null);
      const textBody = buildContentWithTextAttachments(m);
      if (images.length > 0 && m.role === 'user') {
        return {
          role: m.role,
          content: [
            ...images.map((img) => ({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mimeType,
                data: img.base64,
              },
            })),
            { type: 'text', text: textBody },
          ],
        };
      }
      return {
        role: m.role,
        content: textBody,
      };
    });
    const res = await fetch(spec.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': keys.opencodeGo,
        'anthropic-version': '2023-06-01',
        'x-opencode-session': 'ses_thanhllm_arena_01',
        'x-opencode-request': `req_${Date.now()}`,
      },
      body: JSON.stringify({
        model: spec.targetModel,
        max_tokens: 8192,
        stream: true,
        messages: formatted,
      }),
      signal,
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
    }
    await consumeSSEStream(res, parseAnthropicSSEData, onDelta);
    return;
  }

  const apiKey = spec.provider === 'opencode-go' ? keys.opencodeGo : keys.openrouter;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (spec.provider === 'opencode-go') {
    headers['x-opencode-session'] = 'ses_thanhllm_arena_01';
    headers['x-opencode-request'] = `req_${Date.now()}`;
  } else {
    headers['HTTP-Referer'] = 'http://localhost:5173';
    headers['X-Title'] = 'ThanhLLM Arena';
  }

  const oaMessages = messages.map((m) => {
    const images = (m.attachments ?? [])
      .map(parseImageAttachment)
      .filter((img): img is ParsedImageAttachment => img !== null);
    const textBody = buildContentWithTextAttachments(m);
    if (images.length > 0 && m.role === 'user') {
      return {
        role: m.role,
        content: [
          ...images.map((img) => ({ type: 'image_url', image_url: { url: img.dataUrl } })),
          { type: 'text', text: textBody },
        ],
      };
    }
    return { role: m.role, content: textBody };
  });

  const res = await fetch(spec.endpointUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: spec.targetModel,
      stream: true,
      messages: oaMessages,
    }),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
  }
  await consumeSSEStream(res, parseOpenAISSEData, onDelta);
}

async function consumeSSEStream(
  res: Response,
  parser: (data: string) => ParsedDelta[],
  onDelta: (delta: ParsedDelta) => void
): Promise<void> {
  if (!res.body) throw new Error('Empty response body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let deltaCount = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const data = line.slice(5).trim();
        for (const item of parser(data)) {
          onDelta(item);
          deltaCount++;
        }
      }
    }
  }

  if (buffer.trim().startsWith('data:')) {
    const data = buffer.trim().slice(5).trim();
    for (const item of parser(data)) {
      onDelta(item);
      deltaCount++;
    }
  }

  if (deltaCount === 0) {
    throw new Error('Provider returned empty stream without text or reasoning');
  }
}
