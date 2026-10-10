import { useEffect, useReducer, useRef, useState } from 'react';
import { StatusMessage } from '../../components/ui/StatusMessage';
import { errorMessage } from '../../lib/api/client';
import { usePredict } from '../../lib/api/queries';
import { useMotionLevel } from '../../lib/motion';
import { DESKTOP_QUERY, useMediaQuery } from '../../lib/useMediaQuery';
import { HistoryDrawer } from '../history/HistoryDrawer';
import { BodyFigure } from '../symptoms/body-map/BodyFigure';
import type { FigureView } from '../symptoms/body-map/regions';
import { RegionChips } from '../symptoms/RegionChips';
import { RegionSheet } from '../symptoms/RegionSheet';
import { SymptomCombobox } from '../symptoms/SymptomCombobox';
import { SymptomList } from '../symptoms/SymptomList';
import type { SymptomCatalog } from '../symptoms/catalog';
import { countByRegion, isFigureRegion, useSymptomCatalog } from '../symptoms/catalog';
import { PrintReport } from './PrintReport';
import { ResultSection } from './ResultSection';
import { SelectionSummary } from './SelectionSummary';
import { MAX_SYMPTOMS, assessmentReducer, initialAssessmentState, isStale } from './state';

const DESKTOP_FIGURE_HEIGHT = 420;
const SHEET_FIGURE_HEIGHT = 260;

interface WorkspaceProps {
  historyOpen: boolean;
  onCloseHistory: () => void;
}

/** "Göğüs: 3 belirti seçili" after each change, for screen readers. */
function useSelectionAnnouncement(catalog: SymptomCatalog | null, selected: readonly string[]) {
  const [message, setMessage] = useState('');
  const previous = useRef<readonly string[]>(selected);
  useEffect(() => {
    const before = new Set(previous.current);
    const after = new Set(selected);
    previous.current = selected;
    const changed =
      selected.find((id) => !before.has(id)) ?? [...before].find((id) => !after.has(id));
    if (!changed || !catalog) return;
    const region = catalog.byId.get(changed)?.region;
    if (!region) return;
    const count = countByRegion(catalog, selected)[region] ?? 0;
    setMessage(`${catalog.regionLabel(region)}: ${count} belirti seçili`);
  }, [catalog, selected]);
  return message;
}

/**
 * One continuous surface: the figure on the left, search, region filter and list on the right,
 * the result below in a single reading column. The focus window rests on the figure while
 * choosing and travels to the result heading after "Değerlendir".
 */
export function Workspace({ historyOpen, onCloseHistory }: WorkspaceProps) {
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedHeadingRef = useRef<HTMLHeadingElement>(null);
  const reportHeadingRef = useRef<HTMLHeadingElement>(null);
  const announcement = useSelectionAnnouncement(catalog, state.selected);

  const stale = isStale(state);
  const count = state.selected.length;
  const limitReached = count >= MAX_SYMPTOMS;
  const result = state.result;
  const frameOnResult = result !== null && state.workspace === 'report';
  const counts = countByRegion(catalog, state.selected);

  const resultId = result?.request_id;
  useEffect(() => {
    const heading = reportHeadingRef.current;
    if (!resultId || !heading) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: level === 'full' ? 'smooth' : 'auto', block: 'start' });
    // Only a new result moves focus; a change of motion level must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId]);

  const evaluate = () => {
    if (count === 0 || predict.isPending) return;
    const request = [...state.selected];
    predict.mutate(
      { symptoms: request },
      { onSuccess: (data) => dispatch({ type: 'result', request, result: data }) },
    );
  };

  /** Choosing a region brings the focus window back to the figure. */
  const changeRegion = (region: string | null) => {
    dispatch({ type: 'region', region });
    dispatch({ type: 'workspace', workspace: 'figure' });
  };

  const editSymptoms = () => {
    dispatch({ type: 'workspace', workspace: 'figure' });
    if (limitReached) selectedHeadingRef.current?.focus();
    else inputRef.current?.focus();
  };

  const figure = (height: number, onSelect: (region: string | null) => void) => (
    <BodyFigure
      view={state.figureView}
      onViewChange={(view: FigureView) => dispatch({ type: 'figureView', view })}
      activeRegion={isFigureRegion(state.region) ? state.region : null}
      wholeBodyFilter={state.region !== null && !isFigureRegion(state.region)}
      counts={counts}
      onRegionSelect={onSelect}
      height={height}
      showFrame={!frameOnResult}
    />
  );

  const predictError = predict.isError
    ? `Değerlendirme yapılamadı. ${errorMessage(predict.error)}${
        predict.error.requestId ? ` İşlem kimliği: ${predict.error.requestId}` : ''
      }`
    : null;

  const summary = (
    <SelectionSummary
      headingRef={selectedHeadingRef}
      catalog={catalog}
      selected={state.selected}
      onRemove={(id) => dispatch({ type: 'remove', id })}
      onClear={() => dispatch({ type: 'clear' })}
      pending={predict.isPending}
      onEvaluate={evaluate}
    />
  );

  return (
    <>
      <main
        id="main"
        className="screen-only mx-auto w-full max-w-shell px-4 pb-24 pt-8 md:px-8 lg:pt-12"
      >
        <section
          aria-labelledby="page-title"
          className="grid grid-cols-1 gap-8 lg:grid-cols-workspace lg:items-start lg:gap-column"
        >
          {isDesktop && catalog ? (
            <aside
              aria-label="Vücut haritası"
              className="sticky top-6 flex flex-col items-center gap-6"
            >
              {figure(DESKTOP_FIGURE_HEIGHT, changeRegion)}
              <RegionChips
                regions={catalog.chipRegions}
                activeRegion={state.region}
                counts={counts}
                onSelect={changeRegion}
                label="Bölgesiz belirtiler"
                className="justify-center"
              />
            </aside>
          ) : null}

          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h1 id="page-title" className="type-title">
                Hangi belirtileri yaşıyorsunuz?
              </h1>
              <p className="max-w-prose text-lg text-ink-muted">
                Belirti adını yazarak arayın ya da vücut haritasından bir bölge seçin. En fazla{' '}
                {MAX_SYMPTOMS} belirti seçebilirsiniz.
              </p>
            </div>

            {catalog ? (
              <>
                <SymptomCombobox
                  ref={inputRef}
                  catalog={catalog}
                  selected={state.selected}
                  region={state.region}
                  onAdd={(id) => dispatch({ type: 'add', id })}
                  onClearRegion={() => changeRegion(null)}
                  limitReached={limitReached}
                />
                <div className="flex flex-col gap-3">
                  <RegionChips
                    regions={
                      isDesktop
                        ? catalog.regions.filter((region) => isFigureRegion(region.id))
                        : catalog.regions
                    }
                    activeRegion={state.region}
                    counts={counts}
                    onSelect={changeRegion}
                    label="Bölge filtresi"
                  />
                  {!isDesktop ? (
                    <button
                      type="button"
                      className="btn-quiet self-start px-2 text-sm underline underline-offset-4"
                      onClick={() => setSheetOpen(true)}
                    >
                      Bölgeye göre keşfet
                    </button>
                  ) : null}
                </div>
                {isDesktop ? summary : null}
                <SymptomList
                  catalog={catalog}
                  selected={state.selected}
                  region={state.region}
                  onToggle={(id) => dispatch({ type: 'toggle', id })}
                  limitReached={limitReached}
                />
                {!isDesktop ? summary : null}
              </>
            ) : (
              <div className="flex flex-col items-start gap-3">
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

            <StatusMessage>{predict.isPending ? 'Değerlendiriliyor…' : null}</StatusMessage>
            <StatusMessage tone="error">{predictError}</StatusMessage>
            <p role="status" aria-live="polite" className="sr-only">
              {announcement}
            </p>
          </div>
        </section>

        {result ? (
          <div className="mt-16 border-t border-line pt-12">
            <ResultSection
              key={result.request_id}
              ref={reportHeadingRef}
              result={result}
              catalog={catalog}
              stale={stale}
              pending={predict.isPending}
              canReassess={count > 0}
              framed={frameOnResult}
              onReassess={evaluate}
              onEditSymptoms={editSymptoms}
            />
          </div>
        ) : null}
      </main>
      <RegionSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        {catalog ? (
          <div className="flex justify-center">
            {figure(SHEET_FIGURE_HEIGHT, (region) => {
              changeRegion(region);
              if (region !== null) setSheetOpen(false);
            })}
          </div>
        ) : null}
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
