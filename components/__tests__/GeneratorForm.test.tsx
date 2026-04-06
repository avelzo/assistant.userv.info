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

const getPaidCreditsMock = vi.mocked(storage.getPaidCredits);
const consumePaidCreditMock = vi.mocked(storage.consumePaidCredit);
const addCreditHistoryEntryMock = vi.mocked(storage.addCreditHistoryEntry);

describe('GeneratorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock = null;
    sessionStatusMock = 'unauthenticated';

    getPaidCreditsMock.mockReturnValue(0);
    consumePaidCreditMock.mockReturnValue(0);
    addCreditHistoryEntryMock.mockReturnValue([]);

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
      json: async () => ({ freeGenerationsRemaining: 1, paidCredits: 0 }),
    });

    render(<GeneratorForm />);

    const fullNameInput = await screen.findByDisplayValue('Laurent Hunaut');
    expect(fullNameInput).toBeInTheDocument();
  });

  it('soumet le formulaire et redirige vers /result', async () => {
    getPaidCreditsMock.mockReturnValue(1);

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
    expect(consumePaidCreditMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/result');
    });
  });

  it('affiche une erreur API si la génération échoue', async () => {
    getPaidCreditsMock.mockReturnValue(1);

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
    expect(pushMock).toHaveBeenCalledWith('/pricing');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('consomme un crédit local et journalise l’action côté invité', async () => {
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

    expect(consumePaidCreditMock).toHaveBeenCalledTimes(1);
    expect(addCreditHistoryEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'consume',
        credits: 1,
        source: 'generation',
      })
    );
  });

  it('utilise remainingCredits renvoyé par l’API sans consommer localement', async () => {
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
        json: async () => ({ freeGenerationsRemaining: 0, paidCredits: 2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          letter: 'Lettre générée',
          emailVersion: 'Email généré',
          remainingCredits: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ freeGenerationsRemaining: 0, paidCredits: 1 }),
      });

    render(<GeneratorForm />);

    await screen.findByText(/crédits : 2/i);

    fireEvent.change(screen.getByPlaceholderText(/expliquez le contexte/i), {
      target: { value: 'Je souhaite faire une relance.' },
    });

    fireEvent.click(
      await screen.findByRole('button', {
        name: /générer ma lettre/i,
      })
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/result');
    });

    expect(consumePaidCreditMock).not.toHaveBeenCalled();
    expect(addCreditHistoryEntryMock).not.toHaveBeenCalled();
  });
});