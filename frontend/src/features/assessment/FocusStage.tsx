import { useEffect, useReducer, useRef, useState } from 'react';
import * as m from 'motion/react-m';
import { AnimatePresence } from 'motion/react';
import { RegionSheet } from '../symptoms/RegionSheet';
import { ResultScene } from './ResultScene';
import { StatusMessage } from '../../components/ui/StatusMessage';
import { errorMessage } from '../../lib/api/client';
import { usePredict } from '../../lib/api/queries';
import { CLIP, DUR, EASE, UNCLIPPED, shutter, useMotionLevel } from '../../lib/motion';
import { DESKTOP_QUERY, useMediaQuery } from '../../lib/useMediaQuery';
import { HistoryDrawer } from '../history/HistoryDrawer';
import { RegionPicker } from '../symptoms/RegionPicker';
import { SelectionTray } from './SelectionTray';
import { SymptomCombobox } from '../symptoms/SymptomCombobox';
import { useSymptomCatalog } from '../symptoms/catalog';
import { PrintReport } from './PrintReport';
import { ReportPanel } from './ReportPanel';
import { MAX_SYMPTOMS, assessmentReducer, initialAssessmentState, isStale } from './state';

const TITLE = 'Hangi belirtileri yaşıyorsunuz?';

/** The opening sequence plays once per page load, not on every remount. */
let introPlayed = false;

function useIntro(): boolean {
  const [play] = useState(() => !introPlayed);
  useEffect(() => {
    introPlayed = true;
  }, []);
  return play;
}

/** Each word of the question rises out of its own mask, one after another. */
function Headline({ compact, play }: { compact: boolean; play: boolean }) {
  const level = useMotionLevel();
  const words = TITLE.split(' ');
  return (
    <h1 id="page-title" className={compact ? 'type-hero-compact' : 'type-hero'}>
      {words.map((word, index) => (
        <span key={word}>
          <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
            <m.span
              className="inline-block"
              initial={play && level === 'full' ? { y: '110%' } : false}
              animate={{ y: 0 }}
              transition={{ duration: DUR.scene, ease: EASE.out, delay: 0.1 + index * 0.09 }}
            >
              {word}
            </m.span>
          </span>
          {index < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </h1>
  );
}

interface FocusStageProps {
  historyOpen: boolean;
  onCloseHistory: () => void;
  onOpenHistory?: () => void;
}

export function FocusStage({ historyOpen, onCloseHistory, onOpenHistory }: FocusStageProps) {
  const [state, dispatch] = useReducer(assessmentReducer, initialAssessmentState);
  const {
    catalog,
    isPending: catalogPending,
    isError: catalogError,
    refetch,
  } = useSymptomCatalog();
  const predict = usePredict();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const level = useMotionLevel();
  const intro = useIntro();
  const [sheetOpen, setSheetOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedHeadingRef = useRef<HTMLHeadingElement>(null);
  const reportHeadingRef = useRef<HTMLHeadingElement>(null);

  const stale = isStale(state);
  const count = state.selected.length;
  const limitReached = count >= MAX_SYMPTOMS;
  const result = state.result;
  const showReport = result !== null;
  /** Scene: the body-map band shows while choosing and after "Belirtileri düzenle". */
  const showRegionBand = isDesktop && (!showReport || state.workspace === 'figure');

  const resultId = result?.request_id;
  useEffect(() => {
    if (resultId) reportHeadingRef.current?.focus();
  }, [resultId]);

  const evaluate = () => {
    if (count === 0 || predict.isPending) return;
    const request = [...state.selected];
    predict.mutate(
      { symptoms: request },
      { onSuccess: (data) => dispatch({ type: 'result', request, result: data }) },
    );
  };

  const editSymptoms = () => {
    dispatch({ type: 'workspace', workspace: 'figure' });
    if (limitReached) selectedHeadingRef.current?.focus();
    else inputRef.current?.focus();
  };

  const regionPicker = (layout: 'wide' | 'compact', figureHeight: number) =>
    catalog ? (
      <RegionPicker
        catalog={catalog}
        selected={state.selected}
        region={state.region}
        onRegionChange={(region) => dispatch({ type: 'region', region })}
        figureView={state.figureView}
        onFigureViewChange={(view) => dispatch({ type: 'figureView', view })}
        onToggleSymptom={(id) => dispatch({ type: 'toggle', id })}
        limitReached={limitReached}
        figureHeight={figureHeight}
        layout={layout}
      />
    ) : null;

  let predictStatus: string | null = null;
  if (predict.isPending) predictStatus = 'Değerlendiriliyor…';
  const predictError = predict.isError
    ? `Değerlendirme yapılamadı. ${errorMessage(predict.error)}${
        predict.error.requestId ? ` İşlem kimliği: ${predict.error.requestId}` : ''
      }`
    : null;

  const report = result ? (
    <ReportPanel
      key={result.request_id}
      ref={reportHeadingRef}
      result={result}
      catalog={catalog}
      stale={stale}
      pending={predict.isPending}
      canReassess={count > 0}
      onReassess={evaluate}
      onEditSymptoms={editSymptoms}
    />
  ) : null;

  // The band folds up into the search line when the report takes the stage.
  const bandMotion =
    level === 'full'
      ? {
          initial: { clipPath: CLIP.fromTop, y: -12 },
          animate: { ...UNCLIPPED, y: 0 },
          exit: { clipPath: CLIP.fromTop, y: -12 },
          transition: { duration: DUR.base, ease: EASE.shutter },
        }
      : level === 'lite'
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: DUR.fast },
          }
        : {};

  return (
    <>
      <main id="main" className="screen-only w-full">
        <section aria-labelledby="page-title">
          <div className="border-b-2 border-ink bg-accent text-on-accent">
            <div
              className={
                showReport
                  ? 'mx-auto flex w-full max-w-shell flex-col gap-3 px-4 py-6 md:px-8'
                  : 'mx-auto flex w-full max-w-shell flex-col gap-6 px-4 pb-10 pt-10 md:px-8 lg:pb-14 lg:pt-16'
              }
            >
              <Headline compact={showReport} play={intro} />
              <m.p
                className="max-w-prose text-base font-medium md:text-lg"
                {...(intro ? shutter(level, 'fromBottom', 0.45) : {})}
              >
                Belirti adını yazarak arayın ya da vücut haritasından bir bölge seçin. En fazla{' '}
                {MAX_SYMPTOMS} belirti seçebilirsiniz.
              </m.p>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-shell flex-col gap-8 px-4 py-8 md:px-8 lg:py-10">
            <m.div className="max-w-3xl" {...(intro ? shutter(level, 'fromLeft', 0.55) : {})}>
              {catalog ? (
                <SymptomCombobox
                  ref={inputRef}
                  catalog={catalog}
                  selected={state.selected}
                  region={state.region}
                  onAdd={(id) => dispatch({ type: 'add', id })}
                  onClearRegion={() => dispatch({ type: 'region', region: null })}
                  limitReached={limitReached}
                />
              ) : (
                <div>
                  <StatusMessage>
                    {catalogPending ? 'Belirti listesi yükleniyor…' : null}
                  </StatusMessage>
                  <StatusMessage tone="error">
                    {catalogError
                      ? 'Belirti listesi yüklenemedi. Sunucu bağlantısını kontrol edin.'
                      : null}
                  </StatusMessage>
                  {catalogError ? (
                    <button type="button" className="btn-secondary" onClick={() => void refetch()}>
                      Yeniden dene
                    </button>
                  ) : null}
                </div>
              )}
            </m.div>
            {!isDesktop && catalog ? (
              <button
                type="button"
                className="btn-secondary self-start"
                onClick={() => setSheetOpen(true)}
              >
                Bölgeye göre keşfet
              </button>
            ) : null}
            <StatusMessage>{predictStatus}</StatusMessage>
            <StatusMessage tone="error">{predictError}</StatusMessage>

            <AnimatePresence initial={false}>
              {showRegionBand && catalog ? (
                <m.div key="region-band" aria-label="Çalışma alanı" role="region" {...bandMotion}>
                  {regionPicker('wide', 400)}
                </m.div>
              ) : null}
            </AnimatePresence>

            {showReport ? <ResultScene report={report} /> : null}

            {result ? (
              <div className="flex flex-wrap gap-3 border-t-2 border-ink pt-6">
                <button type="button" className="btn-secondary" onClick={() => window.print()}>
                  Yazdır / PDF olarak kaydet
                </button>
                {onOpenHistory ? (
                  <button type="button" className="btn-quiet" onClick={onOpenHistory}>
                    Geçmiş
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
        <SelectionTray
          headingRef={selectedHeadingRef}
          catalog={catalog}
          selected={state.selected}
          onRemove={(id) => dispatch({ type: 'remove', id })}
          onClear={() => dispatch({ type: 'clear' })}
          pending={predict.isPending}
          onEvaluate={evaluate}
        />
      </main>
      <RegionSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        {regionPicker('compact', 300)}
      </RegionSheet>
      {result ? <PrintReport result={result} catalog={catalog} stale={stale} /> : null}
      <HistoryDrawer
        open={historyOpen}
        onClose={onCloseHistory}
        catalog={catalog}
        onLoadSymptoms={(ids) => dispatch({ type: 'replace', ids })}
      />
    </>
  );
}
