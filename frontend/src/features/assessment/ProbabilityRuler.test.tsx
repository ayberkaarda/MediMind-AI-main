import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProbabilityRuler } from './ProbabilityRuler';
import { formatScore, scoreToWidth } from '../../lib/format';

const predictions = [
  { disease_id: 'a', name: 'Mantar Enfeksiyonu', probability: 0.4213 },
  { disease_id: 'b', name: 'Alerji', probability: 0.1876 },
  { disease_id: 'c', name: 'İlaç Reaksiyonu', probability: 0.0912 },
  { disease_id: 'd', name: 'Suçiçeği', probability: 0.0204 },
  { disease_id: 'e', name: 'Akne', probability: 0.0041 },
  { disease_id: 'f', name: 'Fazladan', probability: 0.001 },
];

describe('score formatting', () => {
  it('formats whole percentages in Turkish order', () => {
    expect(formatScore(0.4213)).toBe('%42');
    expect(formatScore(0.995)).toBe('%100');
    expect(formatScore(0.01)).toBe('%1');
    expect(formatScore(0.0041)).toBe('<%1');
    expect(formatScore(0)).toBe('<%1');
  });

  it('maps a score to a width on the shared axis without normalising', () => {
    expect(scoreToWidth(0.4213)).toBeCloseTo(42.13);
    expect(scoreToWidth(1.2)).toBe(100);
    expect(scoreToWidth(-1)).toBe(0);
  });
});

describe('ProbabilityRuler', () => {
  it('renders at most five rows with absolute widths', () => {
    render(<ProbabilityRuler predictions={predictions} />);
    const bars = screen.getAllByTestId('ruler-bar');
    expect(bars).toHaveLength(5);
    expect(Number(bars[0]?.getAttribute('width'))).toBeCloseTo(42.13);
    expect(Number(bars[1]?.getAttribute('width'))).toBeCloseTo(18.76);
    expect(Number(bars[4]?.getAttribute('width'))).toBeCloseTo(0.41);
  });

  it('labels each row with name and score, using "<%1" below one percent', () => {
    render(<ProbabilityRuler predictions={predictions} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Mantar Enfeksiyonu, model skoru %42');
    expect(items[4]).toHaveTextContent('Akne, model skoru <%1');
    expect(screen.queryByText('Fazladan')).not.toBeInTheDocument();
  });

  it('draws every bar in the same colour', () => {
    const { container } = render(<ProbabilityRuler predictions={predictions} />);
    const svgs = container.querySelectorAll('svg');
    const classes = new Set(Array.from(svgs, (svg) => svg.getAttribute('class')));
    expect(classes.size).toBe(1);
  });
});
