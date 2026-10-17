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
