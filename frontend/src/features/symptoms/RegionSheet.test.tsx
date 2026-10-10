import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MotionProvider } from '../../app/MotionProvider';
import { RegionSheet } from './RegionSheet';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <MotionProvider>
      <button type="button" onClick={() => setOpen(true)}>
        Bölgeye göre keşfet
      </button>
      <RegionSheet open={open} onClose={() => setOpen(false)}>
        Vücut bölgeleri
      </RegionSheet>
    </MotionProvider>
  );
}

describe('RegionSheet', () => {
  it('opens a 70vh modal and restores focus after Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Bölgeye göre keşfet' });
    await user.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'Bölgeye göre keşfet' });
    expect(dialog).toHaveClass('h-[70vh]');
    expect(screen.getByRole('button', { name: 'Kapat' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
});
