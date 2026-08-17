import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DemarchePane } from '@/components/dossiers/DemarchePane';
import type { DossierView } from '@/components/dossiers/types';

vi.mock('@/components/feedback/FeedbackForm', () => ({
  FeedbackForm: () => null,
}));

const dossier: DossierView = {
  id: '507f1f77bcf86cd799439011',
  title: 'Dépôt',
  objective: 'Récupérer 850 €.',
  recipientName: 'SCI Martin',
  recipientCategory: 'Logement',
  suggestedTone: '',
  context: 'Bail terminé.',
  status: 'DRAFT',
  advice: '',
  questions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  document: null,
};

describe('DemarchePane wording', () => {
  it('affiche une formulation orientée utilisateur avec le coût', () => {
    render(
      <DemarchePane
        dossier={dossier}
        analyzeCost={5}
        generateCost={10}
        onFieldChange={vi.fn()}
        onQuestionAnswer={vi.fn()}
        onAnalyze={vi.fn()}
        onGenerate={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /m’aider dans ma démarche · 5 crédits/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /analyser ma situation/i })).not.toBeInTheDocument();
    expect(screen.getByText(/facultatif/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rédiger mon courrier · 10 crédits/i })).toBeInTheDocument();
  });

  it('distingue questions utiles, réponses et conseil', () => {
    render(
      <DemarchePane
        dossier={{
          ...dossier,
          advice: 'Vous pouvez relancer par écrit.',
          questions: [{ id: 'q1', prompt: 'Quand avez-vous rendu les clés ?', answer: '' }],
        }}
        analyzeCost={5}
        generateCost={10}
        onFieldChange={vi.fn()}
        onQuestionAnswer={vi.fn()}
        onAnalyze={vi.fn()}
        onGenerate={vi.fn()}
      />
    );

    expect(screen.getByText(/questions utiles/i)).toBeInTheDocument();
    expect(screen.getByText('Quand avez-vous rendu les clés ?')).toBeInTheDocument();
    expect(screen.getByText(/^réponse$/i)).toBeInTheDocument();
    expect(screen.getByText(/conseil de l['’']assistant/i)).toBeInTheDocument();
    expect(screen.getByText('Vous pouvez relancer par écrit.')).toBeInTheDocument();
    expect(screen.queryByText(/suffisamment renseigné/i)).not.toBeInTheDocument();
  });

  it('indique que le dossier suffit quand il n’y a aucune question après analyse', () => {
    render(
      <DemarchePane
        dossier={{ ...dossier, advice: 'Vous pouvez passer à la rédaction.', questions: [] }}
        analyzeCost={5}
        generateCost={10}
        onFieldChange={vi.fn()}
        onQuestionAnswer={vi.fn()}
        onAnalyze={vi.fn()}
        onGenerate={vi.fn()}
      />
    );

    expect(screen.getByText(/votre dossier semble suffisamment renseigné pour passer à la rédaction/i)).toBeInTheDocument();
    expect(screen.getByText(/conseil de l['’']assistant/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rédiger mon courrier · 10 crédits/i })).toBeInTheDocument();
    expect(screen.queryByText(/questions utiles/i)).not.toBeInTheDocument();
  });
});
