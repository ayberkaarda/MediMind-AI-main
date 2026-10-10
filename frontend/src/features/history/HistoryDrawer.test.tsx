import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import historyFixture from '../../test/fixtures/history.json';
import { HistoryDrawer } from './HistoryDrawer';
import { renderWithClient, testCatalog } from '../../test/utils';

function renderDrawer(onLoadSymptoms = vi.fn(), onClose = vi.fn()) {
  const utils = renderWithClient(
    <HistoryDrawer open onClose={onClose} catalog={testCatalog} onLoadSymptoms={onLoadSymptoms} />,
  );
  return { ...utils, onLoadSymptoms, onClose };
}

describe('HistoryDrawer', () => {
  it('loads the next page at offset 50 and hides the button when complete', async () => {
    const offsets: number[] = [];
    const first = historyFixture.items[0]!;
    const records = Array.from({ length: 51 }, (_, index) => ({
      ...first,
      id: `a1b2c3d4-0000-4000-8000-${String(index).padStart(12, '0')}`,
    }));
    server.use(
      http.get('*/api/v1/history', ({ request }) => {
        const url = new URL(request.url);
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const limit = Number(url.searchParams.get('limit'));
        offsets.push(offset);
        return HttpResponse.json({
          items: records.slice(offset, offset + limit),
          total: records.length,
        });
      }),
    );
    const { user } = renderDrawer();
    const button = await screen.findByRole('button', { name: 'Daha fazla yükle' });
    expect(screen.getByText('51 kayıt')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Geçmiş değerlendirmeler' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(50);
    await user.click(button);
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(51));
    expect(offsets).toEqual([0, 50]);
    expect(screen.queryByRole('button', { name: 'Daha fazla yükle' })).not.toBeInTheDocument();
  });

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
