// src/client/components/SettingsModal.tsx
import React, { useEffect, useState } from 'react';
import type { ApiKeysOverride, ProviderId } from '../../shared/types';
import { isSessionAuthenticated, setSessionAuthenticated } from '../lib/storage';

export interface SettingsModalProps {
  isOpen: boolean;
  keys: ApiKeysOverride;
  hideSidebarButton: boolean;
  onToggleHideSidebarButton: (hide: boolean) => void;
  onSave: (keys: ApiKeysOverride) => void;
  onClose: () => void;
  onLock?: () => void;
}

type ProviderStatusMap = Partial<Record<ProviderId, { configured: boolean }>>;

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  keys,
  hideSidebarButton,
  onToggleHideSidebarButton,
  onSave,
  onClose,
  onLock,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isSessionAuthenticated());
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [draft, setDraft] = useState<ApiKeysOverride>(keys);
  const [serverStatus, setServerStatus] = useState<ProviderStatusMap>({});

  useEffect(() => {
    if (isOpen) {
      setIsAuthenticated(isSessionAuthenticated());
      setPasswordInput('');
      setAuthError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    setDraft(keys);
    let cancelled = false;
    fetch('/api/providers/status', {
      headers: { 'x-admin-passkey': 'thanh2099' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.providers) {
          setServerStatus(data.providers as ProviderStatusMap);
        }
      })
      .catch(() => {
        // Ignore network errors when inspecting status offline
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isAuthenticated, keys]);

  if (!isOpen) return null;

  if (!isAuthenticated) {
    const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput.trim() === 'thanh2099') {
        setSessionAuthenticated(true);
        setIsAuthenticated(true);
        setAuthError(false);
      } else {
        setAuthError(true);
      }
    };

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <span>[ADMIN AUTHENTICATION REQUIRED]</span>
            <button type="button" className="ag-pill-btn" onClick={onClose} title="Close">
              ×
            </button>
          </div>
          <form onSubmit={handlePasswordSubmit} className="modal-body">
            <p className="modal-hint">
              Access to API Keys &amp; Provider Configuration is restricted. Enter admin password to proceed:
            </p>
            <label className="modal-field">
              <span>ADMIN PASSWORD</span>
              <input
                type="password"
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError(false);
                }}
                autoFocus
              />
            </label>
            {authError && (
              <div className="turn-error-title" style={{ marginTop: '2px', fontSize: '11px' }}>
                [ACCESS DENIED] Incorrect password.
              </div>
            )}
            <div className="modal-footer" style={{ padding: '12px 0 0', borderTop: 'none' }}>
              <button type="button" className="ag-override-chip" onClick={onClose}>
                [CANCEL]
              </button>
              <button
                type="submit"
                className="ag-send-btn"
                style={{ width: 'auto', padding: '6px 14px' }}
              >
                [UNLOCK]
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const renderBadge = (providerId: ProviderId, overrideValue?: string) => {
    if (overrideValue && overrideValue.trim().length > 0) {
      return <span className="provider-status-badge status-ok">[OVERRIDE ACTIVE]</span>;
    }
    if (serverStatus[providerId]?.configured) {
      return <span className="provider-status-badge status-ok">[CONFIGURED]</span>;
    }
    return <span className="provider-status-badge status-missing">[MISSING]</span>;
  };

  const handleLockAndClose = () => {
    setSessionAuthenticated(false);
    setIsAuthenticated(false);
    if (onLock) onLock();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>[PROVIDER KEYS &amp; ROUTING CONFIGURATION]</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="ag-override-chip"
              onClick={handleLockAndClose}
              title="Lock admin session"
            >
              [LOCK &amp; EXIT]
            </button>
            <button type="button" className="ag-pill-btn" onClick={onClose} title="Close">
              ×
            </button>
          </div>
        </div>
        <div className="modal-body">
          <p className="modal-hint">
            Server `.env` keys are active by default. Enter a key below only if you want to override it in the browser.
          </p>
          <label className="modal-field">
            <div className="modal-field-header">
              <span>OPENCODE GO API KEY (`opencode.ai/inference/go`)</span>
              {renderBadge('opencode-go', draft.opencodeGo)}
            </div>
            <input
              type="password"
              placeholder="sk-..."
              value={draft.opencodeGo ?? ''}
              onChange={(e) => setDraft({ ...draft, opencodeGo: e.target.value })}
            />
          </label>
          <label className="modal-field">
            <div className="modal-field-header">
              <span>GOOGLE GEMINI API KEY (`generativelanguage.googleapis.com`)</span>
              {renderBadge('gemini', draft.gemini)}
            </div>
            <input
              type="password"
              placeholder="AQ.Ab8... or AIza..."
              value={draft.gemini ?? ''}
              onChange={(e) => setDraft({ ...draft, gemini: e.target.value })}
            />
          </label>
          <label className="modal-field">
            <div className="modal-field-header">
              <span>OPENROUTER API KEY (`openrouter.ai/api/v1`)</span>
              {renderBadge('openrouter', draft.openrouter)}
            </div>
            <input
              type="password"
              placeholder="sk-or-v1-..."
              value={draft.openrouter ?? ''}
              onChange={(e) => setDraft({ ...draft, openrouter: e.target.value })}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={hideSidebarButton}
              onChange={(e) => onToggleHideSidebarButton(e.target.checked)}
            />
            <span>Hide "API Keys &amp; Providers" button from sidebar (Ctrl+Shift+S to open)</span>
          </label>
        </div>
        <div className="modal-footer">
          <button type="button" className="ag-override-chip" onClick={onClose}>
            [CANCEL]
          </button>
          <button
            type="button"
            className="ag-send-btn"
            style={{ width: 'auto', padding: '6px 14px' }}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            [SAVE OVERRIDES]
          </button>
        </div>
      </div>
    </div>
  );
};
