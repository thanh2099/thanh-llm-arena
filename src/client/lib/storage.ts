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

const HIDE_SETTINGS_KEY = 'thanhllm_hide_settings_btn_v1';
const AUTH_SESSION_KEY = 'thanh_admin_auth_v1';

export function loadHideSettingsButton(): boolean {
  try {
    return localStorage.getItem(HIDE_SETTINGS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveHideSettingsButton(hidden: boolean): void {
  try {
    localStorage.setItem(HIDE_SETTINGS_KEY, hidden ? 'true' : 'false');
  } catch {
    // Quota guard
  }
}

export function isSessionAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSessionAuthenticated(authed: boolean): void {
  try {
    if (authed) {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    }
  } catch {
    // Quota guard
  }
}
