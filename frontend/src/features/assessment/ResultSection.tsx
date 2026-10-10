import * as m from 'motion/react-m';
import { forwardRef, useId } from 'react';
import type { PredictResponse } from '../../lib/api/schemas';
import { formatDateTime, formatScore } from '../../lib/format';
import { reveal, useMotionLevel } from '../../lib/motion';
import { Icon } from '../../components/ui/Icon';
import type { SymptomCatalog } from '../symptoms/catalog';
import { symptomLabel } from '../symptoms/catalog';
import { Disclaimer } from './Disclaimer';
import { FocusFrame } from './FocusFrame';
import { PrecautionList } from './PrecautionList';
import { ScoreList, RULER_NOTE } from './ScoreList';
import { StaleBanner } from './StaleBanner';
import { TechnicalDetails } from './TechnicalDetails';

export const HOSPITAL_SEARCH_URL = 'https://www.google.com/maps/search/hastane';

interface ResultSectionProps {
  result: PredictResponse;
  catalog: SymptomCatalog | null;
  stale: boolean;
  pending: boolean;
  canReassess: boolean;
  /** The focus window rests on the result heading. */
  framed: boolean;
  onReassess: () => void;
  onEditSymptoms: () => void;
}

/**
 * The result below the workspace, in one 60ch reading column. The heading is never faded so
 * the arriving focus window stays visible; the body fades in and the score bars fill. The
 * warning sits outside every animated layer.
 */
export const ResultSection = forwardRef<HTMLHeadingElement, ResultSectionProps>(
  function ResultSection(
    { result, catalog, stale, pending, canReassess, framed, onReassess, onEditSymptoms },
    headingRef,
  ) {
    const rulerHeadingId = useId();
    const level = useMotionLevel();
    const top = result.top_prediction;
    const lowScore = top.probability < 0.01;
    const inputLabels = result.input.symptoms.map((id) => symptomLabel(catalog, id));

    return (
      <section aria-label="Sonuç" className="mx-auto w-full max-w-reading scroll-mt-6">
        <article aria-labelledby="report-heading" className="flex flex-col gap-8">
          {stale ? (
            <StaleBanner onReassess={onReassess} pending={pending} disabled={!canReassess} />
          ) : null}

          <header className="relative flex flex-col gap-3 rounded-frame px-6 py-6 sm:px-8">
            {framed ? <FocusFrame place="result" /> : null}
            <h2
              id="report-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-base font-semibold text-ink-muted focus:outline-none focus-visible:outline-2"
            >
              Ön değerlendirme
            </h2>
            <section aria-label="En yüksek skorlu sonuç" className="flex flex-col gap-2">
              <h3 className="type-disease">{top.name}</h3>
              <p className="text-lg">
                <span className="text-ink-muted">Model skoru</span>{' '}
                <span className="tabular font-semibold">{formatScore(top.probability)}</span>
              </p>
            </section>
          </header>

          <m.div className="flex flex-col gap-8" {...reveal(level)}>
            <section aria-labelledby={rulerHeadingId} className="flex flex-col gap-4">
              <h3 id={rulerHeadingId} className="type-heading">
                Model skorları
              </h3>
              <ScoreList predictions={result.predictions} />
              <p
                className={
                  lowScore
                    ? 'flex gap-2 text-sm font-semibold text-uncertainty'
                    : 'text-sm text-ink-muted'
                }
              >
                {lowScore ? <Icon name="alert" size={18} className="mt-0.5 shrink-0" /> : null}
                <span>{RULER_NOTE}</span>
              </p>
            </section>

            {top.description ? (
              <p className="font-serif text-lg leading-8">{top.description}</p>
            ) : null}

            <PrecautionList precautions={top.precautions} />

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
              <dt className="text-ink-muted">Tarih</dt>
              <dd>
                <time dateTime={result.created_at}>{formatDateTime(result.created_at)}</time>
              </dd>
              <dt className="text-ink-muted">Belirtiler</dt>
              <dd>{inputLabels.join(', ')}</dd>
            </dl>

            <TechnicalDetails result={result} />
          </m.div>

          <Disclaimer />

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-secondary" onClick={onEditSymptoms}>
              <Icon name="edit" size={18} />
              Belirtileri düzenle
            </button>
            {!stale ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={onReassess}
                disabled={pending || !canReassess}
              >
                <Icon name="refresh" size={18} />
                {pending ? 'Değerlendiriliyor…' : 'Yeniden değerlendir'}
              </button>
            ) : null}
            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              <Icon name="print" size={18} />
              Yazdır / PDF olarak kaydet
            </button>
            <a
              className="btn-secondary"
              href={HOSPITAL_SEARCH_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="pin" size={18} />
              En yakın hastaneyi göster
              <span className="sr-only"> (yeni sekmede açılır)</span>
            </a>
          </div>
        </article>
      </section>
    );
  },
);
