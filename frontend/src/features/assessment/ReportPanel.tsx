import * as m from 'motion/react-m';
import { forwardRef, useId } from 'react';
import type { PredictResponse } from '../../lib/api/schemas';
import { formatDateTime, formatScore } from '../../lib/format';
import { shutter, useMotionLevel } from '../../lib/motion';
import { Icon } from '../../components/ui/Icon';
import type { SymptomCatalog } from '../symptoms/catalog';
import { symptomLabel } from '../symptoms/catalog';
import { Disclaimer } from './Disclaimer';
import { PrecautionList } from './PrecautionList';
import { ScoreList, RULER_NOTE } from './ScoreList';
import { StaleBanner } from './StaleBanner';
import { TechnicalDetails } from './TechnicalDetails';
import { ReportReveal } from './ResultScene';

export const HOSPITAL_SEARCH_URL = 'https://www.google.com/maps/search/hastane';

/** Text blocks rise in after the curtain has uncovered them. */
const TEXT_DELAY = 0.55;

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
  const level = useMotionLevel();
  const top = result.top_prediction;
  const inputLabels = result.input.symptoms.map((id) => symptomLabel(catalog, id));

  return (
    <article aria-labelledby="report-heading" className="flex flex-col gap-10">
      {/* The warning and the score note are never animated and never covered. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-8">
        <Disclaimer className="md:flex-1" />
        <p
          className={
            top.probability < 0.01
              ? 'max-w-prose text-sm font-semibold text-uncertainty md:flex-1 md:pt-3'
              : 'max-w-prose text-sm text-ink-muted md:flex-1 md:pt-3'
          }
        >
          {RULER_NOTE}
        </p>
      </div>
      <ReportReveal>
        {stale ? (
          <StaleBanner onReassess={onReassess} pending={pending} disabled={!canReassess} />
        ) : null}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <header className="flex flex-col gap-4 lg:col-span-4">
            <h2
              id="report-heading"
              ref={headingRef}
              tabIndex={-1}
              className="type-title focus:outline-none focus-visible:outline-2"
            >
              Ön değerlendirme
            </h2>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t-2 border-ink pt-3 text-sm">
              <dt className="font-semibold">Tarih</dt>
              <dd>
                <time dateTime={result.created_at}>{formatDateTime(result.created_at)}</time>
              </dd>
              <dt className="font-semibold">İşlem kimliği</dt>
              <dd className="break-all">{result.request_id}</dd>
              <dt className="font-semibold">Belirtiler</dt>
              <dd>{inputLabels.join(', ')}</dd>
            </dl>
          </header>

          <div className="flex min-w-0 flex-col gap-10 lg:col-span-8">
            <section aria-label="En yüksek skorlu sonuç" className="flex flex-col gap-4">
              <h3 className="type-disease">{top.name}</h3>
              <p className="self-start border-2 border-ink px-3 py-1 text-sm font-bold tabular-nums">
                Model skoru {formatScore(top.probability)}
              </p>
            </section>

            <section aria-labelledby={rulerHeadingId}>
              <h3 id={rulerHeadingId} className="type-section pb-2">
                Model skorları
              </h3>
              <ScoreList predictions={result.predictions} />
            </section>

            {top.description ? (
              <m.p
                className="max-w-prose text-lg text-ink"
                {...shutter(level, 'fromBottom', TEXT_DELAY)}
              >
                {top.description}
              </m.p>
            ) : null}

            <m.div {...shutter(level, 'fromBottom', TEXT_DELAY + 0.08)}>
              <PrecautionList precautions={top.precautions} />
            </m.div>

            <TechnicalDetails result={result} />

            <div className="flex flex-wrap gap-3">
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
          </div>
        </div>
      </ReportReveal>
    </article>
  );
});
