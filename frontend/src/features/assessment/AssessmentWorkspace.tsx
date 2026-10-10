import { useEffect, useReducer, useRef } from 'react';
import clsx from 'clsx';
import { Disclosure } from '../../components/ui/Disclosure';
import { StatusMessage } from '../../components/ui/StatusMessage';
import { errorMessage } from '../../lib/api/client';
import { usePredict } from '../../lib/api/queries';
import { DESKTOP_QUERY, TABLET_QUERY, useMediaQuery } from '../../lib/useMediaQuery';
import { HistoryDrawer } from '../history/HistoryDrawer';
import { RegionPicker } from '../symptoms/RegionPicker';
import { SelectedSymptomList } from '../symptoms/SelectedSymptomList';
import { SymptomCombobox } from '../symptoms/SymptomCombobox';
import { useSymptomCatalog } from '../symptoms/catalog';
import { ActionBar } from './ActionBar';
import { PrintReport } from './PrintReport';
import { ReportPanel } from './ReportPanel';
import { MAX_SYMPTOMS, assessmentReducer, initialAssessmentState, isStale } from './state';

interface AssessmentWorkspaceProps {
  historyOpen: boolean;
  onCloseHistory: () => void;
}

export function AssessmentWorkspace({ historyOpen, onCloseHistory }: AssessmentWorkspaceProps) {
  const [state, dispatch] = useReducer(assessmentReducer, initialAssessmentState);
  const {
    catalog,
    isPending: catalogPending,
    isError: catalogError,
    refetch,
  } = useSymptomCatalog();
  const predict = usePredict();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);
  const inputRef = useRef<HTMLInputElement>(null);
  const reportHeadingRef = useRef<HTMLHeadingElement>(null);

  const stale = isStale(state);
  const count = state.selected.length;
  const limitReached = count >= MAX_SYMPTOMS;
  const result = state.result;
  const showReport = result !== null && (!isDesktop || state.workspace === 'report');

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
    inputRef.current?.focus();
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

  return (
    <>
      <main
        id="main"
        className="screen-only mx-auto w-full max-w-shell px-4 pb-32 pt-8 md:px-6 lg:pb-16 lg:pt-12"
      >
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-6">
          <section
            aria-labelledby="page-title"
            className="flex flex-col gap-6 lg:sticky lg:top-8 lg:col-span-5 lg:self-start lg:pr-6"
          >
            <div className="flex flex-col gap-3">
              <h1 id="page-title" className="font-serif text-xl font-normal md:text-2xl">
                Hangi belirtileri yaşıyorsunuz?
              </h1>
              <p className="max-w-prose text-base text-ink-muted">
                Belirti adını yazarak arayın ya da vücut haritasından bir bölge seçin. En fazla{' '}
                {MAX_SYMPTOMS} belirti seçebilirsiniz.
              </p>
            </div>

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
                  <button
                    type="button"
                    className="btn-secondary mt-3"
                    onClick={() => void refetch()}
                  >
                    Yeniden dene
                  </button>
                ) : null}
              </div>
            )}

            <div className="lg:max-h-[40vh] lg:overflow-y-auto">
              <SelectedSymptomList
                catalog={catalog}
                selected={state.selected}
                onRemove={(id) => dispatch({ type: 'remove', id })}
                onClear={() => dispatch({ type: 'clear' })}
              />
            </div>

            {!isDesktop && catalog ? (
              <Disclosure summary="Bölgeden seç" className="border-y border-line">
                <div className="pb-6 pt-2">{regionPicker('compact', isTablet ? 360 : 260)}</div>
              </Disclosure>
            ) : null}

            {isDesktop ? (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={evaluate}
                  disabled={count === 0 || predict.isPending}
                >
                  {predict.isPending ? 'Değerlendiriliyor…' : 'Değerlendir'}
                </button>
                {result ? (
                  <div
                    role="group"
                    aria-label="Çalışma alanı görünümü"
                    className="grid grid-cols-2 gap-2"
                  >
                    {(
                      [
                        ['figure', 'Vücut haritası'],
                        ['report', 'Ön değerlendirme'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={state.workspace === value}
                        onClick={() => dispatch({ type: 'workspace', workspace: value })}
                        className={clsx(
                          'btn border text-sm',
                          state.workspace === value
                            ? 'border-ink bg-surface text-ink'
                            : 'border-line text-ink-muted hover:bg-surface-muted hover:text-ink',
                        )}
                      >
                        {label}
                        {value === 'report' && stale ? (
                          <span className="text-ink-muted"> (güncel değil)</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <StatusMessage>{predictStatus}</StatusMessage>
              <StatusMessage tone="error">{predictError}</StatusMessage>
            </div>
          </section>

          <section aria-label="Çalışma alanı" className="lg:col-span-7">
            {isDesktop ? (
              <div className="rounded-md border border-line bg-surface p-8">
                {showReport ? (
                  report
                ) : (
                  <div className="flex flex-col gap-6">
                    <h2 className="font-serif text-lg font-semibold">Vücut haritası</h2>
                    {regionPicker('wide', 420)}
                    {!catalog && catalogPending ? (
                      <p className="text-sm text-ink-muted">
                        Harita, belirti listesi yüklenince açılır.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : showReport ? (
              <div className="-mx-4 border-y border-line bg-surface px-4 py-8 md:-mx-6 md:px-6">
                {report}
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {!isDesktop ? (
        <ActionBar count={count} pending={predict.isPending} onEvaluate={evaluate} />
      ) : null}

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
