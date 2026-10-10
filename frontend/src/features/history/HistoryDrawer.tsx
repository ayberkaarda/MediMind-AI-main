import { useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { StatusMessage } from '../../components/ui/StatusMessage';
import { errorMessage } from '../../lib/api/client';
import { useClearHistory, useDeleteHistoryItem, useHistory } from '../../lib/api/queries';
import type { HistoryItem } from '../../lib/api/schemas';
import { formatDateShort, formatScore } from '../../lib/format';
import type { SymptomCatalog } from '../symptoms/catalog';
import { symptomLabel } from '../symptoms/catalog';

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  catalog: SymptomCatalog | null;
  onLoadSymptoms: (symptoms: string[]) => void;
}

function HistoryEntry({
  item,
  catalog,
  onLoad,
  onDelete,
  deleting,
}: {
  item: HistoryItem;
  catalog: SymptomCatalog | null;
  onLoad: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const labels = item.symptoms.map((id) => symptomLabel(catalog, id));
  return (
    <li className="border-b border-line py-5 last:border-b-0">
      <p className="text-sm text-ink-muted">
        <time dateTime={item.created_at}>{formatDateShort(item.created_at)}</time>
      </p>
      <p className="type-heading mt-1">{item.top_disease_name}</p>
      <p className="mt-1 text-sm">
        <span className="text-ink-muted">Model skoru</span>{' '}
        <span className="tabular font-semibold">{formatScore(item.probability)}</span>
      </p>
      <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{labels.join(', ')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary text-sm" onClick={onLoad}>
          Belirtileri yükle
        </button>
        <button
          type="button"
          className="btn-quiet text-sm"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`${formatDateShort(item.created_at)} tarihli ${item.top_disease_name} kaydını sil`}
        >
          Sil
        </button>
      </div>
    </li>
  );
}

export function HistoryDrawer({ open, onClose, catalog, onLoadSymptoms }: HistoryDrawerProps) {
  const history = useHistory(open);
  const deleteItem = useDeleteHistoryItem();
  const clearAll = useClearHistory();
  const [confirmClear, setConfirmClear] = useState(false);

  const items = history.data?.pages.flatMap((page) => page.items) ?? [];
  const total = history.data?.pages[0]?.total;
  const mutationError = deleteItem.error ?? clearAll.error;

  const close = () => {
    setConfirmClear(false);
    onClose();
  };

  const footer =
    items.length > 0 ? (
      confirmClear ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm">Tüm kayıtlar silinsin mi?</p>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => setConfirmClear(false)}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className="btn-secondary border-error text-sm text-error"
            disabled={clearAll.isPending}
            onClick={() => clearAll.mutate(undefined, { onSuccess: () => setConfirmClear(false) })}
          >
            Tümünü sil
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn-quiet -ml-3 text-sm"
          onClick={() => setConfirmClear(true)}
        >
          Geçmişi temizle
        </button>
      )
    ) : undefined;

  return (
    <Drawer open={open} title="Geçmiş" onClose={close} footer={footer}>
      <p className="text-sm text-ink-muted">
        Bu tarayıcıdan yapılan değerlendirmeler. Kayıtlar anonim bir tarayıcı kimliğiyle saklanır.
      </p>

      {total !== undefined ? <p className="mt-2 text-sm text-ink-muted">{total} kayıt</p> : null}

      <StatusMessage className="mt-3">
        {history.isPending ? 'Geçmiş yükleniyor…' : null}
      </StatusMessage>
      <StatusMessage tone="error">
        {history.isError ? `Geçmiş yüklenemedi. ${errorMessage(history.error)}` : null}
        {mutationError ? `Kayıt silinemedi. ${errorMessage(mutationError)}` : null}
      </StatusMessage>

      {history.isSuccess && items.length === 0 ? (
        <p className="mt-6 text-base">Henüz kayıtlı değerlendirme yok.</p>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-2" aria-label="Geçmiş değerlendirmeler">
          {items.map((item) => (
            <HistoryEntry
              key={item.id}
              item={item}
              catalog={catalog}
              deleting={deleteItem.isPending && deleteItem.variables === item.id}
              onDelete={() => deleteItem.mutate(item.id)}
              onLoad={() => {
                onLoadSymptoms(item.symptoms);
                close();
              }}
            />
          ))}
        </ul>
      ) : null}
      {history.hasNextPage ? (
        <button
          type="button"
          className="btn-secondary mt-4 text-sm"
          disabled={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
        >
          Daha fazla yükle
        </button>
      ) : null}
    </Drawer>
  );
}
