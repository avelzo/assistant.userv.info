import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { GeneratorForm } from '@/components/GeneratorForm';

const pushMock = vi.fn();
let sessionMock: { user?: { name?: string; email?: string } } | null = null;
let sessionStatusMock: 'authenticated' | 'unauthenticated' | 'loading' =
  'unauthenticated';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/lib/auth-client', () => ({
  useAuthSession: () => ({
    data: sessionMock,
    status: sessionStatusMock,
  }),
}));

vi.mock('@/lib/constants', () => ({
  CATEGORIES: ['CAF', 'Assurance', 'Résiliation'],
  TONES: ['Standard', 'Ferme'],
}));

vi.mock('@/lib/credits/config', () => ({
  AI_CREDIT_COSTS: {
    GENERATE_LETTER: 10,
  },
  getDailyFreeCredits: () => 15,
}));

describe('GeneratorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock = null;
    sessionStatusMock = 'unauthenticated';

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    global.fetch = vi.fn();
  });

  it('affiche une erreur si la situation est vide', async () => {
    render(<GeneratorForm />);

    const button = await screen.findByRole('button', {
      name: /générer ma lettre/i,
    });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    fireEvent.click(button);

    expect(
      await screen.findByText(/veuillez décrire la situation/i)
    ).toBeInTheDocument();
  });

  it('préremplit le nom quand l’utilisateur est authentifié', async () => {
    sessionMock = {
      user: {
        name: 'Laurent Hunaut',
        email: 'laurent@example.com',
      },
    };
    sessionStatusMock = 'authenticated';

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ freeCredits: 15, paidCredits: 0, dailyFreeLimit: 15 }),
    });

    render(<GeneratorForm />);

    const fullNameInput = await screen.findByDisplayValue('Laurent Hunaut');
    expect(fullNameInput).toBeInTheDocument();
  });

  it('soumet le formulaire authentifié et redirige vers /result', async () => {
    sessionMock = {
      user: {
        name: 'Laurent Hunaut',
        email: 'laurent@example.com',
      },
    };
    sessionStatusMock = 'authenticated';

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ freeCredits: 15, paidCredits: 0, dailyFreeLimit: 15 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          letter: 'Voici votre lettre',
          emailVersion: 'Voici votre email',
          freeCredits: 140,
          paidCredits: 0,
        }),
      });

    render(<GeneratorForm />);

    await screen.findByText(/gratuits 15 \/ 15/i);

    fireEvent.change(screen.getByPlaceholderText(/expliquez le contexte/i), {
      target: { value: 'Je souhaite contester une décision CAF.' },
    });

    const button = await screen.findByRole('button', {
      name: /générer ma lettre/i,
    });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      'generated-letter',
      'Voici votre lettre'
    );
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      'generated-email',
      'Voici votre email'
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/result');
    });
  });

  it('affiche une erreur API si la génération échoue', async () => {
    sessionMock = {
      user: {
        name: 'Laurent Hunaut',
        email: 'laurent@example.com',
      },
    };
    sessionStatusMock = 'authenticated';

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ freeCredits: 15, paidCredits: 0, dailyFreeLimit: 15 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Erreur OpenAI.',
        }),
      });

    render(<GeneratorForm />);

    await screen.findByText(/gratuits 15 \/ 15/i);

    fireEvent.change(screen.getByPlaceholderText(/expliquez le contexte/i), {
      target: { value: 'Je souhaite résilier mon assurance.' },
    });

    const button = await screen.findByRole('button', {
      name: /générer ma lettre/i,
    });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    fireEvent.click(button);

    expect(await screen.findByText(/erreur openai/i)).toBeInTheDocument();
  });

  it('bloque la génération quand le solde serveur est insuffisant', async () => {
    render(<GeneratorForm />);

    expect(await screen.findByText(/gratuits 0 \/ 15/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/expliquez le contexte/i), {
      target: { value: 'Je souhaite contester une décision CAF.' },
    });

    fireEvent.click(
      await screen.findByRole('button', {
        name: /générer ma lettre/i,
      })
    );

    expect(
      await screen.findByText(/crédits insuffisants/i)
    ).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith('/pricing');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
