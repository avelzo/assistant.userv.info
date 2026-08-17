import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

vi.mock('@/components/HeaderAuthButton', () => ({
  HeaderAuthButton: () => <div>compte</div>,
}));

const aiPayload = {
  range: '7d',
  from: '2026-08-10T00:00:00.000Z',
  to: '2026-08-16T12:00:00.000Z',
  currency: 'USD',
  totals: {
    calls: 147,
    inputTokens: 800,
    outputTokens: 400,
    totalTokens: 1200,
    estimatedCostNanodollars: 148_200_000,
    estimatedCostUsd: '0.1482 USD',
    creditsCharged: 1284,
    activeUsers: 18,
  },
  byOperation: [
    {
      operation: 'ANALYZE_SITUATION',
      calls: 40,
      inputTokens: 200,
      outputTokens: 80,
      estimatedCostNanodollars: 40_000_000,
      estimatedCostUsd: '0.0400 USD',
      creditsCharged: 200,
    },
    {
      operation: 'GENERATE_LETTER',
      calls: 80,
      inputTokens: 400,
      outputTokens: 200,
      estimatedCostNanodollars: 80_000_000,
      estimatedCostUsd: '0.0800 USD',
      creditsCharged: 800,
    },
    {
      operation: 'REWRITE_SELECTION',
      calls: 20,
      inputTokens: 100,
      outputTokens: 80,
      estimatedCostNanodollars: 18_200_000,
      estimatedCostUsd: '0.0182 USD',
      creditsCharged: 60,
    },
    {
      operation: 'REVISE_DOCUMENT',
      calls: 7,
      inputTokens: 100,
      outputTokens: 40,
      estimatedCostNanodollars: 10_000_000,
      estimatedCostUsd: '0.0100 USD',
      creditsCharged: 224,
    },
  ],
  series: [
    { date: '2026-08-15', calls: 40, estimatedCostNanodollars: 40_000_000, creditsCharged: 400 },
    { date: '2026-08-16', calls: 107, estimatedCostNanodollars: 108_200_000, creditsCharged: 884 },
  ],
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/api/admin/ai-usage')) {
          return { ok: true, json: async () => aiPayload };
        }
        if (url.includes('/api/admin/users?') || url.endsWith('/api/admin/users')) {
          return {
            ok: true,
            json: async () => ({
              users: [
                {
                  id: '507f1f77bcf86cd799439011',
                  emailMasked: 'la***@userv.info',
                  role: 'user',
                  status: 'active',
                  freeCredits: 150,
                  paidCredits: 13,
                  lastActivityAt: '2026-08-16T10:00:00.000Z',
                  recentCreditsCharged: 25,
                },
              ],
            }),
          };
        }
        if (url.includes('/api/admin/feedback')) {
          return {
            ok: true,
            json: async () => ({
              feedbacks: [
                {
                  id: 'f1',
                  userId: 'u1',
                  emailMasked: 'la***@userv.info',
                  dossierId: '507f1f77bcf86cd799439099',
                  operation: 'ANALYZE_SITUATION',
                  kind: 'ADVICE_NOT_USEFUL',
                  rating: 'NOT_USEFUL',
                  comment: 'Les questions étaient trop générales.',
                  createdAt: '2026-08-16T09:00:00.000Z',
                },
              ],
            }),
          };
        }
        return { ok: false, json: async () => ({ error: 'inattendu' }) };
      })
    );
  });

  it('affiche la vue d’ensemble Assistant avec les KPI et le sélecteur de période', async () => {
    render(<AdminDashboard />);

    expect(screen.getAllByText('Assistant').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Administration').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /vue d.ensemble/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^utilisateurs$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /ia & consommation/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^feedback$/i }).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('147')).toBeInTheDocument();
    });
    expect(screen.getByText(/utilisateurs, crédits et activité/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /aujourd.hui/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('$0.1482').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1[\s\u00a0\u202f]284/).length).toBeGreaterThan(0);
    expect(screen.getByText('Coût provider')).toBeInTheDocument();
    expect(screen.getByText('Facturation interne')).toBeInTheDocument();
    expect(screen.getByText(/évolution des appels ia/i)).toBeInTheDocument();
  });

  it('ouvre la liste utilisateurs masquée sans e-mail brut', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);
    await user.click(screen.getAllByRole('button', { name: /^utilisateurs$/i })[0]!);
    await waitFor(() => {
      expect(screen.getAllByText('la***@userv.info').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('laurent@userv.info')).not.toBeInTheDocument();
    expect(screen.getAllByText(/gratuit/i).length).toBeGreaterThan(0);
  });

  it('présente le feedback utile/pas utile et le commentaire', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);
    await user.click(screen.getAllByRole('button', { name: /^feedback$/i })[0]!);
    await waitFor(() => {
      expect(screen.getByText('Les questions étaient trop générales.')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Pas utile').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Conseil peu utile').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Madame, Monsieur/)).not.toBeInTheDocument();
  });

  it('détaille les opérations IA avec des libellés métier', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);
    await user.click(screen.getAllByRole('button', { name: /ia & consommation/i })[0]!);
    await waitFor(() => {
      expect(screen.getAllByText(/m.aider dans ma démarche/i).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Rédaction').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/évolution du coût provider/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/répartition des crédits par opération/i).length).toBeGreaterThan(0);
  });
});
