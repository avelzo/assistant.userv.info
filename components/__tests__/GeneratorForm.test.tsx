import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { GeneratorForm } from '@/components/GeneratorForm';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/lib/constants', () => ({
  CATEGORIES: ['CAF', 'Assurance', 'Résiliation'],
  TONES: ['Standard', 'Ferme'],
}));

vi.mock('@/lib/storage', () => ({
  FREE_GENERATIONS: 1,
  getUsedGenerations: vi.fn(() => 0),
  incrementUsedGenerations: vi.fn(() => 1),
  isPremiumUnlocked: vi.fn(() => false),
}));

describe('GeneratorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

    fireEvent.click(button);

    expect(
      await screen.findByText(/veuillez décrire la situation/i)
    ).toBeInTheDocument();
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

    fireEvent.click(
      await screen.findByRole('button', { name: /générer ma lettre/i })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

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

    fireEvent.click(
      await screen.findByRole('button', { name: /générer ma lettre/i })
    );

    expect(await screen.findByText(/erreur openai/i)).toBeInTheDocument();
  });
});