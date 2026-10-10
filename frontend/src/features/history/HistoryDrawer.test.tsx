import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HistoryDrawer } from './HistoryDrawer';
import { renderWithClient, testCatalog } from '../../test/utils';

function renderDrawer(onLoadSymptoms = vi.fn(), onClose = vi.fn()) {
  const utils = renderWithClient(
    <HistoryDrawer open onClose={onClose} catalog={testCatalog} onLoadSymptoms={onLoadSymptoms} />,
  );
  return { ...utils, onLoadSymptoms, onClose };
}

describe('HistoryDrawer', () => {
  it('lists server history with labels and scores', async () => {
    renderDrawer();
    const dialog = screen.getByRole('dialog', { name: 'Geçmiş' });
    const list = await within(dialog).findByRole('list', { name: 'Geçmiş değerlendirmeler' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Sıtma');
    expect(items[0]).toHaveTextContent('Model skoru %38');
    expect(items[0]).toHaveTextContent('Baş Ağrısı');
    expect(items[1]).toHaveTextContent('Model skoru <%1');
  });

  it('deletes a single entry', async () => {
    const { user } = renderDrawer();
    const list = await screen.findByRole('list', { name: 'Geçmiş değerlendirmeler' });
    await user.click(within(list).getByRole('button', { name: /Sıtma kaydını sil/ }));
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1));
    expect(screen.queryByText('Sıtma')).not.toBeInTheDocument();
  });

  it('clears everything after confirmation', async () => {
    const { user } = renderDrawer();
    await screen.findByRole('list', { name: 'Geçmiş değerlendirmeler' });
    await user.click(screen.getByRole('button', { name: 'Geçmişi temizle' }));
    expect(screen.getByText('Tüm kayıtlar silinsin mi?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tümünü sil' }));
    expect(await screen.findByText('Henüz kayıtlı değerlendirme yok.')).toBeInTheDocument();
  });

  it('loads the symptoms of an entry and closes', async () => {
    const { user, onLoadSymptoms, onClose } = renderDrawer();
    const list = await screen.findByRole('list', { name: 'Geçmiş değerlendirmeler' });
    const [first] = within(list).getAllByRole('button', { name: 'Belirtileri yükle' });
    await user.click(first!);
    expect(onLoadSymptoms).toHaveBeenCalledWith(['headache', 'high_fever', 'chills']);
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape and focuses the close button on open', async () => {
    const { user, onClose } = renderDrawer();
    expect(screen.getByRole('button', { name: 'Kapat' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
