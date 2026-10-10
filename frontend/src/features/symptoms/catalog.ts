import { useMemo } from 'react';
import { useSymptoms } from '../../lib/api/queries';
import type { Region, Symptom, SymptomsResponse } from '../../lib/api/schemas';
import { buildIndex } from './search';

export const FIGURE_REGION_IDS = ['head_neck', 'chest', 'abdomen', 'back', 'arms', 'legs'] as const;
export type FigureRegionId = (typeof FIGURE_REGION_IDS)[number];

export function isFigureRegion(id: string | null | undefined): id is FigureRegionId {
  return id != null && (FIGURE_REGION_IDS as readonly string[]).includes(id);
}

export interface SymptomCatalog {
  symptoms: Symptom[];
  regions: Region[];
  byId: Map<string, Symptom>;
  regionLabel: (id: string) => string;
  /** Regions that have no place on the figure (skin, general). */
  chipRegions: Region[];
  index: ReturnType<typeof buildIndex>;
}

export function buildCatalog(data: SymptomsResponse): SymptomCatalog {
  const regions = [...data.regions].sort((a, b) => a.order - b.order);
  const labels = new Map(regions.map((r) => [r.id, r.label]));
  return {
    symptoms: data.symptoms,
    regions,
    byId: new Map(data.symptoms.map((s) => [s.id, s])),
    regionLabel: (id) => labels.get(id) ?? id,
    chipRegions: regions.filter((r) => !isFigureRegion(r.id)),
    index: buildIndex(data.symptoms),
  };
}

export function useSymptomCatalog() {
  const query = useSymptoms();
  const catalog = useMemo(() => (query.data ? buildCatalog(query.data) : null), [query.data]);
  return { ...query, catalog };
}

export function symptomLabel(catalog: SymptomCatalog | null, id: string): string {
  return catalog?.byId.get(id)?.label ?? id.replace(/_/g, ' ');
}

export function countByRegion(
  catalog: SymptomCatalog | null,
  selected: readonly string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!catalog) return counts;
  for (const id of selected) {
    const region = catalog.byId.get(id)?.region;
    if (region) counts[region] = (counts[region] ?? 0) + 1;
  }
  return counts;
}
