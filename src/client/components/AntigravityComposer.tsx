// src/client/components/AntigravityComposer.tsx
import React, { useRef, useState } from 'react';
import type { Attachment, ModelId, ProviderOverride } from '../../shared/types';
import { MODEL_CATALOG } from '../../server/config/models';

export interface AntigravityComposerProps {
  value: string;
  onChange: (val: string) => void;
  attachments: Attachment[];
  onAttachmentsChange: (atts: Attachment[]) => void;
  selectedModel: ModelId;
  onSelectModel: (m: ModelId) => void;
  providerOverride: ProviderOverride;
  onSelectProviderOverride: (p: ProviderOverride) => void;
  isStreaming: boolean;
  onSubmit: () => void;
  onStop: () => void;
}

export const AntigravityComposer: React.FC<AntigravityComposerProps> = ({
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  selectedModel,
  onSelectModel,
  providerOverride,
  onSelectProviderOverride,
  isStreaming,
  onSubmit,
  onStop,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const currentModel = MODEL_CATALOG.find((m) => m.id === selectedModel) ?? MODEL_CATALOG[0];

  const handleFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const next: Attachment[] = [...attachments];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) continue;
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ''));
          reader.readAsDataURL(file);
        });
        next.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name || `pasted-image-${Date.now()}.png`,
          mimeType: file.type || 'image/png',
          size: file.size,
          kind: 'image',
          dataUrl,
        });
      } else {
        const textContent = await file.text();
        next.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name || `attachment-${Date.now()}.txt`,
          mimeType: file.type || 'text/plain',
          size: file.size,
          kind: 'text',
          textContent,
        });
      }
    }
    onAttachmentsChange(next);
  };

  return (
    <div
      className="ag-composer"
      style={isDragging ? { borderColor: 'var(--border-focus)' } : undefined}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
          void handleFiles(e.dataTransfer.files);
        }
      }}
    >
      {attachments.length > 0 && (
        <div className="ag-attachments">
          {attachments.map((att) => (
            <div key={att.id} className="ag-attachment-chip">
              {att.kind === 'image' && att.dataUrl ? (
                <img src={att.dataUrl} alt={att.name} className="ag-attachment-thumb" />
              ) : (
                <span className="ag-attachment-ext">FILE</span>
              )}
              <span className="ag-attachment-name">{att.name}</span>
              <button
                type="button"
                className="ag-attachment-remove"
                onClick={() => onAttachmentsChange(attachments.filter((a) => a.id !== att.id))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        className="ag-textarea"
        placeholder="Ask anything..."
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => {
          const items = Array.from(e.clipboardData?.items ?? []);
          const files = items
            .filter((item) => item.kind === 'file')
            .map((item) => item.getAsFile())
            .filter((f): f is File => f !== null);
          if (files.length > 0) {
            e.preventDefault();
            void handleFiles(files);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isStreaming && (value.trim() || attachments.length > 0)) {
              onSubmit();
            }
          }
        }}
      />

      <div className="ag-toolbar">
        <div className="ag-toolbar-left">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.txt,.md,.json,.ts,.tsx,.js,.py,.html,.css,.csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="ag-pill-btn"
            title="Attach image or code/text file"
            onClick={() => fileInputRef.current?.click()}
          >
            +
          </button>

          <span className="ag-mode-pill" title="Direct Chat Mode">
            ⚔ DIRECT
          </span>

          <div className="ag-model-dropdown-wrap">
            <button
              type="button"
              className="ag-model-pill"
              onClick={() => setModelMenuOpen((v) => !v)}
            >
              <span>⚡ {currentModel.name}</span>
              <span className="ag-provider-tag">
                [{providerOverride === 'auto' ? currentModel.primary.provider.toUpperCase() : providerOverride.toUpperCase()}]
              </span>
              <span>▾</span>
            </button>

            {modelMenuOpen && (
              <div className="ag-dropdown-menu">
                <div className="ag-dropdown-section-label">SELECT MODEL</div>
                {MODEL_CATALOG.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`ag-dropdown-item ${m.id === selectedModel ? 'active' : ''}`}
                    onClick={() => {
                      onSelectModel(m.id);
                      setModelMenuOpen(false);
                    }}
                  >
                    <div>
                      <div className="ag-dropdown-title">{m.name}</div>
                      <div className="ag-dropdown-desc">{m.description}</div>
                    </div>
                    <span className="ag-dropdown-badge">{m.badge}</span>
                  </button>
                ))}
                <div className="ag-dropdown-section-label" style={{ marginTop: 8 }}>
                  PROVIDER ROUTING MODE
                </div>
                <div className="ag-provider-override-row">
                  {(['auto', 'opencode-go', 'gemini', 'openrouter'] as ProviderOverride[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`ag-override-chip ${providerOverride === p ? 'active' : ''}`}
                      onClick={() => onSelectProviderOverride(p)}
                    >
                      {p === 'auto' ? 'SMART FALLBACK' : p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ag-toolbar-right">
          {isStreaming ? (
            <button type="button" className="ag-stop-btn" onClick={onStop} title="Stop generation">
              ■ STOP
            </button>
          ) : (
            <button
              type="button"
              className="ag-send-btn"
              disabled={!value.trim() && attachments.length === 0}
              onClick={onSubmit}
              title="Send message"
            >
              →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
