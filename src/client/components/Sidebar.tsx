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
