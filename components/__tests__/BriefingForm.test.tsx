import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BriefingForm } from '@/components/BriefingForm';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('BriefingForm', () => {
  beforeEach(() => {
    pushMock.mockReset();
    global.fetch = vi.fn();
  });

  it('crée un dossier puis redirige vers /dossiers/[id]', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ dossier: { id: '507f1f77bcf86cd799439011' } }), { status: 201 })
    );

    render(<BriefingForm />);
    fireEvent.change(screen.getByPlaceholderText(/850/i), {
      target: { value: 'Je veux récupérer mon dépôt de garantie.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /créer mon dossier/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/dossiers',
        expect.objectContaining({ method: 'POST' })
      );
      expect(pushMock).toHaveBeenCalledWith('/dossiers/507f1f77bcf86cd799439011');
    });
  });
});
