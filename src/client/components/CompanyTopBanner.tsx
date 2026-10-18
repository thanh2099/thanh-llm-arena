// src/client/components/CompanyTopBanner.tsx
import React from 'react';

export interface CompanyTopBannerProps {
  onOpenSettings: () => void;
  isUnlocked?: boolean;
}

export const CompanyTopBanner: React.FC<CompanyTopBannerProps> = ({
  onOpenSettings,
  isUnlocked = false,
}) => {
  return (
    <header className="workspace-top-banner">
      <div className="top-banner-inner">
        {/* Left Telemetry Cluster */}
        <div className="top-banner-left">
          <div className="top-banner-live-pill">
            <span className="connecting-dot">●</span>
            <span className="top-banner-live-label">LIVE ARENA</span>
          </div>
          <span className="top-banner-pipe">|</span>
          <div className="top-banner-telemetry-item">
            <span className="telemetry-dim">NET:</span>
            <span className="telemetry-val">OPENCODE · GEMINI · OPENROUTER</span>
          </div>
        </div>

        {/* Center Company Banner Focus (Very Top Middle) */}
        <div className="top-banner-center" onClick={onOpenSettings} title="Thanh'S LLM Arena (Admin: Ctrl+Shift+S)">
          <div className="top-banner-brand-container">
            <img src="/favicon.svg" alt="Company Logo" className="top-banner-logo" />
            <div className="top-banner-brand-text">
              <span className="top-banner-brand-name">Thanh'S LLM Arena</span>
              <span className="top-banner-brand-sub">ENTERPRISE MULTI-MODEL EVALUATION // DIRECT</span>
            </div>
          </div>
        </div>

        {/* Right Telemetry Cluster & Admin Security */}
        <div className="top-banner-right">
          <div className="top-banner-model-pill">
            <span className="telemetry-dim">MODELS:</span>
            <span className="telemetry-val">6 ACTIVE + AUTO</span>
          </div>
          <button
            type="button"
            className="top-banner-admin-btn"
            onClick={onOpenSettings}
            title={isUnlocked ? 'API Keys & Providers (Unlocked)' : 'Admin Authentication Required (thanh2099)'}
          >
            {isUnlocked ? (
              <span style={{ color: 'var(--signal-ok)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span className="connecting-dot">●</span> SETTINGS
              </span>
            ) : (
              <span>🔒 ADMIN</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
