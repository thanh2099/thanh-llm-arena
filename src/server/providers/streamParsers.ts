export type ParsedDelta =
  | { type: 'reasoning'; delta: string }
  | { type: 'text'; delta: string }
  | { type: 'image'; dataUrl: string; alt?: string };

export function parseOpenAISSEData(rawData: string): ParsedDelta[] {
  const trimmed = rawData.trim();
  if (!trimmed || trimmed === '[DONE]') return [];
  try {
    const json = JSON.parse(trimmed);
    const delta = json?.choices?.[0]?.delta;
    if (!delta) return [];
    const out: ParsedDelta[] = [];
    let reasoning = delta.reasoning_content ?? delta.reasoning;
    if ((typeof reasoning !== 'string' || !reasoning) && Array.isArray(delta.reasoning_details)) {
      reasoning = delta.reasoning_details
        .filter((r: { type?: string; text?: string }) => r?.type === 'reasoning.text' && typeof r.text === 'string')
        .map((r: { text: string }) => r.text)
        .join('');
    }
    if (typeof reasoning === 'string' && reasoning.length > 0) {
      out.push({ type: 'reasoning', delta: reasoning });
    }
    if (typeof delta.content === 'string' && delta.content.length > 0) {
      out.push({ type: 'text', delta: delta.content });
    }
    return out;
  } catch {
    return [];
  }
}

export function parseAnthropicSSEData(rawData: string): ParsedDelta[] {
  const trimmed = rawData.trim();
  if (!trimmed) return [];
  try {
    const json = JSON.parse(trimmed);
    if (json?.type !== 'content_block_delta' || !json.delta) return [];
    const out: ParsedDelta[] = [];
    if (json.delta.type === 'thinking_delta' && typeof json.delta.thinking === 'string') {
      out.push({ type: 'reasoning', delta: json.delta.thinking });
    } else if (json.delta.type === 'text_delta' && typeof json.delta.text === 'string') {
      out.push({ type: 'text', delta: json.delta.text });
    }
    return out;
  } catch {
    return [];
  }
}

export function parseGeminiSSEData(rawData: string): ParsedDelta[] {
  const trimmed = rawData.trim();
  if (!trimmed) return [];
  try {
    const json = JSON.parse(trimmed);
    const parts = json?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return [];
    const out: ParsedDelta[] = [];
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.length > 0) {
        if (part.thought === true) {
          out.push({ type: 'reasoning', delta: part.text });
        } else {
          out.push({ type: 'text', delta: part.text });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}
