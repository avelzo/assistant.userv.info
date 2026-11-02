import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderAuthButton } from '@/components/HeaderAuthButton';

const auth = vi.hoisted(() => ({
  role: 'user',
  connected: true,
  signOut: vi.fn(),
  clearStorage: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  useAuthSession: () => ({
    data: auth.connected ? { user: { name: 'Camille', role: auth.role } } : null,
    status: auth.connected ? 'authenticated' : 'unauthenticated',
  }),
  authClient: { signOut: auth.signOut },
}));

vi.mock('@/lib/storage', () => ({ clearStorageOnSignOut: auth.clearStorage }));

describe('HeaderAuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.role = 'user';
    auth.connected = true;
  });

  it('ouvre et referme le menu au clic sans donner le focus au bouton, comme sur Safari iOS', () => {
    render(<HeaderAuthButton />);
    const button = screen.getByRole('button', { name: /ouvrir le menu du compte/i });

    expect(screen.queryByRole('navigation', { name: 'Menu du compte' })).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);

    expect(button).not.toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Menu du compte' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Mes dossiers' })).toHaveAttribute('href', '/dossiers');
    expect(screen.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Menu du compte' })).not.toBeInTheDocument();
  });

  it('se ferme lorsqu’on touche l’extérieur', () => {
    render(<HeaderAuthButton />);
    const button = screen.getByRole('button', { name: /ouvrir le menu du compte/i });
    fireEvent.click(button);
    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('permet la navigation au clavier et rend le focus au bouton avec Échap', async () => {
    const user = userEvent.setup();
    render(<HeaderAuthButton />);
    const button = screen.getByRole('button', { name: /ouvrir le menu du compte/i });

    await user.tab();
    await user.keyboard('{Enter}');
    await user.tab();
    expect(screen.getByRole('link', { name: 'Mes dossiers' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.keyboard(' ');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await user.tab({ shift: true });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('referme le menu après le choix d’un lien', () => {
    render(<HeaderAuthButton />);
    const button = screen.getByRole('button', { name: /ouvrir le menu du compte/i });
    fireEvent.click(button);
    const link = screen.getByRole('link', { name: 'Compte' });
    link.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(link);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('conserve le lien administrateur et la déconnexion', () => {
    auth.role = 'admin';
    render(<HeaderAuthButton />);
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu du compte/i }));
    expect(screen.getByRole('link', { name: 'Administration' })).toHaveAttribute('href', '/admin');
    fireEvent.click(screen.getByRole('button', { name: 'Déconnexion' }));
    expect(auth.clearStorage).toHaveBeenCalledOnce();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it('propose la connexion lorsque la session est absente', () => {
    auth.connected = false;
    render(<HeaderAuthButton />);
    expect(screen.getByRole('link', { name: 'Connexion' })).toHaveAttribute('href', '/auth/login');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
