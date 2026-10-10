import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { AssessmentWorkspace } from './AssessmentWorkspace';
import { STALE_MESSAGE } from './StaleBanner';
import { server } from '../../test/msw/server';
import { renderWithClient } from '../../test/utils';

function renderWorkspace() {
  return renderWithClient(<AssessmentWorkspace historyOpen={false} onCloseHistory={() => {}} />);
}

async function pick(
  user: ReturnType<typeof renderWorkspace>['user'],
  query: string,
  label: RegExp,
) {
  const input = await screen.findByRole('combobox', { name: 'Belirti ara' });
  await user.clear(input);
  await user.type(input, query);
  await user.click(screen.getByRole('option', { name: label }));
}

describe('AssessmentWorkspace', () => {
  it('evaluates, reports, turns stale after an edit and re-evaluates', async () => {
    const bodies: unknown[] = [];
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'POST') bodies.push(await request.clone().json());
    });
    const { user } = renderWorkspace();

    await pick(user, 'kasinti', /^Kaşıntı/);
    await pick(user, 'deri dok', /^Deri Döküntüsü/);

    const selected = screen.getByRole('region', { name: /Seçili belirtiler/ });
    expect(within(selected).getByRole('group', { name: 'Cilt' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Değerlendir · 2 belirti' }));

    const heading = await screen.findByRole('heading', { name: 'Ön değerlendirme', level: 2 });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(bodies[0]).toEqual({ symptoms: ['itching', 'skin_rash'] });

    const report = screen.getByRole('article');
    const top = within(report).getByRole('region', { name: 'En yüksek skorlu sonuç' });
    expect(top).toHaveTextContent('Mantar Enfeksiyonu');
    expect(top).toHaveTextContent('Model skoru %42');
    expect(within(report).getByText(/hastalığa sahip olma olasılığınız/)).toBeInTheDocument();
    expect(within(report).getByRole('heading', { name: 'Önlemler' })).toBeInTheDocument();
    expect(within(report).queryByText(/medium|orta güven/i)).not.toBeInTheDocument();
    expect(screen.queryByText(STALE_MESSAGE)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kaşıntı belirtisini kaldır' }));
    expect(await screen.findByText(STALE_MESSAGE)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Yeniden değerlendir' }));
    await waitFor(() => expect(screen.queryByText(STALE_MESSAGE)).not.toBeInTheDocument());
    expect(bodies[1]).toEqual({ symptoms: ['skin_rash'] });

    // Restoring the evaluated set clears the stale flag without a request.
    await pick(user, 'kasinti', /^Kaşıntı/);
    expect(await screen.findByText(STALE_MESSAGE)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kaşıntı belirtisini kaldır' }));
    expect(screen.queryByText(STALE_MESSAGE)).not.toBeInTheDocument();
    expect(bodies).toHaveLength(2);
  });

  it('filters by body region from the inline region picker', async () => {
    const { user } = renderWorkspace();
    await user.click(await screen.findByRole('button', { name: 'Bölgeden seç' }));
    const regionButton = screen.getByRole('button', { name: 'Göğüs' });
    await user.click(regionButton);
    expect(regionButton).toHaveAttribute('aria-pressed', 'true');

    const list = screen.getByRole('region', { name: 'Göğüs bölgesindeki belirtiler' });
    await user.click(within(list).getByRole('button', { name: 'Öksürük' }));
    expect(screen.getByRole('button', { name: 'Öksürük belirtisini kaldır' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Göğüs, 1 seçili belirti/ })).toBeInTheDocument();
  });

  it('shows the problem detail when the evaluation fails', async () => {
    server.use(
      http.post('*/api/v1/predict', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Internal error',
            status: 500,
            detail: 'Model yüklenemedi.',
            code: 'internal_error',
            request_id: 'req-500',
          },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const { user } = renderWorkspace();
    await pick(user, 'kasinti', /^Kaşıntı/);
    await user.click(screen.getByRole('button', { name: 'Değerlendir · 1 belirti' }));
    const alert = await screen.findByText(/Değerlendirme yapılamadı/);
    expect(alert).toHaveTextContent(
      'Sunucuda beklenmeyen bir hata oluştu. Biraz sonra yeniden deneyin. İşlem kimliği: req-500',
    );
  });
});
