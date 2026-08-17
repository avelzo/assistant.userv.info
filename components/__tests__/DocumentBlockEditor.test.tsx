import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentBlockEditor } from '@/components/dossiers/DocumentBlockEditor';

const block = {
  id: 'block-1',
  type: 'paragraph' as const,
  text: 'Je vous demande la restitution du dépôt de garantie.',
};

function selectAll(textarea: HTMLTextAreaElement) {
  textarea.focus();
  textarea.setSelectionRange(0, textarea.value.length);
  fireEvent.mouseUp(textarea);
}

describe('DocumentBlockEditor menu sélection', () => {
  it('ferme le menu via la croix, Escape, clic extérieur et après succès', async () => {
    const onRewrite = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <div>
        <button type="button">Dehors</button>
        <DocumentBlockEditor
          block={block}
          rewriteCost={3}
          onChange={vi.fn()}
          onRewrite={onRewrite}
        />
      </div>
    );

    selectAll(screen.getByRole('textbox') as HTMLTextAreaElement);
    expect(screen.getByRole('dialog', { name: /actions sur la sélection/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /fermer le menu/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    selectAll(screen.getByRole('textbox') as HTMLTextAreaElement);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    selectAll(screen.getByRole('textbox') as HTMLTextAreaElement);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Dehors' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    selectAll(screen.getByRole('textbox') as HTMLTextAreaElement);
    fireEvent.click(screen.getByRole('button', { name: /reformuler/i }));
    await waitFor(() => {
      expect(onRewrite).toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    selectAll(screen.getByRole('textbox') as HTMLTextAreaElement);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    window.dispatchEvent(new CustomEvent('assistant:selection-menu', { detail: { blockId: 'block-2' } }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    rerender(
      <DocumentBlockEditor
        block={{ ...block, id: 'block-1', text: block.text }}
        rewriteCost={3}
        onChange={vi.fn()}
        onRewrite={onRewrite}
      />
    );
  });
});
