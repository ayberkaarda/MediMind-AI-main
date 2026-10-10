import type { PredictResponse } from '../../lib/api/schemas';
import { formatDateTime, formatScore } from '../../lib/format';
import type { SymptomCatalog } from '../symptoms/catalog';
import { symptomLabel } from '../symptoms/catalog';
import { DISCLAIMER_TEXT } from './Disclaimer';
import { sentenceCase } from './PrecautionList';
import { ScoreList, RULER_NOTE } from './ScoreList';
import { STALE_MESSAGE } from './StaleBanner';

interface PrintReportProps {
  result: PredictResponse;
  catalog: SymptomCatalog | null;
  stale: boolean;
}

/** Monochrome A4 note; hidden on screen, the only visible content under @media print. */
export function PrintReport({ result, catalog, stale }: PrintReportProps) {
  const top = result.top_prediction;
  const precautions = top.precautions.map(sentenceCase).filter(Boolean);

  return (
    <div className="print-report" data-testid="print-report">
      <p>MediMind</p>
      <h1>Ön değerlendirme</h1>

      <dl className="print-report__meta">
        <dt>Tarih</dt>
        <dd>{formatDateTime(result.created_at)}</dd>
        <dt>İşlem kimliği</dt>
        <dd>{result.request_id}</dd>
        {result.analysis_id ? (
          <>
            <dt>Analiz kimliği</dt>
            <dd>{result.analysis_id}</dd>
          </>
        ) : null}
        <dt>Model sürümü</dt>
        <dd>{result.model_version}</dd>
      </dl>

      {stale ? (
        <p className="print-report__stale">
          {STALE_MESSAGE}. Bu not, aşağıda listelenen belirtilerle yapılan son değerlendirmeyi
          gösterir; ekrandaki seçim bundan farklıdır.
        </p>
      ) : null}

      <section>
        <h3>Seçili belirtiler</h3>
        <ul>
          {result.input.symptoms.map((id) => (
            <li key={id}>{symptomLabel(catalog, id)}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{top.name}</h2>
        <p>Model skoru {formatScore(top.probability)}</p>
        {top.description ? <p>{top.description}</p> : null}
      </section>

      <section>
        <h3>Model skorları</h3>
        <ScoreList predictions={result.predictions} variant="print" />
        <p className="print-report__note">{RULER_NOTE}</p>
      </section>

      {precautions.length > 0 ? (
        <section>
          <h3>Önlemler</h3>
          <ul>
            {precautions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="print-report__disclaimer">{DISCLAIMER_TEXT}</p>
    </div>
  );
}
