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

export interface FailoverExecutionOptions {
  firstTokenTimeoutMs?: number;
}

const ENDPOINT_COOLDOWN_MS = 60_000;
const endpointCooldownUntil = new Map<string, number>();

function specKey(spec: ProviderEndpointSpec): string {
  return `${spec.provider}:${spec.targetModel}`;
}

function isSpecOnCooldown(spec: ProviderEndpointSpec): boolean {
  const until = endpointCooldownUntil.get(specKey(spec));
  if (!until) return false;
  if (Date.now() > until) {
    endpointCooldownUntil.delete(specKey(spec));
    return false;
  }
  return true;
}

export async function executeChatWithFailover(
  payload: ChatRequestPayload,
  envKeys: Required<ApiKeysOverride>,
  emit: (event: SSEEvent) => void,
  invoker: ProviderInvoker = invokeProviderStream,
  signal?: AbortSignal,
  options?: FailoverExecutionOptions
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

  const rawCandidates = [route.primary, ...route.fallbacks];
  const useCircuitBreaker = invoker === invokeProviderStream;
  const candidates = useCircuitBreaker
    ? [
        ...rawCandidates.filter((s) => !isSpecOnCooldown(s)),
        ...rawCandidates.filter((s) => isSpecOnCooldown(s)),
      ]
    : rawCandidates;
  let lastError = 'All providers failed';

  for (let i = 0; i < candidates.length; i++) {
    if (signal?.aborted) return;
    const spec = candidates[i];
    const hasFallback = i < candidates.length - 1;
    const candidateController = new AbortController();
    let localAbortedDueToTimeout = false;

    const onExternalAbort = () => {
      candidateController.abort();
    };
    signal?.addEventListener('abort', onExternalAbort, { once: true });

    let firstTokenTimer: NodeJS.Timeout | null = null;
    let receivedFirstDelta = false;

    if (hasFallback) {
      const timeoutMs = options?.firstTokenTimeoutMs ?? 3500;
      firstTokenTimer = setTimeout(() => {
        if (!receivedFirstDelta) {
          localAbortedDueToTimeout = true;
          candidateController.abort(new Error(`First token timeout (${(timeoutMs / 1000).toFixed(1)}s)`));
        }
      }, timeoutMs);
    }

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
          if (!receivedFirstDelta) {
            receivedFirstDelta = true;
            if (firstTokenTimer) {
              clearTimeout(firstTokenTimer);
              firstTokenTimer = null;
            }
          }
          emit(delta);
        },
        candidateController.signal
      );

      if (useCircuitBreaker) {
        endpointCooldownUntil.delete(specKey(spec));
      }
      emit({ type: 'done', latencyMs: Date.now() - startTime });
      return;
    } catch (err) {
      if (signal?.aborted && !localAbortedDueToTimeout) return;
      if (useCircuitBreaker) {
        endpointCooldownUntil.set(specKey(spec), Date.now() + ENDPOINT_COOLDOWN_MS);
      }
      const msg = localAbortedDueToTimeout
        ? `First token timeout (${((options?.firstTokenTimeoutMs ?? 3500) / 1000).toFixed(1)}s)`
        : err instanceof Error
        ? err.message
        : String(err);
      lastError = msg;
      const nextSpec = candidates[i + 1];
      if (nextSpec) {
        emit({
          type: 'failover',
          from: spec.provider,
          to: nextSpec.provider,
          reason: formatFailoverReason(msg),
        });
      } else {
        emit({ type: 'error', message: lastError, provider: spec.provider });
      }
    } finally {
      if (firstTokenTimer) {
        clearTimeout(firstTokenTimer);
        firstTokenTimer = null;
      }
      signal?.removeEventListener('abort', onExternalAbort);
    }
  }
}

function formatFailoverReason(rawMsg: string): string {
  const statusMatch = rawMsg.match(/^HTTP\s+(\d{3})/i);
  const status = statusMatch ? statusMatch[1] : '';
  if (/api_key_expired/i.test(rawMsg)) return `${status ? status + ' ' : ''}API_KEY_EXPIRED`;
  if (/high demand|UNAVAILABLE/i.test(rawMsg)) return `${status ? status + ' ' : ''}HIGH_DEMAND`;
  if (/rate.?limit|429/i.test(rawMsg)) return `${status ? status + ' ' : ''}RATE_LIMITED`;
  if (/timeout/i.test(rawMsg)) return 'RESPONSE_TIMEOUT';
  if (/empty stream/i.test(rawMsg)) return 'EMPTY_STREAM';
  const clean = rawMsg.replace(/^HTTP\s+/i, '').replace(/[\r\n{}"]+/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.slice(0, 48);
}

export function createChatRouter(getEnvKeys: () => Required<ApiKeysOverride>): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  router.get('/models', (_req, res) => {
    res.json({ models: MODEL_CATALOG });
  });

  router.get('/providers/status', (req, res) => {
    const adminKey = req.headers['x-admin-passkey'];
    if (adminKey !== 'thanh2099') {
      res.status(401).json({ error: 'Unauthorized: Admin passkey required' });
      return;
    }
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
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Content-Encoding', 'identity');
    res.flushHeaders();

    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        controller.abort();
      }
    });

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
