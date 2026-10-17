# Arena.ai + Antigravity Direct Chat Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Arena.ai Direct Chat clone featuring an Antigravity-style multi-row dark composer in the `Technical Broadsheet Dark` aesthetic, connecting to OpenCode Go, Google Gemini, and OpenRouter with smart routing, automatic failover, streaming reasoning traces, and file/image attachments.

**Architecture:** A Vite + React + TypeScript frontend (`src/client/`) paired with a lightweight Express TypeScript SSE API proxy (`src/server/`). The backend normalizes OpenAI-compatible (OpenCode Go, OpenRouter), Anthropic Messages (OpenCode Go Qwen3.8 Flash), and Google Gemini (`v1beta` SSE) streams into a unified SSE protocol (`meta`, `failover`, `reasoning`, `text`, `done`, `error`) and automatically cascades to OpenRouter/Gemini when a primary key is expired or rate-limited.

**Tech Stack:** TypeScript, React 19, Vite, Express 5, Tailwind CSS v4 (or custom CSS token stylesheet), `marked` + `DOMPurify` (or `react-markdown`) for Markdown rendering, `lucide-react` for crisp 1px architectural icons, `vitest` for unit/integration testing, Playwright for E2E verification.

---

## File Structure Map

- `package.json` — Scripts (`dev`, `dev:client`, `dev:server`, `build`, `test`), dependencies, and devDependencies
- `tsconfig.json` — Shared TypeScript configuration for `src/shared`, `src/server`, and `src/client`
- `vite.config.ts` — Vite config with `/api` proxy to `http://localhost:3001` and Vitest config
- `.env` — Local environment variables (`OPENCODE_GO_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `PORT=3001`) (gitignored)
- `.env.example` — Template for environment variables
- `index.html` — HTML shell loading `Instrument Serif`, `Plus Jakarta Sans`, and `JetBrains Mono` from Google Fonts
- `src/shared/types.ts` — Shared TypeScript interfaces (`ModelId`, `ProviderId`, `Attachment`, `ChatMessage`, `ChatThread`, `SSEEvent`, `ProviderStatus`, `StarterPrompt`)
- `src/server/config/models.ts` — Model catalog for `auto`, `beam-free`, `deepseek-v4.1-flash`, `glm-5.3-flash`, `space-bunny`, `gemini-3.8-flash`, `qwen3.8-flash` and `resolveModelRoute()` smart router
- `src/server/providers/streamParsers.ts` — Pure line-by-line SSE chunk parsers for OpenAI, Anthropic, and Gemini stream payloads
- `src/server/providers/adapters.ts` — Provider HTTP stream callers (`streamOpenCodeGo`, `streamGemini`, `streamOpenRouter`)
- `src/server/routes/chat.ts` — Express router handling `GET /api/models`, `GET /api/providers/status`, and `POST /api/chat` with automatic failover
- `src/server/index.ts` — Express server entrypoint listening on port `3001`
- `src/client/styles/theme.css` — `Technical Broadsheet Dark` CSS custom properties, typography rules, hairline borders, and Markdown table/code styling
- `src/client/lib/storage.ts` — `localStorage` persistence for threads, active model, provider override, and runtime API key overrides
- `src/client/lib/sseClient.ts` — `fetch` ReadableStream SSE consumer supporting `AbortSignal` and structured `SSEEvent` callbacks
- `src/client/components/Sidebar.tsx` — Left architectural rail with thread list, inline rename/delete, new chat button, and provider health trigger
- `src/client/components/AntigravityComposer.tsx` — Multi-row dark composer with `+` file/image attachments, `DIRECT` badge, `⚡ Model Selector` + provider override dropdown, and `→` / `■` submit/stop control
- `src/client/components/HeroLanding.tsx` — Centered `"What would you like to do?"` serif hero, centered composer slot, and 6 Arena `"Get started"` cards
- `src/client/components/MessageItem.tsx` — User & assistant message turn with telemetry header, amber failover badge, collapsible `▸ THINKING TRACE` drawer, and Markdown + copyable code blocks
- `src/client/components/SettingsModal.tsx` — Modal to inspect provider status and override OpenCode Go, Gemini, and OpenRouter API keys
- `src/client/App.tsx` — Root workspace layout coordinating active thread, streaming state, sidebar, hero vs active thread view, and settings modal
- `src/client/main.tsx` — React DOM root mount
- `tests/models.test.ts` — Unit tests for `resolveModelRoute` and `auto` intent classification
- `tests/streamParsers.test.ts` — Unit tests for OpenAI, Anthropic, and Gemini SSE chunk parsers
- `tests/failover.test.ts` — Integration test verifying automatic failover when primary provider returns `401 api_key_expired`

---

### Task 1: Project Scaffolding, Environment Config & Shared Types

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `.env.example`
- Create: `.env`
- Create: `src/shared/types.ts`

- [ ] **Step 1: Create `package.json`, `tsconfig.json`, `vite.config.ts`, `.env.example`, and `.env`**

```json
// package.json
{
  "name": "thanh-llm-arena",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently -k \"npm:dev:server\" \"npm:dev:client\"",
    "dev:server": "tsx watch src/server/index.ts",
    "dev:client": "vite --port 5173",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^5.1.0",
    "lucide-react": "^1.16.0",
    "marked": "^15.0.7",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.1",
    "@types/node": "^22.13.10",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react": "^4.3.4",
    "concurrently": "^9.1.2",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2",
    "vite": "^6.2.1",
    "vitest": "^3.0.8"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: Create `src/shared/types.ts`**

```typescript
// src/shared/types.ts
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
```

- [ ] **Step 3: Install dependencies and verify TypeScript compiles**

Run: `npm install && npx tsc --noEmit`
Expected: `0 errors`

- [ ] **Step 4: Commit Task 1**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts .env.example src/shared/types.ts
git commit -m "chore: scaffold project and shared TypeScript types"
```

---

### Task 2: Model Catalog & Smart Router (`src/server/config/models.ts`)

**Files:**
- Create: `tests/models.test.ts`
- Create: `src/server/config/models.ts`

- [ ] **Step 1: Write the failing test in `tests/models.test.ts`**

```typescript
// tests/models.test.ts
import { describe, it, expect } from 'vitest';
import { MODEL_CATALOG, resolveModelRoute } from '../src/server/config/models';

describe('Model Catalog & Smart Router', () => {
  it('lists all 6 target models plus auto', () => {
    const ids = MODEL_CATALOG.map((m) => m.id);
    expect(ids).toEqual([
      'auto',
      'beam-free',
      'deepseek-v4.1-flash',
      'glm-5.3-flash',
      'space-bunny',
      'gemini-3.8-flash',
      'qwen3.8-flash',
    ]);
  });

  it('routes auto to gemini-3.8-flash when image attachment is present', () => {
    const route = resolveModelRoute('auto', 'Describe this screenshot', true, 'auto');
    expect(route.resolvedModelId).toBe('gemini-3.8-flash');
    expect(route.primary.provider).toBe('gemini');
    expect(route.fallbacks[0]?.provider).toBe('openrouter');
  });

  it('routes auto to deepseek-v4.1-flash for coding/algorithm prompts', () => {
    const route = resolveModelRoute('auto', 'Write a TypeScript binary search tree', false, 'auto');
    expect(route.resolvedModelId).toBe('deepseek-v4.1-flash');
    expect(route.primary.provider).toBe('opencode-go');
    expect(route.fallbacks[0]?.provider).toBe('openrouter');
    expect(route.fallbacks[0]?.targetModel).toBe('deepseek/deepseek-v4.1-flash');
  });

  it('respects explicit providerOverride when set to openrouter', () => {
    const route = resolveModelRoute('beam-free', 'Hello', false, 'openrouter');
    expect(route.primary.provider).toBe('openrouter');
    expect(route.primary.targetModel).toBe('reflection/beam-1.0-501b-a23b');
    expect(route.fallbacks).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/models.test.ts`
Expected: FAIL (`Cannot find module '../src/server/config/models'`)

- [ ] **Step 3: Implement `src/server/config/models.ts`**

```typescript
// src/server/config/models.ts
import type { ModelId, ProtocolFormat, ProviderId, ProviderOverride } from '../../shared/types';

export interface ProviderEndpointSpec {
  provider: ProviderId;
  protocol: ProtocolFormat;
  targetModel: string;
  endpointUrl: string;
}

export interface ModelCatalogEntry {
  id: ModelId;
  name: string;
  badge: string;
  description: string;
  supportsVision: boolean;
  supportsReasoning: boolean;
  primary: ProviderEndpointSpec;
  fallbacks: ProviderEndpointSpec[];
}

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    id: 'auto',
    name: 'Auto',
    badge: 'SMART ROUTER',
    description: 'Automatically selects the best model for coding, reasoning, or vision tasks',
    supportsVision: true,
    supportsReasoning: true,
    primary: {
      provider: 'gemini',
      protocol: 'gemini',
      targetModel: 'gemini-3.8-flash',
      endpointUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent',
    },
    fallbacks: [
      {
        provider: 'openrouter',
        protocol: 'openai',
        targetModel: 'google/gemini-3.8-flash',
        endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
      },
    ],
  },
  {
    id: 'beam-free',
    name: 'Beam Free',
    badge: '501B-A23B',
    description: 'Reflection Beam 1.0 501B MoE reasoning and general assistant model',
    supportsVision: false,
    supportsReasoning: true,
    primary: {
      provider: 'opencode-go',
      protocol: 'openai',
      targetModel: 'beam-free',
      endpointUrl: 'https://opencode.ai/inference/go/openai/v1/chat/completions',
    },
    fallbacks: [
      {
        provider: 'openrouter',
        protocol: 'openai',
        targetModel: 'reflection/beam-1.0-501b-a23b',
        endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
      },
    ],
  },
  {
    id: 'deepseek-v4.1-flash',
    name: 'DeepSeek V4.1 Flash',
    badge: 'REASONING',
    description: 'High-speed reasoning and software engineering specialist with 1M context',
    supportsVision: true,
    supportsReasoning: true,
    primary: {
      provider: 'opencode-go',
      protocol: 'openai',
      targetModel: 'deepseek-v4.1-flash',
      endpointUrl: 'https://opencode.ai/inference/go/openai/v1/chat/completions',
    },
    fallbacks: [
      {
        provider: 'openrouter',
        protocol: 'openai',
        targetModel: 'deepseek/deepseek-v4.1-flash',
        endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
      },
    ],
  },
  {
    id: 'glm-5.3-flash',
    name: 'GLM-5.3-Flash',
    badge: 'AGENTIC',
    description: 'Native multimodal GLM model for coding and long-horizon agent tasks',
    supportsVision: true,
    supportsReasoning: true,
    primary: {
      provider: 'opencode-go',
      protocol: 'openai',
      targetModel: 'glm-5.3-flash',
      endpointUrl: 'https://opencode.ai/inference/go/openai/v1/chat/completions',
    },
    fallbacks: [
      {
        provider: 'openrouter',
        protocol: 'openai',
        targetModel: 'z-ai/glm-5.3-flash',
        endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
      },
    ],
  },
  {
    id: 'space-bunny',
    name: 'Space Bunny',
    badge: 'PREVIEW',
    description: 'Anonymous preview reasoning model for coding, agentic tasks, and multimodal input',
    supportsVision: true,
    supportsReasoning: true,
    primary: {
      provider: 'opencode-go',
      protocol: 'openai',
      targetModel: 'space-bunny',
      endpointUrl: 'https://opencode.ai/inference/go/openai/v1/chat/completions',
    },
    fallbacks: [
      {
        provider: 'openrouter',
        protocol: 'openai',
        targetModel: 'deepseek/deepseek-v4.1-flash',
        endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
      },
    ],
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'MULTIMODAL',
    description: "Google's intelligent Flash model for software engineering and multimodal workflows",
    supportsVision: true,
    supportsReasoning: true,
    primary: {
      provider: 'gemini',
      protocol: 'gemini',
      targetModel: 'gemini-3.8-flash',
      endpointUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent',
    },
    fallbacks: [
      {
        provider: 'openrouter',
        protocol: 'openai',
        targetModel: 'google/gemini-3.8-flash',
        endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
      },
    ],
  },
  {
    id: 'qwen3.8-flash',
    name: 'Qwen3.8 Flash',
    badge: 'VISION-LANG',
    description: 'Qwen vision-language model for visual reasoning, documents, and coding',
    supportsVision: true,
    supportsReasoning: true,
    primary: {
      provider: 'opencode-go',
      protocol: 'anthropic',
      targetModel: 'qwen3.8-flash',
      endpointUrl: 'https://opencode.ai/inference/go/anthropic/v1/messages',
    },
    fallbacks: [
      {
        provider: 'openrouter',
        protocol: 'openai',
        targetModel: 'qwen/qwen3.8-flash',
        endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
      },
    ],
  },
];

export interface ResolvedModelRoute {
  resolvedModelId: Exclude<ModelId, 'auto'>;
  resolvedModelName: string;
  primary: ProviderEndpointSpec;
  fallbacks: ProviderEndpointSpec[];
}

export function classifyAutoModel(prompt: string, hasImageAttachment: boolean): Exclude<ModelId, 'auto'> {
  if (hasImageAttachment) return 'gemini-3.8-flash';
  const lower = prompt.toLowerCase();
  if (/\b(typescript|react|python|rust|sql|algorithm|function|bug|refactor|landing page|dashboard|game|fullstack|storefront|code|html|css)\b/.test(lower)) {
    return 'deepseek-v4.1-flash';
  }
  if (/\b(prove|math|theorem|logic|step by step|analyze|architecture)\b/.test(lower)) {
    return 'glm-5.3-flash';
  }
  return 'gemini-3.8-flash';
}

export function resolveModelRoute(
  modelId: ModelId,
  promptText: string,
  hasImageAttachment: boolean,
  providerOverride: ProviderOverride = 'auto'
): ResolvedModelRoute {
  const targetId: Exclude<ModelId, 'auto'> =
    modelId === 'auto' ? classifyAutoModel(promptText, hasImageAttachment) : modelId;

  const entry = MODEL_CATALOG.find((m) => m.id === targetId) ?? MODEL_CATALOG[5];
  const allSpecs = [entry.primary, ...entry.fallbacks];

  if (providerOverride !== 'auto') {
    const matching = allSpecs.find((s) => s.provider === providerOverride);
    if (matching) {
      return {
        resolvedModelId: targetId,
        resolvedModelName: entry.name,
        primary: matching,
        fallbacks: [],
      };
    }
  }

  return {
    resolvedModelId: targetId,
    resolvedModelName: entry.name,
    primary: entry.primary,
    fallbacks: entry.fallbacks,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/models.test.ts`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit Task 2**

```bash
git add src/server/config/models.ts tests/models.test.ts
git commit -m "feat(router): add model catalog and smart routing with provider override"
```

---

### Task 3: Multi-Protocol SSE Stream Parsers (`src/server/providers/streamParsers.ts`)

**Files:**
- Create: `tests/streamParsers.test.ts`
- Create: `src/server/providers/streamParsers.ts`

- [ ] **Step 1: Write the failing test in `tests/streamParsers.test.ts`**

```typescript
// tests/streamParsers.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/streamParsers.test.ts`
Expected: FAIL (`Cannot find module '../src/server/providers/streamParsers'`)

- [ ] **Step 3: Implement `src/server/providers/streamParsers.ts`**

```typescript
// src/server/providers/streamParsers.ts
export type ParsedDelta =
  | { type: 'reasoning'; delta: string }
  | { type: 'text'; delta: string };

export function parseOpenAISSEData(rawData: string): ParsedDelta[] {
  const trimmed = rawData.trim();
  if (!trimmed || trimmed === '[DONE]') return [];
  try {
    const json = JSON.parse(trimmed);
    const delta = json?.choices?.[0]?.delta;
    if (!delta) return [];
    const out: ParsedDelta[] = [];
    const reasoning = delta.reasoning_content ?? delta.reasoning;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/streamParsers.test.ts`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit Task 3**

```bash
git add src/server/providers/streamParsers.ts tests/streamParsers.test.ts
git commit -m "feat(parsers): add OpenAI, Anthropic, and Gemini SSE stream parsers"
```

---

### Task 4: Provider Adapters, Automatic Failover Orchestrator & Express Server

**Files:**
- Create: `src/server/providers/adapters.ts`
- Create: `src/server/routes/chat.ts`
- Create: `src/server/index.ts`
- Create: `tests/failover.test.ts`

- [ ] **Step 1: Write the failing test in `tests/failover.test.ts`**

```typescript
// tests/failover.test.ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/failover.test.ts`
Expected: FAIL (`Cannot find module '../src/server/routes/chat'`)

- [ ] **Step 3: Implement `src/server/providers/adapters.ts`, `src/server/routes/chat.ts`, and `src/server/index.ts`**

```typescript
// src/server/providers/adapters.ts
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
  if (textFiles.length === 0) return msg.content;
  const blocks = textFiles
    .map((f) => `--- FILE: ${f.name} ---\n${f.textContent}\n--- END FILE ---`)
    .join('\n\n');
  return `${blocks}\n\n${msg.content}`;
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
        if (att.kind === 'image' && att.dataUrl) {
          const base64 = att.dataUrl.split(',')[1] ?? '';
          parts.push({ inlineData: { mimeType: att.mimeType, data: base64 } });
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
    const formatted = messages.map((m) => ({
      role: m.role,
      content: buildContentWithTextAttachments(m),
    }));
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

  // OpenAI-compatible (OpenCode Go or OpenRouter)
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
    const images = (m.attachments ?? []).filter((a) => a.kind === 'image' && a.dataUrl);
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
        }
      }
    }
  }
}
```

- [ ] **Step 4: Run all server tests to verify they pass**

Run: `npx vitest run`
Expected: PASS (`models.test.ts`, `streamParsers.test.ts`, `failover.test.ts` all pass)

- [ ] **Step 5: Commit Task 4**

```bash
git add src/server/providers/adapters.ts src/server/routes/chat.ts src/server/index.ts tests/failover.test.ts
git commit -m "feat(server): add provider stream adapters and automatic failover SSE endpoint"
```

```typescript
// src/server/routes/chat.ts
import { Router } from 'express';
import type { ApiKeysOverride, ChatRequestPayload, SSEEvent } from '../../shared/types';
import { MODEL_CATALOG, resolveModelRoute, type ProviderEndpointSpec } from '../config/models';
import { invokeProviderStream, type InputMessage } from '../providers/adapters';
import type { ParsedDelta } from '../providers/streamParsers';

export type ProviderInvoker = (
  spec: ProviderEndpointSpec,
  messages: InputMessage[],
  keys: Required<ApiKeysOverride>,
  onDelta: (delta: ParsedDelta) => void,
  signal?: AbortSignal
) => Promise<void>;

export async function executeChatWithFailover(
  payload: ChatRequestPayload,
  envKeys: Required<ApiKeysOverride>,
  emit: (event: SSEEvent) => void,
  invoker: ProviderInvoker = invokeProviderStream,
  signal?: AbortSignal
): Promise<void> {
  const startTime = Date.now();
  const lastMsg = payload.messages[payload.messages.length - 1];
  const hasImages = (lastMsg?.attachments ?? []).some((a) => a.kind === 'image');
  const route = resolveModelRoute(
    payload.modelId,
    lastMsg?.content ?? '',
    hasImages,
    payload.providerOverride ?? 'auto'
  );

  const keys: Required<ApiKeysOverride> = {
    opencodeGo: payload.apiKeys?.opencodeGo?.trim() || envKeys.opencodeGo,
    gemini: payload.apiKeys?.gemini?.trim() || envKeys.gemini,
    openrouter: payload.apiKeys?.openrouter?.trim() || envKeys.openrouter,
  };

  const candidates = [route.primary, ...route.fallbacks];
  let lastError = 'All providers failed';

  for (let i = 0; i < candidates.length; i++) {
    const spec = candidates[i];
    try {
      emit({
        type: 'meta',
        modelId: route.resolvedModelId,
        modelName: route.resolvedModelName,
        provider: spec.provider,
        targetModel: spec.targetModel,
      });

      await invoker(
        spec,
        payload.messages,
        keys,
        (delta) => {
          emit(delta);
        },
        signal
      );

      emit({ type: 'done', latencyMs: Date.now() - startTime });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = msg;
      const nextSpec = candidates[i + 1];
      if (nextSpec) {
        emit({
          type: 'failover',
          from: spec.provider,
          to: nextSpec.provider,
          reason: msg.replace(/^HTTP\s+/i, '').slice(0, 90),
        });
      } else {
        emit({ type: 'error', message: lastError, provider: spec.provider });
      }
    }
  }
}

export function createChatRouter(getEnvKeys: () => Required<ApiKeysOverride>): Router {
  const router = Router();

  router.get('/models', (_req, res) => {
    res.json({ models: MODEL_CATALOG });
  });

  router.get('/providers/status', (_req, res) => {
    const keys = getEnvKeys();
    res.json({
      providers: {
        'opencode-go': { configured: Boolean(keys.opencodeGo) },
        gemini: { configured: Boolean(keys.gemini) },
        openrouter: { configured: Boolean(keys.openrouter) },
      },
    });
  });

  router.post('/chat', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    const emit = (evt: SSEEvent) => {
      res.write(`data: ${JSON.stringify(evt)}\n\n`);
    };

    try {
      await executeChatWithFailover(
        req.body as ChatRequestPayload,
        getEnvKeys(),
        emit,
        invokeProviderStream,
        controller.signal
      );
    } catch (err) {
      emit({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unexpected server error',
      });
    } finally {
      res.end();
    }
  });

  return router;
}
```

```typescript
// src/server/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createChatRouter } from './routes/chat';

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.use(
  '/api',
  createChatRouter(() => ({
    opencodeGo: process.env.OPENCODE_GO_API_KEY ?? '',
    gemini: process.env.GEMINI_API_KEY ?? '',
    openrouter: process.env.OPENROUTER_API_KEY ?? '',
  }))
);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`[ThanhLLM Proxy] Listening on http://localhost:${port}`);
});
```

---

### Task 5: `Technical Broadsheet Dark` Design System, Storage & SSE Client

**Files:**
- Create: `index.html`
- Create: `src/client/styles/theme.css`
- Create: `src/client/lib/storage.ts`
- Create: `src/client/lib/sseClient.ts`

- [ ] **Step 1: Create `index.html` with `Instrument Serif`, `Plus Jakarta Sans`, and `JetBrains Mono` fonts**

```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ARENA // ANTIGRAVITY DIRECT</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `src/client/styles/theme.css` with `Technical Broadsheet Dark` tokens and architectural rules**

```css
/* src/client/styles/theme.css */
:root {
  --bg-canvas: #09090b;
  --bg-surface: #121215;
  --bg-elevated: #18181c;
  --border-subtle: #27272a;
  --border-strong: #52525b;
  --border-focus: #e4e4e7;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --signal-ok: #10b981;
  --signal-warn: #f59e0b;
  --signal-danger: #ef4444;
  --font-serif: 'Instrument Serif', Georgia, serif;
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#root {
  height: 100%;
  background: var(--bg-canvas);
  color: var(--text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: Create `src/client/lib/storage.ts` and `src/client/lib/sseClient.ts`**

```typescript
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
```

```typescript
// src/client/lib/sseClient.ts
import type { ChatRequestPayload, SSEEvent } from '../../shared/types';

export async function streamChatCompletion(
  payload: ChatRequestPayload,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}: Failed to connect to chat stream`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const raw = line.slice(5).trim();
        if (!raw) continue;
        try {
          onEvent(JSON.parse(raw) as SSEEvent);
        } catch {
          // Ignore malformed line
        }
      }
    }
  }
}
```

- [ ] **Step 4: Commit Task 5**

```bash
git add index.html src/client/styles/theme.css src/client/lib/storage.ts src/client/lib/sseClient.ts
git commit -m "feat(client): add Technical Broadsheet Dark theme, storage, and SSE client"
```

---

### Task 6: Antigravity Multi-Row Dark Composer & Arena Hero Landing (`src/client/components/AntigravityComposer.tsx`, `src/client/components/HeroLanding.tsx`)

**Files:**
- Create: `src/client/components/AntigravityComposer.tsx`
- Create: `src/client/components/HeroLanding.tsx`

- [ ] **Step 1: Create `src/client/components/AntigravityComposer.tsx` with `+` attachments, `DIRECT` pill, `⚡ Model Selector` + provider override dropdown, and `→` / `■` submit/stop control**

```tsx
// src/client/components/AntigravityComposer.tsx
import React, { useRef, useState } from 'react';
import type { Attachment, ModelId, ProviderOverride } from '../../shared/types';
import { MODEL_CATALOG } from '../../server/config/models';

export interface AntigravityComposerProps {
  value: string;
  onChange: (val: string) => void;
  attachments: Attachment[];
  onAttachmentsChange: (atts: Attachment[]) => void;
  selectedModel: ModelId;
  onSelectModel: (m: ModelId) => void;
  providerOverride: ProviderOverride;
  onSelectProviderOverride: (p: ProviderOverride) => void;
  isStreaming: boolean;
  onSubmit: () => void;
  onStop: () => void;
}

export const AntigravityComposer: React.FC<AntigravityComposerProps> = ({
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  selectedModel,
  onSelectModel,
  providerOverride,
  onSelectProviderOverride,
  isStreaming,
  onSubmit,
  onStop,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const currentModel = MODEL_CATALOG.find((m) => m.id === selectedModel) ?? MODEL_CATALOG[0];

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const next: Attachment[] = [...attachments];
    for (const file of Array.from(fileList)) {
      if (file.size > 10 * 1024 * 1024) continue;
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ''));
          reader.readAsDataURL(file);
        });
        next.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          kind: 'image',
          dataUrl,
        });
      } else {
        const textContent = await file.text();
        next.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          mimeType: file.type || 'text/plain',
          size: file.size,
          kind: 'text',
          textContent,
        });
      }
    }
    onAttachmentsChange(next);
  };

  return (
    <div className="ag-composer">
      {attachments.length > 0 && (
        <div className="ag-attachments">
          {attachments.map((att) => (
            <div key={att.id} className="ag-attachment-chip">
              {att.kind === 'image' && att.dataUrl ? (
                <img src={att.dataUrl} alt={att.name} className="ag-attachment-thumb" />
              ) : (
                <span className="ag-attachment-ext">FILE</span>
              )}
              <span className="ag-attachment-name">{att.name}</span>
              <button
                type="button"
                className="ag-attachment-remove"
                onClick={() => onAttachmentsChange(attachments.filter((a) => a.id !== att.id))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        className="ag-textarea"
        placeholder="Ask anything..."
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isStreaming && (value.trim() || attachments.length > 0)) {
              onSubmit();
            }
          }
        }}
      />

      <div className="ag-toolbar">
        <div className="ag-toolbar-left">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.txt,.md,.json,.ts,.tsx,.js,.py,.html,.css,.csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            className="ag-pill-btn"
            title="Attach image or code/text file"
            onClick={() => fileInputRef.current?.click()}
          >
            +
          </button>

          <span className="ag-mode-pill" title="Direct Chat Mode">
            ⚔ DIRECT
          </span>

          <div className="ag-model-dropdown-wrap">
            <button
              type="button"
              className="ag-model-pill"
              onClick={() => setModelMenuOpen((v) => !v)}
            >
              <span>⚡ {currentModel.name}</span>
              <span className="ag-provider-tag">
                [{providerOverride === 'auto' ? currentModel.primary.provider.toUpperCase() : providerOverride.toUpperCase()}]
              </span>
              <span>▾</span>
            </button>

            {modelMenuOpen && (
              <div className="ag-dropdown-menu">
                <div className="ag-dropdown-section-label">SELECT MODEL</div>
                {MODEL_CATALOG.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`ag-dropdown-item ${m.id === selectedModel ? 'active' : ''}`}
                    onClick={() => {
                      onSelectModel(m.id);
                      setModelMenuOpen(false);
                    }}
                  >
                    <div>
                      <div className="ag-dropdown-title">{m.name}</div>
                      <div className="ag-dropdown-desc">{m.description}</div>
                    </div>
                    <span className="ag-dropdown-badge">{m.badge}</span>
                  </button>
                ))}
                <div className="ag-dropdown-section-label" style={{ marginTop: 8 }}>
                  PROVIDER ROUTING MODE
                </div>
                <div className="ag-provider-override-row">
                  {(['auto', 'opencode-go', 'gemini', 'openrouter'] as ProviderOverride[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`ag-override-chip ${providerOverride === p ? 'active' : ''}`}
                      onClick={() => onSelectProviderOverride(p)}
                    >
                      {p === 'auto' ? 'SMART FALLBACK' : p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ag-toolbar-right">
          {isStreaming ? (
            <button type="button" className="ag-stop-btn" onClick={onStop} title="Stop generation">
              ■ STOP
            </button>
          ) : (
            <button
              type="button"
              className="ag-send-btn"
              disabled={!value.trim() && attachments.length === 0}
              onClick={onSubmit}
              title="Send message"
            >
              →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create `src/client/components/HeroLanding.tsx` with the 6 Arena starter cards**

```tsx
// src/client/components/HeroLanding.tsx
import React from 'react';

export interface StarterCard {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  code: string;
}

export const STARTER_CARDS: StarterCard[] = [
  {
    id: 'landing-page',
    title: 'Create a landing page',
    subtitle: 'Create a sleek, modern landing page',
    code: 'PROMPT_01',
    prompt: 'Create a sleek, high-contrast dark mode SaaS landing page for an AI developer platform with HTML and CSS.',
  },
  {
    id: 'dashboard',
    title: 'Build a dashboard',
    subtitle: 'Turn data into interactive charts',
    code: 'PROMPT_02',
    prompt: 'Build a financial & telemetry analytics dashboard layout with tabular metrics, KPI cards, and SVG sparklines.',
  },
  {
    id: 'game',
    title: 'Make a game',
    subtitle: 'Build a playable browser game',
    code: 'PROMPT_03',
    prompt: 'Build a complete playable retro arcade space shooter game in a single HTML5 Canvas file.',
  },
  {
    id: 'design-to-code',
    title: 'Design to Code',
    subtitle: 'Upload an image and have AI build it',
    code: 'PROMPT_04',
    prompt: 'Convert a UI wireframe or screenshot into clean, accessible React + CSS components.',
  },
  {
    id: 'fullstack',
    title: 'Build a fullstack app',
    subtitle: 'Create a templated full-stack app',
    code: 'PROMPT_05',
    prompt: 'Architect a full-stack TypeScript task runner with an Express REST API and React frontend.',
  },
  {
    id: 'storefront',
    title: 'Launch a storefront',
    subtitle: 'Create a beautiful online shop',
    code: 'PROMPT_06',
    prompt: 'Design a minimalist editorial hardware storefront with product grid, technical spec drawer, and cart.',
  },
];

export interface HeroLandingProps {
  composerSlot: React.ReactNode;
  onSelectStarter: (prompt: string) => void;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({ composerSlot, onSelectStarter }) => {
  return (
    <div className="arena-hero-container">
      <div className="arena-hero-inner">
        <h1 className="arena-hero-title">What would you like to do?</h1>
        {composerSlot}
        <div className="arena-starter-section">
          <div className="arena-starter-heading">Get started</div>
          <div className="arena-starter-grid">
            {STARTER_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                className="arena-starter-card"
                onClick={() => onSelectStarter(card.prompt)}
              >
                <div className="arena-starter-icon">{card.code.slice(-2)}</div>
                <div className="arena-starter-text">
                  <div className="arena-starter-card-title">{card.title}</div>
                  <div className="arena-starter-card-sub">{card.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Commit Task 6**

```bash
git add src/client/components/AntigravityComposer.tsx src/client/components/HeroLanding.tsx
git commit -m "feat(ui): add AntigravityComposer and Arena HeroLanding starter grid"
```

---

### Task 7: Message Thread, Collapsible Reasoning Trace, Sidebar, Settings Modal & App Shell

**Files:**
- Create: `src/client/components/MessageItem.tsx`
- Create: `src/client/components/Sidebar.tsx`
- Create: `src/client/components/SettingsModal.tsx`
- Create: `src/client/App.tsx`
- Create: `src/client/main.tsx`

- [ ] **Step 1: Create `src/client/components/MessageItem.tsx` with collapsible `▸ THINKING TRACE`, failover badge, and Markdown + code copy**

```tsx
// src/client/components/MessageItem.tsx
import React, { useState } from 'react';
import { marked } from 'marked';
import type { ChatMessage } from '../../shared/types';

export interface MessageItemProps {
  message: ChatMessage;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onRetry, onOpenSettings }) => {
  const [reasoningOpen, setReasoningOpen] = useState(true);

  if (message.role === 'user') {
    return (
      <div className="turn-row turn-user">
        <div className="turn-meta">
          <span className="turn-role-badge">[USER]</span>
        </div>
        {message.attachments && message.attachments.length > 0 && (
          <div className="turn-attachments">
            {message.attachments.map((att) =>
              att.kind === 'image' && att.dataUrl ? (
                <img key={att.id} src={att.dataUrl} alt={att.name} className="turn-image-preview" />
              ) : (
                <span key={att.id} className="ag-attachment-chip">
                  [FILE: {att.name}]
                </span>
              )
            )}
          </div>
        )}
        <div className="turn-user-body">{message.content}</div>
      </div>
    );
  }

  const html = marked.parse(message.content || '', { async: false }) as string;

  return (
    <div className="turn-row turn-assistant">
      <div className="turn-meta">
        <span className="turn-model-badge">[{message.resolvedModelName || message.modelId || 'MODEL'}]</span>
        {message.providerUsed && (
          <span className="turn-provider-badge">[{message.providerUsed.toUpperCase()}]</span>
        )}
        {typeof message.latencyMs === 'number' && (
          <span className="turn-latency-badge">{message.latencyMs}ms</span>
        )}
        {message.failover && (
          <span className="turn-failover-badge">
            [REROUTED: {message.failover.from.toUpperCase()} → {message.failover.to.toUpperCase()} ({message.failover.reason})]
            {onOpenSettings && (
              <button type="button" className="turn-inline-link" onClick={onOpenSettings}>
                [KEYS]
              </button>
            )}
          </span>
        )}
      </div>

      {message.reasoning && (
        <div className="reasoning-block">
          <button
            type="button"
            className="reasoning-header"
            onClick={() => setReasoningOpen((v) => !v)}
          >
            <span>{reasoningOpen ? '▾' : '▸'} THINKING TRACE</span>
            <span className="reasoning-chars">{message.reasoning.length} chars</span>
          </button>
          {reasoningOpen && <pre className="reasoning-body">{message.reasoning}</pre>}
        </div>
      )}

      {message.error ? (
        <div className="turn-error-box">
          <div className="turn-error-title">[STREAM ERROR] {message.error}</div>
          <div className="turn-error-actions">
            {onRetry && (
              <button type="button" className="ag-override-chip" onClick={onRetry}>
                [RETRY]
              </button>
            )}
            {onOpenSettings && (
              <button type="button" className="ag-override-chip" onClick={onOpenSettings}>
                [CONFIGURE KEYS]
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          className="turn-markdown-prose"
          dangerouslySetInnerHTML={{ __html: html || '<span class="streaming-cursor">▋</span>' }}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create `src/client/components/Sidebar.tsx` and `src/client/components/SettingsModal.tsx`**

```tsx
// src/client/components/Sidebar.tsx
import React, { useState } from 'react';
import type { ChatThread } from '../../shared/types';

export interface SidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onNewThread: () => void;
  onSelectThread: (id: string) => void;
  onRenameThread: (id: string, title: string) => void;
  onDeleteThread: (id: string) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  threads,
  activeThreadId,
  isOpen,
  onToggle,
  onNewThread,
  onSelectThread,
  onRenameThread,
  onDeleteThread,
  onOpenSettings,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!isOpen) {
    return (
      <div className="sidebar-collapsed">
        <button type="button" className="ag-pill-btn" onClick={onToggle} title="Expand sidebar">
          ☰
        </button>
        <button type="button" className="ag-pill-btn" onClick={onNewThread} title="New thread">
          +
        </button>
      </div>
    );
  }

  return (
    <aside className="sidebar-rail">
      <div className="sidebar-header">
        <span className="sidebar-brand">ARENA // DIRECT</span>
        <button type="button" className="ag-pill-btn" onClick={onToggle} title="Collapse sidebar">
          «
        </button>
      </div>

      <button type="button" className="sidebar-new-btn" onClick={onNewThread}>
        + NEW THREAD
      </button>

      <div className="sidebar-thread-list">
        {threads.length === 0 ? (
          <div className="sidebar-empty">NO SAVED THREADS YET</div>
        ) : (
          threads.map((t) => (
            <div
              key={t.id}
              className={`sidebar-thread-item ${t.id === activeThreadId ? 'active' : ''}`}
            >
              {editingId === t.id ? (
                <input
                  className="sidebar-rename-input"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    if (editValue.trim()) onRenameThread(t.id, editValue.trim());
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editValue.trim()) onRenameThread(t.id, editValue.trim());
                      setEditingId(null);
                    }
                  }}
                />
              ) : (
                <>
                  <button
                    type="button"
                    className="sidebar-thread-title"
                    onClick={() => onSelectThread(t.id)}
                  >
                    {t.title}
                  </button>
                  <div className="sidebar-thread-actions">
                    <button
                      type="button"
                      className="sidebar-icon-btn"
                      onClick={() => {
                        setEditingId(t.id);
                        setEditValue(t.title);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="sidebar-icon-btn"
                      onClick={() => onDeleteThread(t.id)}
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-settings-btn" onClick={onOpenSettings}>
          <span>● API KEYS &amp; PROVIDERS</span>
          <span>⚙</span>
        </button>
      </div>
    </aside>
  );
};
```

```tsx
// src/client/components/SettingsModal.tsx
import React, { useState } from 'react';
import type { ApiKeysOverride } from '../../shared/types';

export interface SettingsModalProps {
  isOpen: boolean;
  keys: ApiKeysOverride;
  onSave: (keys: ApiKeysOverride) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, keys, onSave, onClose }) => {
  const [draft, setDraft] = useState<ApiKeysOverride>(keys);
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>[PROVIDER KEYS &amp; ROUTING CONFIGURATION]</span>
          <button type="button" className="ag-pill-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-hint">
            Server `.env` keys are active by default. Enter a key below only if you want to override it in the browser.
          </p>
          <label className="modal-field">
            <span>OPENCODE GO API KEY (`opencode.ai/inference/go`)</span>
            <input
              type="password"
              placeholder="sk-..."
              value={draft.opencodeGo ?? ''}
              onChange={(e) => setDraft({ ...draft, opencodeGo: e.target.value })}
            />
          </label>
          <label className="modal-field">
            <span>GOOGLE GEMINI API KEY (`generativelanguage.googleapis.com`)</span>
            <input
              type="password"
              placeholder="AQ.Ab8... or AIza..."
              value={draft.gemini ?? ''}
              onChange={(e) => setDraft({ ...draft, gemini: e.target.value })}
            />
          </label>
          <label className="modal-field">
            <span>OPENROUTER API KEY (`openrouter.ai/api/v1`)</span>
            <input
              type="password"
              placeholder="sk-or-v1-..."
              value={draft.openrouter ?? ''}
              onChange={(e) => setDraft({ ...draft, openrouter: e.target.value })}
            />
          </label>
        </div>
        <div className="modal-footer">
          <button type="button" className="ag-override-chip" onClick={onClose}>
            [CANCEL]
          </button>
          <button
            type="button"
            className="ag-send-btn"
            style={{ width: 'auto', padding: '6px 14px' }}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            [SAVE OVERRIDES]
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Create `src/client/App.tsx` and `src/client/main.tsx`**

```tsx
// src/client/App.tsx
import React, { useEffect, useRef, useState } from 'react';
import type {
  ApiKeysOverride,
  Attachment,
  ChatMessage,
  ChatThread,
  ModelId,
  ProviderOverride,
} from '../shared/types';
import {
  loadApiKeysOverride,
  loadProviderOverride,
  loadSelectedModel,
  loadThreads,
  saveApiKeysOverride,
  saveProviderOverride,
  saveSelectedModel,
  saveThreads,
} from './lib/storage';
import { streamChatCompletion } from './lib/sseClient';
import { Sidebar } from './components/Sidebar';
import { HeroLanding } from './components/HeroLanding';
import { AntigravityComposer } from './components/AntigravityComposer';
import { MessageItem } from './components/MessageItem';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [threads, setThreads] = useState<ChatThread[]>(() => loadThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => loadThreads()[0]?.id ?? null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => loadSelectedModel());
  const [providerOverride, setProviderOverride] = useState<ProviderOverride>(() => loadProviderOverride());
  const [apiKeys, setApiKeys] = useState<ApiKeysOverride>(() => loadApiKeysOverride());
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const sendPrompt = async (promptText: string, attached: Attachment[]) => {
    const trimmed = promptText.trim();
    if (!trimmed && attached.length === 0) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: trimmed,
      attachments: attached.length > 0 ? attached : undefined,
      createdAt: Date.now(),
    };

    const assistantMsgId = `msg_${Date.now()}_a`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      reasoning: '',
      modelId: selectedModel,
      createdAt: Date.now(),
    };

    let targetThreadId = activeThreadId;
    let historyMessages: ChatMessage[] = [];

    if (!targetThreadId || !activeThread) {
      targetThreadId = `thr_${Date.now()}`;
      const newThread: ChatThread = {
        id: targetThreadId,
        title: (trimmed || 'Attachment prompt').slice(0, 42),
        messages: [userMsg, assistantMsg],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      historyMessages = [userMsg];
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(targetThreadId);
    } else {
      historyMessages = [...activeThread.messages, userMsg];
      setThreads((prev) =>
        prev.map((t) =>
          t.id === targetThreadId
            ? { ...t, messages: [...t.messages, userMsg, assistantMsg], updatedAt: Date.now() }
            : t
        )
      );
    }

    setInput('');
    setAttachments([]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChatCompletion(
        {
          modelId: selectedModel,
          providerOverride,
          messages: historyMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          apiKeys,
        },
        (evt) => {
          setThreads((prev) =>
            prev.map((t) => {
              if (t.id !== targetThreadId) return t;
              return {
                ...t,
                messages: t.messages.map((m) => {
                  if (m.id !== assistantMsgId) return m;
                  if (evt.type === 'meta') {
                    return {
                      ...m,
                      resolvedModelName: evt.modelName,
                      providerUsed: evt.provider,
                    };
                  }
                  if (evt.type === 'failover') {
                    return {
                      ...m,
                      failover: { from: evt.from, to: evt.to, reason: evt.reason },
                    };
                  }
                  if (evt.type === 'reasoning') {
                    return { ...m, reasoning: (m.reasoning ?? '') + evt.delta };
                  }
                  if (evt.type === 'text') {
                    return { ...m, content: m.content + evt.delta };
                  }
                  if (evt.type === 'done') {
                    return { ...m, latencyMs: evt.latencyMs };
                  }
                  if (evt.type === 'error') {
                    return { ...m, error: evt.message };
                  }
                  return m;
                }),
              };
            })
          );
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        const errMsg = err instanceof Error ? err.message : String(err);
        setThreads((prev) =>
          prev.map((t) =>
            t.id === targetThreadId
              ? {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, error: errMsg } : m
                  ),
                }
              : t
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const composerElement = (
    <AntigravityComposer
      value={input}
      onChange={setInput}
      attachments={attachments}
      onAttachmentsChange={setAttachments}
      selectedModel={selectedModel}
      onSelectModel={(m) => {
        setSelectedModel(m);
        saveSelectedModel(m);
      }}
      providerOverride={providerOverride}
      onSelectProviderOverride={(p) => {
        setProviderOverride(p);
        saveProviderOverride(p);
      }}
      isStreaming={isStreaming}
      onSubmit={() => sendPrompt(input, attachments)}
      onStop={() => abortRef.current?.abort()}
    />
  );

  return (
    <div className="app-shell">
      <Sidebar
        threads={threads}
        activeThreadId={activeThreadId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onNewThread={() => setActiveThreadId(null)}
        onSelectThread={(id) => setActiveThreadId(id)}
        onRenameThread={(id, title) =>
          setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)))
        }
        onDeleteThread={(id) => {
          setThreads((prev) => prev.filter((t) => t.id !== id));
          if (activeThreadId === id) setActiveThreadId(null);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="workspace-main">
        {!activeThread || activeThread.messages.length === 0 ? (
          <HeroLanding
            composerSlot={composerElement}
            onSelectStarter={(prompt) => sendPrompt(prompt, [])}
          />
        ) : (
          <div className="active-thread-layout">
            <div className="thread-scroll-region">
              {activeThread.messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              ))}
            </div>
            <div className="docked-composer-bar">{composerElement}</div>
          </div>
        )}
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        keys={apiKeys}
        onSave={(nextKeys) => {
          setApiKeys(nextKeys);
          saveApiKeysOverride(nextKeys);
        }}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
```

```tsx
// src/client/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/theme.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
```

- [ ] **Step 4: Build & run unit tests**

Run: `npm test && npm run build`
Expected: All Vitest suites pass and Vite production bundle builds with `0 errors`.

- [ ] **Step 5: Commit Task 7**

```bash
git add src/client/
git commit -m "feat(app): complete Arena Direct Chat workspace, reasoning trace, sidebar, and settings"
```

---

### Task 8: Live End-to-End Verification

**Files:**
- Modify: `src/client/styles/theme.css` (if any visual polish adjustments needed)

- [ ] **Step 1: Start the dev server (`npm run dev`) and verify `/api/models` and `/api/providers/status`**

Run: `curl http://localhost:3001/api/models`
Expected: JSON listing `auto`, `beam-free`, `deepseek-v4.1-flash`, `glm-5.3-flash`, `space-bunny`, `gemini-3.8-flash`, `qwen3.8-flash`.

- [ ] **Step 2: Verify live streaming and automatic failover across models**

Test `POST http://localhost:3001/api/chat` with `deepseek-v4.1-flash` (verifying OpenCode Go $\rightarrow$ OpenRouter failover event + streamed tokens) and `gemini-3.8-flash` (verifying direct Google Gemini v1beta stream).

- [ ] **Step 3: Verify UI rendering in headless browser**

Confirm `Technical Broadsheet Dark` palette (`#09090b`), `Instrument Serif` *"What would you like to do?"* heading, Antigravity composer pills, starter cards, and live chat turn rendering.
