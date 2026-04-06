import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { GeneratorForm } from '@/components/GeneratorForm';
import * as storage from '@/lib/storage';

const pushMock = vi.fn();
let sessionMock: { user?: { name?: string; email?: string } } | null = null;
let sessionStatusMock: 'authenticated' | 'unauthenticated' | 'loading' =
  'unauthenticated';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: sessionMock,
    status: sessionStatusMock,
  }),
}));

vi.mock('@/lib/constants', () => ({
  CATEGORIES: ['CAF', 'Assurance', 'Résiliation'],
  TONES: ['Standard', 'Ferme'],
}));

vi.mock('@/lib/storage', () => ({
  FREE_GENERATIONS: 1,
  getUsedGenerations: vi.fn(() => 0),
  getPaidCredits: vi.fn(() => 0),
  incrementUsedGenerations: vi.fn(() => 1),
  consumePaidCredit: vi.fn(() => 0),
  addCreditHistoryEntry: vi.fn(() => []),
}));

const getUsedGenerationsMock = vi.mocked(storage.getUsedGenerations);
const getPaidCreditsMock = vi.mocked(storage.getPaidCredits);
const incrementUsedGenerationsMock = vi.mocked(storage.incrementUsedGenerations);
const consumePaidCreditMock = vi.mocked(storage.consumePaidCredit);

describe('GeneratorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock = null;
    sessionStatusMock = 'unauthenticated';

    getUsedGenerationsMock.mockReturnValue(0);
    getPaidCreditsMock.mockReturnValue(0);
    incrementUsedGenerationsMock.mockReturnValue(1);
    consumePaidCreditMock.mockReturnValue(0);

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

    render(<GeneratorForm />);

    const fullNameInput = await screen.findByDisplayValue('Laurent Hunaut');
    expect(fullNameInput).toBeInTheDocument();
  });

  it('soumet le formulaire et redirige vers /result', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        letter: 'Voici votre lettre',
        emailVersion: 'Voici votre email',
      }),
    });

    render(<GeneratorForm />);

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
    expect(incrementUsedGenerationsMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/result');
    });
  });

  it('affiche une erreur API si la génération échoue', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'Erreur OpenAI.',
      }),
    });

    render(<GeneratorForm />);

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

  it('bloque la génération quand l’essai gratuit est épuisé', async () => {
    getUsedGenerationsMock.mockReturnValue(1);

    render(<GeneratorForm />);

    expect(
      await screen.findByText(/crédits : 0/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/expliquez le contexte/i), {
      target: { value: 'Je souhaite contester une décision CAF.' },
    });

    fireEvent.click(
      await screen.findByRole('button', {
        name: /générer ma lettre/i,
      })
    );

    expect(
      await screen.findByText(/achetez des crédits ci-dessous/i)
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('consomme un crédit quand l’essai gratuit est épuisé', async () => {
    getUsedGenerationsMock.mockReturnValue(1);
    getPaidCreditsMock.mockReturnValue(1);
    consumePaidCreditMock.mockReturnValue(0);

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        letter: 'Voici votre lettre avec crédit',
        emailVersion: 'Voici votre email avec crédit',
      }),
    });

    render(<GeneratorForm />);

    fireEvent.change(screen.getByPlaceholderText(/expliquez le contexte/i), {
      target: { value: 'Je souhaite contester une décision CAF.' },
    });

    fireEvent.click(
      await screen.findByRole('button', {
        name: /générer ma lettre/i,
      })
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/result');
    });

    expect(incrementUsedGenerationsMock).not.toHaveBeenCalled();
    expect(consumePaidCreditMock).toHaveBeenCalledTimes(1);
  });
});