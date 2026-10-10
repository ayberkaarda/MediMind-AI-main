import { useEffect, useReducer, useRef, useState } from 'react';
import { RegionSheet } from '../symptoms/RegionSheet';
import { ResultScene } from './ResultScene';
import { StatusMessage } from '../../components/ui/StatusMessage';
import { errorMessage } from '../../lib/api/client';
import { usePredict } from '../../lib/api/queries';
import { DESKTOP_QUERY, useMediaQuery } from '../../lib/useMediaQuery';
import { HistoryDrawer } from '../history/HistoryDrawer';
import { RegionPicker } from '../symptoms/RegionPicker';
import { SelectionTray } from './SelectionTray';
import { SymptomCombobox } from '../symptoms/SymptomCombobox';
import { useSymptomCatalog } from '../symptoms/catalog';
import { PrintReport } from './PrintReport';
import { ReportPanel } from './ReportPanel';
import { MAX_SYMPTOMS, assessmentReducer, initialAssessmentState, isStale } from './state';

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [firstSelection, setFirstSelection] = useState(false);
  useEffect(() => {
    if (state.selected.length > 0) setFirstSelection(true);
  }, [state.selected.length]);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedHeadingRef = useRef<HTMLHeadingElement>(null);
  const reportHeadingRef = useRef<HTMLHeadingElement>(null);

  const stale = isStale(state);
  const count = state.selected.length;
  const limitReached = count >= MAX_SYMPTOMS;
  const result = state.result;
  const showReport = result !== null;

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

  const tray = (
    <SelectionTray
      headingRef={selectedHeadingRef}
      catalog={catalog}
      selected={state.selected}
      onRemove={(id) => dispatch({ type: 'remove', id })}
      onClear={() => dispatch({ type: 'clear' })}
      pending={predict.isPending}
      onEvaluate={evaluate}
    />
  );

  const resultActions = result ? (
    <div className="flex flex-wrap gap-3">
      <button type="button" className="btn-secondary" onClick={() => window.print()}>
        Yazdır / PDF olarak kaydet
      </button>
      {onOpenHistory ? (
        <button type="button" className="btn-quiet" onClick={onOpenHistory}>
          Geçmiş
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <main id="main" className="screen-only mx-auto w-full max-w-shell px-4 py-10 md:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section
            aria-labelledby="page-title"
            className={
              showReport ? 'flex flex-col gap-6 lg:col-span-8' : 'flex flex-col gap-6 lg:col-span-7'
            }
          >
            <h1 id="page-title" className="font-serif text-xl font-semibold md:text-2xl">
              Hangi belirtileri yaşıyorsunuz?
            </h1>
            <p className="max-w-prose text-ink-muted">
              Belirti adını yazarak arayın ya da vücut haritasından bir bölge seçin. En fazla{' '}
              {MAX_SYMPTOMS} belirti seçebilirsiniz.
            </p>
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
            {!isDesktop && catalog ? (
              <button type="button" className="btn-secondary" onClick={() => setSheetOpen(true)}>
                Bölgeye göre keşfet
              </button>
            ) : null}
            <StatusMessage>{predictStatus}</StatusMessage>
            <StatusMessage tone="error">{predictError}</StatusMessage>
            {showReport ? <ResultScene report={report} /> : null}
            {!isDesktop || !showReport ? tray : null}
            {!isDesktop ? resultActions : null}
          </section>
          {isDesktop ? (
            <section
              aria-label="Çalışma alanı"
              className={
                showReport ? 'flex flex-col gap-6 lg:col-span-4' : 'lg:col-span-5 lg:self-start'
              }
            >
              <div className="rounded-md bg-surface p-6">
                {regionPicker('compact', showReport ? 160 : firstSelection ? 280 : 420)}
              </div>
              {showReport ? tray : null}
              {resultActions}
            </section>
          ) : null}
        </div>
      </main>
      <RegionSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        {regionPicker('compact', 280)}
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
