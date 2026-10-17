// src/client/lib/storage.ts
import type { ApiKeysOverride, ChatThread, ModelId, ProviderOverride } from '../../shared/types';

const THREADS_KEY = 'thanhllm_threads_v1';
const MODEL_KEY = 'thanhllm_model_v1';
const PROVIDER_KEY = 'thanhllm_provider_override_v1';
const KEYS_KEY = 'thanhllm_api_keys_v1';

export function loadThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    return raw ? (JSON.parse(raw) as ChatThread[]) : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: ChatThread[]): void {
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  } catch {
    // Quota guard
  }
}

export function loadSelectedModel(): ModelId {
  return (localStorage.getItem(MODEL_KEY) as ModelId) || 'auto';
}

export function saveSelectedModel(model: ModelId): void {
  localStorage.setItem(MODEL_KEY, model);
}

export function loadProviderOverride(): ProviderOverride {
  return (localStorage.getItem(PROVIDER_KEY) as ProviderOverride) || 'auto';
}

export function saveProviderOverride(provider: ProviderOverride): void {
  localStorage.setItem(PROVIDER_KEY, provider);
}

export function loadApiKeysOverride(): ApiKeysOverride {
  try {
    const raw = localStorage.getItem(KEYS_KEY);
    return raw ? (JSON.parse(raw) as ApiKeysOverride) : {};
  } catch {
    return {};
  }
}

export function saveApiKeysOverride(keys: ApiKeysOverride): void {
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
}
