// src/client/components/MessageItem.tsx
import React, { useMemo, useState } from 'react';
import { Marked } from 'marked';
import type { ChatMessage } from '../../shared/types';

export interface MessageItemProps {
  message: ChatMessage;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const customMarked = new Marked({
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

export const MessageItem: React.FC<MessageItemProps> = ({ message, onRetry, onOpenSettings }) => {
  const [reasoningOpen, setReasoningOpen] = useState(true);

  const html = useMemo(() => {
    if (message.role === 'user') return '';
    return customMarked.parse(message.content || '', { async: false }) as string;
  }, [message.role, message.content]);

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

  const handleProseClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('.code-copy-btn') as HTMLButtonElement | null;
    if (!btn) return;
    const encoded = btn.getAttribute('data-code');
    if (encoded !== null) {
      const decoded = decodeURIComponent(encoded);
      navigator.clipboard?.writeText(decoded).catch(() => {});
      btn.textContent = '[COPIED]';
      setTimeout(() => {
        btn.textContent = '[COPY]';
      }, 1500);
    }
  };

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
          onClick={handleProseClick}
          dangerouslySetInnerHTML={{ __html: html || '<span class="streaming-cursor">▋</span>' }}
        />
      )}
    </div>
  );
};
