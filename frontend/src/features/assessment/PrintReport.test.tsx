import type { ReactElement } from 'react';
import { MotionProvider } from '../../app/MotionProvider';
import { render as renderUi, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrintReport } from './PrintReport';
import { DISCLAIMER_TEXT } from './Disclaimer';
import { RULER_NOTE } from './ScoreList';
import { STALE_MESSAGE } from './StaleBanner';
import { testCatalog, testPrediction } from '../../test/utils';

function render(ui: ReactElement) {
  return renderUi(ui, { wrapper: MotionProvider });
}

describe('PrintReport', () => {
  it('contains the full note: ids, symptoms, ruler, description, precautions, disclaimer', () => {
    render(<PrintReport result={testPrediction} catalog={testCatalog} stale={false} />);
    const report = screen.getByTestId('print-report');

    expect(within(report).getByRole('heading', { level: 1 })).toHaveTextContent('Ön değerlendirme');
    expect(report).toHaveTextContent('req-7f3a2c9e');
    expect(report).toHaveTextContent('a1b2c3d4-0000-4000-8000-000000000001');
    expect(report).toHaveTextContent('2026');

    for (const label of ['Kaşıntı', 'Deri Döküntüsü', 'Nodal Cilt Döküntüleri']) {
      expect(report).toHaveTextContent(label);
    }

    expect(within(report).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Mantar Enfeksiyonu',
    );
    expect(report).toHaveTextContent('Model skoru %42');
    expect(report.querySelectorAll('[data-testid="ruler-bar"]')).toHaveLength(5);
    expect(report).toHaveTextContent(RULER_NOTE);
    expect(within(report).getByRole('heading', { name: 'Önlemler' })).toBeInTheDocument();
    expect(report).toHaveTextContent(testPrediction.top_prediction.description ?? '');
    expect(report).toHaveTextContent(DISCLAIMER_TEXT);
    expect(report).not.toHaveTextContent(STALE_MESSAGE);
    expect(report.querySelector('button')).toBeNull();
  });

  it('prints the stale warning when the selection changed', () => {
    render(<PrintReport result={testPrediction} catalog={testCatalog} stale />);
    expect(screen.getByTestId('print-report')).toHaveTextContent(STALE_MESSAGE);
  });

  it('capitalises precautions with Turkish casing', () => {
    render(
      <PrintReport
        result={{
          ...testPrediction,
          top_prediction: { ...testPrediction.top_prediction, precautions: ['ılık duş alın'] },
        }}
        catalog={testCatalog}
        stale={false}
      />,
    );
    expect(screen.getByText('Ilık duş alın')).toBeInTheDocument();
  });
});
