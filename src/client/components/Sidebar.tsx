// src/client/components/Sidebar.tsx
import React, { useState } from 'react';
import type { ChatThread } from '../../shared/types';

export interface SidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  isOpen: boolean;
  hideSettingsButton?: boolean;
  isUnlocked?: boolean;
  onToggle: () => void;
  onNewThread: () => void;
  onSelectThread: (id: string) => void;
  onRenameThread: (id: string, title: string) => void;
  onDeleteThread: (id: string) => void;
  onOpenSettings: () => void;
  onLockSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  threads,
  activeThreadId,
  isOpen,
  hideSettingsButton = false,
  isUnlocked = false,
  onToggle,
  onNewThread,
  onSelectThread,
  onRenameThread,
  onDeleteThread,
  onOpenSettings,
  onLockSettings,
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
        <div className="sidebar-brand-group">
          <img src="/favicon.svg" alt="Logo" className="sidebar-brand-icon" />
          <span className="sidebar-brand">Thanh'S LLM Arena</span>
        </div>
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

      {!hideSettingsButton && (
        <div className="sidebar-footer">
          {isUnlocked ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                className="sidebar-settings-btn"
                style={{ flex: 1 }}
                onClick={onOpenSettings}
                title="API Keys &amp; Providers (Unlocked)"
              >
                <span style={{ color: 'var(--signal-ok)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span className="connecting-dot">●</span> API KEYS &amp; PROVIDERS
                </span>
                <span>⚙</span>
              </button>
              {onLockSettings && (
                <button
                  type="button"
                  className="ag-override-chip"
                  onClick={onLockSettings}
                  title="Lock admin session"
                  style={{ padding: '7px 8px', fontSize: '11px' }}
                >
                  🔒
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="sidebar-settings-btn"
              onClick={onOpenSettings}
              title="Password Protected (Passkey Required)"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span>🔒</span> API KEYS &amp; PROVIDERS
              </span>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                [LOCKED]
              </span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
