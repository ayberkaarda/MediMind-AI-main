import { Disclosure } from '../../components/ui/Disclosure';
import type { PredictResponse } from '../../lib/api/schemas';
import { formatDecimal } from '../../lib/format';

export function severitySentence(meanWeight: number): string {
  return `Belirti ağırlığı: ort. ${formatDecimal(meanWeight)} / 7 (veri setindeki belirti ağırlıklarından hesaplanır; aciliyet veya klinik ciddiyet göstergesi değildir).`;
}

export function TechnicalDetails({ result }: { result: PredictResponse }) {
  return (
    <Disclosure summary="Teknik ayrıntılar" className="border-y border-line py-2">
      <div className="pb-4 text-sm text-ink-muted">
        <p className="max-w-prose text-ink">{severitySentence(result.severity.mean_weight)}</p>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
          <dt>Model sürümü</dt>
          <dd className="break-all text-ink">{result.model_version}</dd>
          <dt>İşlem kimliği</dt>
          <dd className="break-all text-ink">{result.request_id}</dd>
          {result.analysis_id ? (
            <>
              <dt>Analiz kimliği</dt>
              <dd className="break-all text-ink">{result.analysis_id}</dd>
            </>
          ) : null}
        </dl>
      </div>
    </Disclosure>
  );
}
