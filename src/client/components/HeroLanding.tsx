// src/client/components/HeroLanding.tsx
import React from 'react';

export interface StarterCard {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  code: string;
}

export const STARTER_CARDS: StarterCard[] = [
  {
    id: 'landing-page',
    title: 'Create a landing page',
    subtitle: 'Create a sleek, modern landing page',
    code: 'PROMPT_01',
    prompt: 'Create a sleek, high-contrast dark mode SaaS landing page for an AI developer platform with HTML and CSS.',
  },
  {
    id: 'dashboard',
    title: 'Build a dashboard',
    subtitle: 'Turn data into interactive charts',
    code: 'PROMPT_02',
    prompt: 'Build a financial & telemetry analytics dashboard layout with tabular metrics, KPI cards, and SVG sparklines.',
  },
  {
    id: 'game',
    title: 'Make a game',
    subtitle: 'Build a playable browser game',
    code: 'PROMPT_03',
    prompt: 'Build a complete playable retro arcade space shooter game in a single HTML5 Canvas file.',
  },
  {
    id: 'design-to-code',
    title: 'Design to Code',
    subtitle: 'Upload an image and have AI build it',
    code: 'PROMPT_04',
    prompt: 'Convert a UI wireframe or screenshot into clean, accessible React + CSS components.',
  },
  {
    id: 'fullstack',
    title: 'Build a fullstack app',
    subtitle: 'Create a templated full-stack app',
    code: 'PROMPT_05',
    prompt: 'Architect a full-stack TypeScript task runner with an Express REST API and React frontend.',
  },
  {
    id: 'storefront',
    title: 'Launch a storefront',
    subtitle: 'Create a beautiful online shop',
    code: 'PROMPT_06',
    prompt: 'Design a minimalist editorial hardware storefront with product grid, technical spec drawer, and cart.',
  },
];

export interface HeroLandingProps {
  composerSlot: React.ReactNode;
  onSelectStarter: (prompt: string) => void;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({ composerSlot, onSelectStarter }) => {
  return (
    <div className="arena-hero-container">
      <div className="arena-hero-inner">
        <h1 className="arena-hero-title">What would you like to do?</h1>
        {composerSlot}
        <div className="arena-starter-section">
          <div className="arena-starter-heading">Get started</div>
          <div className="arena-starter-grid">
            {STARTER_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                className="arena-starter-card"
                onClick={() => onSelectStarter(card.prompt)}
              >
                <div className="arena-starter-icon">{card.code.slice(-2)}</div>
                <div className="arena-starter-text">
                  <div className="arena-starter-card-title">{card.title}</div>
                  <div className="arena-starter-card-sub">{card.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
