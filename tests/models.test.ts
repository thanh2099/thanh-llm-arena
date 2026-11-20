import { describe, it, expect } from 'vitest';
import { MODEL_CATALOG, resolveModelRoute } from '../src/server/config/models';

describe('Model Catalog & Smart Router', () => {
  it('lists all target models plus auto', () => {
    const ids = MODEL_CATALOG.map((m) => m.id);
    expect(ids).toEqual([
      'auto',
      'beam-free',
      'deepseek-v4.1-flash',
      'glm-5.3-flash',
      'space-bunny',
      'gemini-3.8-flash',
      'qwen3.8-flash',
      'gemini-4-hydrogen',
      'kimi-k3',
      'gemini-image',
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

  it('routes auto to deepseek-v4.1-flash for powershell and script prompts', () => {
    const route = resolveModelRoute(
      'auto',
      'write me a simple power shell script that renames all files in a certain folder to date.01.extension etc',
      false,
      'auto'
    );
    expect(route.resolvedModelId).toBe('deepseek-v4.1-flash');
    expect(route.primary.provider).toBe('opencode-go');
  });

  it('respects explicit providerOverride when set to openrouter', () => {
    const route = resolveModelRoute('beam-free', 'Hello', false, 'openrouter');
    expect(route.primary.provider).toBe('openrouter');
    expect(route.primary.targetModel).toBe('reflection/beam-1.0-501b-a23b');
    expect(route.fallbacks).toHaveLength(0);
  });

  it('reroutes non-vision models to gemini-3.8-flash when an image attachment is present', () => {
    const route = resolveModelRoute('beam-free', 'What is in this image?', true, 'auto');
    expect(route.resolvedModelId).toBe('gemini-3.8-flash');
  });

  it('routes gemini-4-hydrogen directly to OpenRouter target model', () => {
    const route = resolveModelRoute('gemini-4-hydrogen', 'Hello', false, 'auto');
    expect(route.resolvedModelId).toBe('gemini-4-hydrogen');
    expect(route.primary.provider).toBe('openrouter');
    expect(route.primary.targetModel).toBe('google/gemini-4-hydrogen');
  });

  it('auto-routes image generation prompts to gemini-image', () => {
    const route = resolveModelRoute(
      'auto',
      'Please generate an image of banner with logo "Thanh\'S LLM Arena"',
      false,
      'auto'
    );
    expect(route.resolvedModelId).toBe('gemini-image');
    expect(route.primary.protocol).toBe('openrouter-image');
    expect(route.primary.provider).toBe('openrouter');
  });

  it('upgrades text-only model to gemini-image when user asks to generate an image', () => {
    const route = resolveModelRoute(
      'glm-5.3-flash',
      'Please generate an image of banner with logo "Thanh\'S LLM Arena"',
      false,
      'auto'
    );
    expect(route.resolvedModelId).toBe('gemini-image');
    expect(route.primary.protocol).toBe('openrouter-image');
  });
});
