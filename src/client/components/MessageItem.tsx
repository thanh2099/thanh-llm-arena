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
