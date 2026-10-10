export type RegionId = 'head_neck' | 'chest' | 'abdomen' | 'back' | 'arms' | 'legs';
export type FigureView = 'front' | 'back';

export interface RegionDefinition {
  id: RegionId;
  label: string;
  views: FigureView[];
  labelAnchor: Partial<Record<FigureView, { x: number; y: number }>>;
}

export const REGIONS: RegionDefinition[] = [
  {
    id: 'head_neck',
    label: 'Baş ve boyun',
    views: ['front', 'back'],
    labelAnchor: { front: { x: 199, y: 18 }, back: { x: 199, y: 18 } },
  },
  { id: 'chest', label: 'Göğüs', views: ['front'], labelAnchor: { front: { x: 209, y: 102 } } },
  { id: 'abdomen', label: 'Karın', views: ['front'], labelAnchor: { front: { x: 257, y: 242 } } },
  { id: 'back', label: 'Sırt', views: ['back'], labelAnchor: { back: { x: 209, y: 102 } } },
  {
    id: 'arms',
    label: 'Kollar',
    views: ['front', 'back'],
    labelAnchor: { front: { x: 246, y: 148 }, back: { x: 246, y: 148 } },
  },
  {
    id: 'legs',
    label: 'Bacaklar',
    views: ['front', 'back'],
    labelAnchor: { front: { x: 228, y: 415 }, back: { x: 228, y: 415 } },
  },
];

export const REGION_LABELS: Record<RegionId, string> = {
  head_neck: 'Baş ve boyun',
  chest: 'Göğüs',
  abdomen: 'Karın',
  back: 'Sırt',
  arms: 'Kollar',
  legs: 'Bacaklar',
};
