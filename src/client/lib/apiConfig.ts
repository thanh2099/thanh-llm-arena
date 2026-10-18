/// <reference types="vite/client" />
// src/client/lib/apiConfig.ts

export function getApiBaseUrl(): string {
  const envUrl = (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  // When running on Netlify or any production web host, connect directly to the Render backend
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://thanh-llm-arena.onrender.com';
  }
  // Local development defaults to relative path (handled by Vite dev proxy)
  return '';
}
