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
      {
        provider: 'opencode-go',
        protocol: 'openai',
        targetModel: 'glm-5.3-flash',
        endpointUrl: 'https://opencode.ai/inference/go/openai/v1/chat/completions',
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
      {
        provider: 'opencode-go',
        protocol: 'openai',
        targetModel: 'glm-5.3-flash',
        endpointUrl: 'https://opencode.ai/inference/go/openai/v1/chat/completions',
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
      targetModel: 'minimax-m3.1-flash-free',
      endpointUrl: 'https://opencode.ai/inference/go/openai/v1/chat/completions',
    },
    fallbacks: [
      {
        provider: 'openrouter',
        protocol: 'openai',
        targetModel: 'deepseek/deepseek-v4.1-flash',
        endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
      },
      {
        provider: 'opencode-go',
        protocol: 'openai',
        targetModel: 'glm-5.3-flash',
        endpointUrl: 'https://opencode.ai/inference/go/openai/v1/chat/completions',
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
      {
        provider: 'opencode-go',
        protocol: 'anthropic',
        targetModel: 'qwen3.8-flash',
        endpointUrl: 'https://opencode.ai/inference/go/anthropic/v1/messages',
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
  if (
    /\b(typescript|react|javascript|python|rust|golang|c\+\+|java|sql|algorithm|function|bug|refactor|landing page|dashboard|game|fullstack|storefront|code|html|css|script|powershell|power shell|bash|shell|terminal|sh|zsh|command|cmd|bat|batch|regex|json|yaml|api|backend|frontend|query|git|docker)\b/.test(
      lower
    )
  ) {
    return 'deepseek-v4.1-flash';
  }
  if (/\b(prove|math|theorem|logic|step by step|analyze|architecture|benchmark)\b/.test(lower)) {
    return 'glm-5.3-flash';
  }
  return 'glm-5.3-flash';
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
