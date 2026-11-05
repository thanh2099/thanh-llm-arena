// src/client/lib/exporter.ts
import { Marked } from 'marked';
import type { ChatMessage, ChatThread } from '../../shared/types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const exportMarked = new Marked({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = (lang || 'text').trim().split(/\s+/)[0] || 'text';
      const encoded = encodeURIComponent(text);
      const escaped = escapeHtml(text);
      return `<div class="code-block-wrap"><div class="code-block-header"><span class="code-block-lang">[${escapeHtml(
        language.toUpperCase()
      )}]</span><button type="button" class="code-copy-btn" data-code="${encoded}">[COPY]</button></div><pre><code class="language-${escapeHtml(
        language
      )}">${escaped}</code></pre></div>`;
    },
  },
});

export function slugifyFilename(input: string, fallback = 'thanh-llm-export'): string {
  const clean = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return clean || fallback;
}

export function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return new Date(ts).toISOString();
  }
}

export function buildTurnPlainText(
  assistantMsg: ChatMessage,
  userMsg?: ChatMessage,
  threadTitle?: string
): string {
  const lines: string[] = [];
  const divider = '='.repeat(80);
  const subDivider = '-'.repeat(80);
  const modelLabel = assistantMsg.resolvedModelName || assistantMsg.modelId || 'Assistant';
  const providerLabel = assistantMsg.providerUsed ? assistantMsg.providerUsed.toUpperCase() : 'AUTO';
  const latencyLabel = typeof assistantMsg.latencyMs === 'number' ? `${assistantMsg.latencyMs}ms` : 'N/A';

  lines.push(divider);
  lines.push("THANH'S LLM ARENA — MODEL OUTPUT & REASONING EXPORT");
  if (threadTitle) {
    lines.push(`Thread   : ${threadTitle}`);
  }
  lines.push(`Model    : ${modelLabel}`);
  lines.push(`Provider : ${providerLabel}`);
  lines.push(`Latency  : ${latencyLabel}`);
  lines.push(`Exported : ${formatTimestamp(Date.now())}`);
  lines.push(divider);
  lines.push('');

  if (userMsg) {
    lines.push('[USER PROMPT]');
    lines.push(`Timestamp: ${formatTimestamp(userMsg.createdAt)}`);
    if (userMsg.attachments && userMsg.attachments.length > 0) {
      lines.push(
        `Attachments: ${userMsg.attachments.map((a) => `${a.name} (${a.kind})`).join(', ')}`
      );
    }
    lines.push(subDivider);
    lines.push(userMsg.content || '(Attachment prompt)');
    lines.push('');
    lines.push('');
  }

  if (assistantMsg.reasoning && assistantMsg.reasoning.trim()) {
    lines.push(`[THINKING TRACE // ${assistantMsg.reasoning.length} chars]`);
    lines.push(subDivider);
    lines.push(assistantMsg.reasoning.trim());
    lines.push('');
    lines.push('');
  }

  lines.push(`[MODEL OUTPUT // ${modelLabel}]`);
  lines.push(subDivider);
  if (assistantMsg.error) {
    lines.push(`[STREAM ERROR] ${assistantMsg.error}`);
  } else {
    lines.push(assistantMsg.content || '(Empty response)');
  }
  lines.push('');
  lines.push(divider);

  return lines.join('\n');
}

export function buildThreadPlainText(thread: ChatThread): string {
  const lines: string[] = [];
  const divider = '='.repeat(80);
  const subDivider = '-'.repeat(80);

  lines.push(divider);
  lines.push("THANH'S LLM ARENA — FULL THREAD EXPORT");
  lines.push(`Thread Title : ${thread.title}`);
  lines.push(`Created      : ${formatTimestamp(thread.createdAt)}`);
  lines.push(`Updated      : ${formatTimestamp(thread.updatedAt)}`);
  lines.push(`Messages     : ${thread.messages.length}`);
  lines.push(divider);
  lines.push('');

  thread.messages.forEach((msg, idx) => {
    if (msg.role === 'user') {
      lines.push(`--- TURN ${Math.floor(idx / 2) + 1} :: [USER] (${formatTimestamp(msg.createdAt)}) ---`);
      if (msg.attachments && msg.attachments.length > 0) {
        lines.push(`Attachments: ${msg.attachments.map((a) => `${a.name} (${a.kind})`).join(', ')}`);
      }
      lines.push(msg.content || '(Attachment prompt)');
      lines.push('');
    } else {
      const modelLabel = msg.resolvedModelName || msg.modelId || 'MODEL';
      const providerLabel = msg.providerUsed ? ` [${msg.providerUsed.toUpperCase()}]` : '';
      const latencyLabel = typeof msg.latencyMs === 'number' ? ` (${msg.latencyMs}ms)` : '';
      lines.push(`--- [ASSISTANT: ${modelLabel}]${providerLabel}${latencyLabel} ---`);

      if (msg.reasoning && msg.reasoning.trim()) {
        lines.push('');
        lines.push(`[THINKING TRACE // ${msg.reasoning.length} chars]`);
        lines.push(subDivider);
        lines.push(msg.reasoning.trim());
        lines.push(subDivider);
      }

      lines.push('');
      lines.push('[FINAL OUTPUT]');
      if (msg.error) {
        lines.push(`[STREAM ERROR] ${msg.error}`);
      } else {
        lines.push(msg.content || '(Empty response)');
      }
      lines.push('');
      lines.push(divider);
      lines.push('');
    }
  });

  return lines.join('\n');
}

function renderMessageCardHtml(msg: ChatMessage): string {
  if (msg.role === 'user') {
    const attachmentsHtml =
      msg.attachments && msg.attachments.length > 0
        ? `<div class="turn-attachments">${msg.attachments
            .map((att) =>
              att.kind === 'image' && att.dataUrl
                ? `<img src="${escapeHtml(att.dataUrl)}" alt="${escapeHtml(att.name)}" class="turn-image-preview" />`
                : `<span class="att-chip">[FILE: ${escapeHtml(att.name)}]</span>`
            )
            .join('')}</div>`
        : '';

    return `
      <section class="turn-card turn-user">
        <div class="turn-meta">
          <span class="badge badge-user">[USER PROMPT]</span>
          <span class="meta-dim">${escapeHtml(formatTimestamp(msg.createdAt))}</span>
        </div>
        ${attachmentsHtml}
        <div class="user-body">${escapeHtml(msg.content || '')}</div>
      </section>
    `;
  }

  const modelLabel = msg.resolvedModelName || msg.modelId || 'MODEL';
  const providerBadge = msg.providerUsed
    ? `<span class="badge badge-provider">[${escapeHtml(msg.providerUsed.toUpperCase())}]</span>`
    : '';
  const latencyBadge =
    typeof msg.latencyMs === 'number'
      ? `<span class="meta-dim">${msg.latencyMs}ms</span>`
      : '';
  const failoverBadge = msg.failover
    ? `<span class="badge badge-warn">[REROUTED: ${escapeHtml(
        msg.failover.from.toUpperCase()
      )} → ${escapeHtml(msg.failover.to.toUpperCase())} (${escapeHtml(msg.failover.reason)})]</span>`
    : '';

  const reasoningHtml =
    msg.reasoning && msg.reasoning.trim()
      ? `
        <details class="reasoning-drawer" open>
          <summary class="reasoning-summary">
            <span>THINKING TRACE // REASONING</span>
            <span class="reasoning-chars">${msg.reasoning.length} chars</span>
          </summary>
          <pre class="reasoning-body">${escapeHtml(msg.reasoning.trim())}</pre>
        </details>
      `
      : '';

  const renderedProse = msg.error
    ? `<div class="error-box">[STREAM ERROR] ${escapeHtml(msg.error)}</div>`
    : msg.content
    ? `<div class="markdown-prose">${exportMarked.parse(msg.content, { async: false }) as string}</div>`
    : `<div class="meta-dim">[No response text generated]</div>`;

  return `
    <section class="turn-card turn-assistant">
      <div class="turn-meta">
        <span class="badge badge-model">[${escapeHtml(modelLabel)}]</span>
        ${providerBadge}
        ${latencyBadge}
        ${failoverBadge}
        <span class="meta-dim" style="margin-left:auto">${escapeHtml(formatTimestamp(msg.createdAt))}</span>
      </div>
      ${reasoningHtml}
      <div class="output-section">
        <div class="section-label">MODEL OUTPUT</div>
        ${renderedProse}
      </div>
    </section>
  `;
}

export function buildExportHtmlDocument(options: {
  title: string;
  subtitle: string;
  messages: ChatMessage[];
}): string {
  const { title, subtitle, messages } = options;
  const cardsHtml = messages.map(renderMessageCardHtml).join('\n');
  const exportedAt = formatTimestamp(Date.now());

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} // Thanh'S LLM Arena</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <style>
    :root {
      --font-serif: 'Instrument Serif', Georgia, serif;
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    html[data-theme="dark"] {
      --bg-canvas: #09090b;
      --bg-surface: #121215;
      --bg-elevated: #18181c;
      --bg-code: #050507;
      --border-subtle: #27272a;
      --border-strong: #52525b;
      --border-focus: #e4e4e7;
      --text-primary: #fafafa;
      --text-secondary: #a1a1aa;
      --text-muted: #71717a;
      --signal-ok: #10b981;
      --signal-warn: #f59e0b;
      --signal-danger: #ef4444;
    }

    html[data-theme="light"] {
      --bg-canvas: #f8fafc;
      --bg-surface: #ffffff;
      --bg-elevated: #f1f5f9;
      --bg-code: #f1f5f9;
      --border-subtle: #e2e8f0;
      --border-strong: #cbd5e1;
      --border-focus: #0f172a;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #64748b;
      --signal-ok: #059669;
      --signal-warn: #d97706;
      --signal-danger: #dc2626;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: var(--bg-canvas);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 14px;
      line-height: 1.65;
      min-height: 100vh;
    }

    .top-bar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .brand-cluster {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .brand-dot {
      color: var(--signal-ok);
    }

    .brand-title {
      font-weight: 700;
      color: var(--text-primary);
    }

    .brand-sub {
      color: var(--text-muted);
      font-size: 11px;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .action-btn {
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 5px 10px;
      border-radius: 4px;
      border: 1px solid var(--border-strong);
      background: var(--bg-elevated);
      color: var(--text-primary);
      cursor: pointer;
    }

    .action-btn:hover {
      border-color: var(--border-focus);
    }

    .container {
      max-width: 1080px;
      margin: 0 auto;
      padding: 28px 20px 64px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .report-header {
      padding: 20px 24px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .report-title {
      font-family: var(--font-serif);
      font-size: 28px;
      font-weight: 400;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .report-subtitle {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
    }

    .turn-card {
      padding: 20px 24px;
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      background: var(--bg-surface);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .turn-user {
      background: var(--bg-canvas);
      border-color: var(--border-strong);
    }

    .turn-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 11px;
    }

    .badge {
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-elevated);
    }

    .badge-user {
      color: var(--text-primary);
    }

    .badge-model {
      color: var(--signal-ok);
      border-color: rgba(16, 185, 129, 0.35);
    }

    .badge-provider {
      color: var(--text-secondary);
    }

    .badge-warn {
      color: var(--signal-warn);
      border-color: rgba(245, 158, 11, 0.4);
    }

    .meta-dim {
      color: var(--text-muted);
    }

    .turn-attachments {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .turn-image-preview {
      max-height: 220px;
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
    }

    .att-chip {
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 4px 8px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      color: var(--text-secondary);
    }

    .user-body {
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      color: var(--text-primary);
    }

    .reasoning-drawer {
      border: 1px solid var(--border-subtle);
      border-radius: 5px;
      background: var(--bg-code);
      overflow: hidden;
    }

    .reasoning-summary {
      padding: 8px 12px;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
      background: var(--bg-elevated);
    }

    .reasoning-chars {
      color: var(--text-muted);
      font-weight: 400;
    }

    .reasoning-body {
      padding: 12px 14px;
      border-top: 1px solid var(--border-subtle);
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.55;
      color: var(--text-secondary);
      white-space: pre-wrap;
      overflow-x: auto;
    }

    .output-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-label {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .markdown-prose {
      font-size: 14px;
      line-height: 1.7;
      color: var(--text-primary);
    }

    .markdown-prose p {
      margin-bottom: 12px;
    }

    .markdown-prose ol,
    .markdown-prose ul {
      margin: 10px 0 16px;
      padding-left: 28px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .markdown-prose h1,
    .markdown-prose h2,
    .markdown-prose h3,
    .markdown-prose h4 {
      color: var(--text-primary);
      font-weight: 600;
      margin: 18px 0 8px;
      line-height: 1.35;
    }

    .markdown-prose h1 { font-size: 20px; }
    .markdown-prose h2 { font-size: 17px; }
    .markdown-prose h3 { font-size: 15px; }

    .markdown-prose blockquote {
      border-left: 3px solid var(--border-strong);
      padding: 8px 14px;
      margin: 14px 0;
      color: var(--text-secondary);
      background: var(--bg-canvas);
      border-radius: 0 4px 4px 0;
    }

    .markdown-prose table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 13px;
    }

    .markdown-prose th,
    .markdown-prose td {
      padding: 8px 12px;
      border: 1px solid var(--border-subtle);
      text-align: left;
    }

    .markdown-prose th {
      background: var(--bg-elevated);
      font-family: var(--font-mono);
      font-size: 11px;
    }

    .markdown-prose code {
      font-family: var(--font-mono);
      font-size: 12px;
      background: var(--bg-elevated);
      padding: 1px 5px;
      border-radius: 3px;
    }

    .code-block-wrap {
      margin: 12px 0;
      border: 1px solid var(--border-subtle);
      border-radius: 5px;
      background: var(--bg-code);
      overflow: hidden;
    }

    .code-block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border-subtle);
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-secondary);
    }

    .code-copy-btn {
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--text-secondary);
      padding: 2px 8px;
      border: 1px solid var(--border-subtle);
      border-radius: 3px;
      background: var(--bg-surface);
      cursor: pointer;
    }

    .code-copy-btn:hover {
      border-color: var(--border-focus);
      color: var(--text-primary);
    }

    .code-block-wrap pre {
      padding: 12px 14px;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.55;
    }

    .code-block-wrap pre code {
      background: none;
      padding: 0;
    }

    .error-box {
      padding: 10px 12px;
      border: 1px solid var(--signal-danger);
      border-radius: 4px;
      color: var(--signal-danger);
      font-family: var(--font-mono);
      font-size: 12px;
    }

    @media print {
      .top-bar {
        display: none;
      }
      body {
        background: #ffffff;
        color: #000000;
      }
    }
  </style>
</head>
<body>
  <header class="top-bar">
    <div class="brand-cluster">
      <span class="brand-dot">●</span>
      <span class="brand-title">Thanh'S LLM Arena</span>
      <span class="brand-sub">// EXPORTED MODEL REPORT · ${escapeHtml(exportedAt)}</span>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="action-btn" id="toggle-thoughts-btn">[TOGGLE THOUGHTS]</button>
      <button type="button" class="action-btn" id="toggle-theme-btn">[☀ LIGHT / ☾ DARK]</button>
      <button type="button" class="action-btn" onclick="window.print()">[⎙ PRINT / PDF]</button>
    </div>
  </header>

  <main class="container">
    <div class="report-header">
      <h1 class="report-title">${escapeHtml(title)}</h1>
      <div class="report-subtitle">${escapeHtml(subtitle)}</div>
    </div>
    ${cardsHtml}
  </main>

  <script>
    (function () {
      var themeBtn = document.getElementById('toggle-theme-btn');
      if (themeBtn) {
        themeBtn.addEventListener('click', function () {
          var html = document.documentElement;
          var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
          html.setAttribute('data-theme', next);
        });
      }

      var thoughtsBtn = document.getElementById('toggle-thoughts-btn');
      if (thoughtsBtn) {
        thoughtsBtn.addEventListener('click', function () {
          var drawers = document.querySelectorAll('details.reasoning-drawer');
          var anyOpen = Array.prototype.some.call(drawers, function (d) { return d.open; });
          Array.prototype.forEach.call(drawers, function (d) { d.open = !anyOpen; });
        });
      }

      document.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('.code-copy-btn');
        if (!btn) return;
        var encoded = btn.getAttribute('data-code');
        if (encoded !== null && navigator.clipboard) {
          navigator.clipboard.writeText(decodeURIComponent(encoded)).catch(function () {});
          btn.textContent = '[COPIED]';
          setTimeout(function () { btn.textContent = '[COPY]'; }, 1500);
        }
      });
    })();
  </script>
</body>
</html>`;
}

export function buildTurnHtml(
  assistantMsg: ChatMessage,
  userMsg?: ChatMessage,
  threadTitle?: string
): string {
  const modelLabel = assistantMsg.resolvedModelName || assistantMsg.modelId || 'Model';
  const providerLabel = assistantMsg.providerUsed ? assistantMsg.providerUsed.toUpperCase() : 'AUTO';
  const latencyLabel = typeof assistantMsg.latencyMs === 'number' ? `${assistantMsg.latencyMs}ms` : 'N/A';
  const messages: ChatMessage[] = [];
  if (userMsg) messages.push(userMsg);
  messages.push(assistantMsg);

  return buildExportHtmlDocument({
    title: threadTitle || userMsg?.content?.slice(0, 64) || `${modelLabel} Output & Reasoning`,
    subtitle: `MODEL: ${modelLabel} · PROVIDER: ${providerLabel} · LATENCY: ${latencyLabel}`,
    messages,
  });
}

export function buildThreadHtml(thread: ChatThread): string {
  return buildExportHtmlDocument({
    title: thread.title || 'Exported Chat Thread',
    subtitle: `FULL CONVERSATION (${thread.messages.length} MESSAGES) · CREATED ${formatTimestamp(
      thread.createdAt
    )}`,
    messages: thread.messages,
  });
}

export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportSingleTurn(
  format: 'txt' | 'html',
  assistantMsg: ChatMessage,
  userMsg?: ChatMessage,
  threadTitle?: string
): void {
  const modelSlug = slugifyFilename(assistantMsg.resolvedModelName || assistantMsg.modelId || 'model');
  const promptSlug = slugifyFilename(userMsg?.content?.slice(0, 32) || threadTitle || 'response');
  const datePart = new Date().toISOString().slice(0, 10);
  const baseName = `${modelSlug}-${promptSlug}-${datePart}`;

  if (format === 'txt') {
    const txt = buildTurnPlainText(assistantMsg, userMsg, threadTitle);
    triggerFileDownload(`${baseName}.txt`, txt, 'text/plain');
  } else {
    const html = buildTurnHtml(assistantMsg, userMsg, threadTitle);
    triggerFileDownload(`${baseName}.html`, html, 'text/html');
  }
}

export function exportFullThread(format: 'txt' | 'html', thread: ChatThread): void {
  const titleSlug = slugifyFilename(thread.title || 'thread');
  const datePart = new Date().toISOString().slice(0, 10);
  const baseName = `thanh-arena-${titleSlug}-${datePart}`;

  if (format === 'txt') {
    const txt = buildThreadPlainText(thread);
    triggerFileDownload(`${baseName}.txt`, txt, 'text/plain');
  } else {
    const html = buildThreadHtml(thread);
    triggerFileDownload(`${baseName}.html`, html, 'text/html');
  }
}
