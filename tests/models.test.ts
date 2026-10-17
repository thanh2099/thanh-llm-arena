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
