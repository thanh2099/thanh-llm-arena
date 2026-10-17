// src/client/components/SettingsModal.tsx
import React, { useEffect, useState } from 'react';
import type { ApiKeysOverride, ProviderId } from '../../shared/types';

export interface SettingsModalProps {
  isOpen: boolean;
  keys: ApiKeysOverride;
  onSave: (keys: ApiKeysOverride) => void;
  onClose: () => void;
}

type ProviderStatusMap = Partial<Record<ProviderId, { configured: boolean }>>;

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, keys, onSave, onClose }) => {
  const [draft, setDraft] = useState<ApiKeysOverride>(keys);
  const [serverStatus, setServerStatus] = useState<ProviderStatusMap>({});

  useEffect(() => {
    if (!isOpen) return;
    setDraft(keys);
    let cancelled = false;
    fetch('/api/providers/status')
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
  }, [isOpen, keys]);

  if (!isOpen) return null;

  const renderBadge = (providerId: ProviderId, overrideValue?: string) => {
    if (overrideValue && overrideValue.trim().length > 0) {
      return <span className="provider-status-badge status-ok">[OVERRIDE ACTIVE]</span>;
    }
    if (serverStatus[providerId]?.configured) {
      return <span className="provider-status-badge status-ok">[CONFIGURED]</span>;
    }
    return <span className="provider-status-badge status-missing">[MISSING]</span>;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>[PROVIDER KEYS &amp; ROUTING CONFIGURATION]</span>
          <button type="button" className="ag-pill-btn" onClick={onClose}>
            ×
          </button>
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
