import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LetterHistoryCard } from '@/components/LetterHistoryCard';

let sessionStatusMock: 'authenticated' | 'unauthenticated' | 'loading' = 'authenticated';
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    status: sessionStatusMock,
  }),
}));

describe('LetterHistoryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStatusMock = 'authenticated';
    pushMock.mockReset();
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          generations: [
            {
              id: 'gen-1',
              category: 'CAF',
              recipient: 'CAF de Paris',
              subject: 'Réexamen du dossier',
              detailsPreview: 'Je souhaite demander un réexamen de ma situation.',
              letter: 'Voici le courrier généré.',
              emailVersion: 'Voici la version email.',
              createdAt: '2026-04-05T10:30:00.000Z',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )) as typeof fetch;
  });

  it('affiche un lien pour visualiser le courrier et l’email', async () => {
    render(<LetterHistoryCard />);

    expect(
      await screen.findByRole('table', { name: /historique des lettres générées/i })
    ).toBeInTheDocument();

    expect(screen.getByText('CAF')).toBeInTheDocument();
    expect(screen.getByText('CAF de Paris')).toBeInTheDocument();
    expect(screen.getByText('Réexamen du dossier')).toBeInTheDocument();

    const viewButton = screen.getByRole('button', {
      name: /voir courrier \+ email/i,
    });
    fireEvent.click(viewButton);

    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      'generated-letter',
      'Voici le courrier généré.'
    );
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      'generated-email',
      'Voici la version email.'
    );
    expect(pushMock).toHaveBeenCalledWith('/result');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/account', { method: 'GET' });
    });
  });
});