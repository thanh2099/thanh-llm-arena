// src/client/components/SettingsModal.tsx
import React, { useState } from 'react';
import type { ApiKeysOverride } from '../../shared/types';

export interface SettingsModalProps {
  isOpen: boolean;
  keys: ApiKeysOverride;
  onSave: (keys: ApiKeysOverride) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, keys, onSave, onClose }) => {
  const [draft, setDraft] = useState<ApiKeysOverride>(keys);
  if (!isOpen) return null;

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
            <span>OPENCODE GO API KEY (`opencode.ai/inference/go`)</span>
            <input
              type="password"
              placeholder="sk-..."
              value={draft.opencodeGo ?? ''}
              onChange={(e) => setDraft({ ...draft, opencodeGo: e.target.value })}
            />
          </label>
          <label className="modal-field">
            <span>GOOGLE GEMINI API KEY (`generativelanguage.googleapis.com`)</span>
            <input
              type="password"
              placeholder="AQ.Ab8... or AIza..."
              value={draft.gemini ?? ''}
              onChange={(e) => setDraft({ ...draft, gemini: e.target.value })}
            />
          </label>
          <label className="modal-field">
            <span>OPENROUTER API KEY (`openrouter.ai/api/v1`)</span>
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
