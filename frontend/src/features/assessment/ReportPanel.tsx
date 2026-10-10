import { forwardRef, useId } from 'react';
import type { PredictResponse } from '../../lib/api/schemas';
import { formatDateTime, formatScore } from '../../lib/format';
import { Icon } from '../../components/ui/Icon';
import type { SymptomCatalog } from '../symptoms/catalog';
import { symptomLabel } from '../symptoms/catalog';
import { Disclaimer } from './Disclaimer';
import { PrecautionList } from './PrecautionList';
import { ProbabilityRuler, RULER_NOTE } from './ProbabilityRuler';
import { StaleBanner } from './StaleBanner';
import { TechnicalDetails } from './TechnicalDetails';

export const HOSPITAL_SEARCH_URL = 'https://www.google.com/maps/search/hastane';

interface ReportPanelProps {
  result: PredictResponse;
  catalog: SymptomCatalog | null;
  stale: boolean;
  pending: boolean;
  canReassess: boolean;
  onReassess: () => void;
  onEditSymptoms: () => void;
}

export const ReportPanel = forwardRef<HTMLHeadingElement, ReportPanelProps>(function ReportPanel(
  { result, catalog, stale, pending, canReassess, onReassess, onEditSymptoms },
  headingRef,
) {
  const rulerHeadingId = useId();
  const top = result.top_prediction;
  const inputLabels = result.input.symptoms.map((id) => symptomLabel(catalog, id));

  return (
    <article aria-labelledby="report-heading" className="enter-report flex flex-col gap-8">
      {stale ? (
        <StaleBanner onReassess={onReassess} pending={pending} disabled={!canReassess} />
      ) : null}

      <header className="flex flex-col gap-3">
        <h2
          id="report-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-serif text-lg font-semibold focus:outline-none focus-visible:outline-2"
        >
          Ön değerlendirme
        </h2>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-muted">Tarih</dt>
          <dd>
            <time dateTime={result.created_at}>{formatDateTime(result.created_at)}</time>
          </dd>
          <dt className="text-ink-muted">İşlem kimliği</dt>
          <dd className="break-all">{result.request_id}</dd>
          <dt className="text-ink-muted">Belirtiler</dt>
          <dd>{inputLabels.join(', ')}</dd>
        </dl>
      </header>

      <section aria-label="En yüksek skorlu sonuç" className="flex flex-col gap-3">
        <h3 className="font-serif text-xl font-semibold">{top.name}</h3>
        <p className="text-base font-medium">Model skoru {formatScore(top.probability)}</p>
        {top.description ? (
          <p className="max-w-prose text-base text-ink">{top.description}</p>
        ) : null}
      </section>

      <section aria-labelledby={rulerHeadingId}>
        <h3 id={rulerHeadingId} className="text-base font-medium">
          Model skorları
        </h3>
        <ProbabilityRuler predictions={result.predictions} className="mt-2" />
        <p className="mt-3 max-w-prose text-sm text-ink-muted">{RULER_NOTE}</p>
      </section>

      <PrecautionList precautions={top.precautions} />

      <TechnicalDetails result={result} />

      <Disclaimer />

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          <Icon name="print" />
          Yazdır / PDF olarak kaydet
        </button>
        <a
          className="btn-secondary"
          href={HOSPITAL_SEARCH_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="pin" />
          En yakın hastaneyi göster
          <span className="sr-only"> (yeni sekmede açılır)</span>
        </a>
        <button type="button" className="btn-quiet" onClick={onEditSymptoms}>
          Belirtileri düzenle
        </button>
      </div>
    </article>
  );
});
