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

const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|webp|bmp|svg|ico|avif)$/i;
const SUPPORTED_VISION_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function normalizeImageFile(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  const rawDataUrl = await readFileAsDataUrl(file);
  const rawMime = (file.type || 'image/png').toLowerCase();

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return { dataUrl: rawDataUrl, mimeType: SUPPORTED_VISION_MIMES.has(rawMime) ? rawMime : 'image/png' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width || 64;
      const h = img.naturalHeight || img.height || 64;
      const MAX_DIM = 2048;
      const MIN_DIM = 32;

      const needsDownscale = w > MAX_DIM || h > MAX_DIM;
      const needsUpscale = w < 16 || h < 16;
      const needsReencode =
        !SUPPORTED_VISION_MIMES.has(rawMime) || file.size > 1.5 * 1024 * 1024;

      if (!needsDownscale && !needsUpscale && !needsReencode) {
        resolve({ dataUrl: rawDataUrl, mimeType: rawMime });
        return;
      }

      let targetW = w;
      let targetH = h;
      if (needsDownscale) {
        const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
        targetW = Math.max(MIN_DIM, Math.round(w * scale));
        targetH = Math.max(MIN_DIM, Math.round(h * scale));
      } else if (needsUpscale) {
        const scale = Math.max(MIN_DIM / Math.max(w, 1), MIN_DIM / Math.max(h, 1));
        targetW = Math.round(w * scale);
        targetH = Math.round(h * scale);
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: rawDataUrl, mimeType: SUPPORTED_VISION_MIMES.has(rawMime) ? rawMime : 'image/png' });
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const outMime = rawMime === 'image/png' && file.size <= 1.5 * 1024 * 1024 ? 'image/png' : 'image/jpeg';
        const outDataUrl = canvas.toDataURL(outMime, 0.88);
        resolve({ dataUrl: outDataUrl, mimeType: outMime });
      } catch {
        resolve({ dataUrl: rawDataUrl, mimeType: SUPPORTED_VISION_MIMES.has(rawMime) ? rawMime : 'image/png' });
      }
    };
    img.onerror = () => {
      resolve({ dataUrl: rawDataUrl, mimeType: SUPPORTED_VISION_MIMES.has(rawMime) ? rawMime : 'image/png' });
    };
    img.src = rawDataUrl;
  });
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
      if (file.size > 25 * 1024 * 1024) continue;
      const isImage = file.type.startsWith('image/') || IMAGE_EXT_REGEX.test(file.name);
      if (isImage) {
        const { dataUrl, mimeType } = await normalizeImageFile(file);
        next.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name || `pasted-image-${Date.now()}.png`,
          mimeType,
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
          const itemFiles = Array.from(e.clipboardData?.items ?? [])
            .filter((item) => item.kind === 'file')
            .map((item) => item.getAsFile())
            .filter((f): f is File => f !== null);
          const directFiles = Array.from(e.clipboardData?.files ?? []);
          const files = itemFiles.length > 0 ? itemFiles : directFiles;
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
