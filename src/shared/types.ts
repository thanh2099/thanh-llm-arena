export type ModelId =
  | 'auto'
  | 'beam-free'
  | 'deepseek-v4.1-flash'
  | 'glm-5.3-flash'
  | 'space-bunny'
  | 'gemini-3.8-flash'
  | 'qwen3.8-flash';

export type ProviderId = 'opencode-go' | 'gemini' | 'openrouter';
export type ProviderOverride = 'auto' | ProviderId;
export type ProtocolFormat = 'openai' | 'anthropic' | 'gemini';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'text';
  dataUrl?: string;
  textContent?: string;
}

export interface FailoverInfo {
  from: ProviderId;
  to: ProviderId;
  reason: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  attachments?: Attachment[];
  modelId?: ModelId;
  resolvedModelName?: string;
  providerUsed?: ProviderId;
  latencyMs?: number;
  failover?: FailoverInfo;
  error?: string;
  createdAt: number;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ApiKeysOverride {
  opencodeGo?: string;
  gemini?: string;
  openrouter?: string;
}

export interface ChatRequestPayload {
  modelId: ModelId;
  providerOverride?: ProviderOverride;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    attachments?: Attachment[];
  }>;
  apiKeys?: ApiKeysOverride;
}

export type SSEEvent =
  | { type: 'meta'; modelId: ModelId; modelName: string; provider: ProviderId; targetModel: string }
  | { type: 'failover'; from: ProviderId; to: ProviderId; reason: string }
  | { type: 'reasoning'; delta: string }
  | { type: 'text'; delta: string }
  | { type: 'done'; latencyMs: number }
  | { type: 'error'; message: string; provider?: ProviderId };
