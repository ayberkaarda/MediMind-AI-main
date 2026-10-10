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

export interface FrameBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Focus window rectangles in the 320 × 640 figure space: each region's bounds plus a
 * 10-unit margin, so the window sits just outside the highlighted shape.
 */
export const FRAME_BOXES: Record<RegionId, FrameBox> = {
  head_neck: { x: 123, y: 8, width: 74, height: 112 },
  chest: { x: 104, y: 100, width: 112, height: 141 },
  abdomen: { x: 100, y: 213, width: 120, height: 140 },
  back: { x: 100, y: 100, width: 120, height: 241 },
  arms: { x: 64, y: 115, width: 192, height: 292 },
  legs: { x: 100, y: 309, width: 120, height: 323 },
};

/** The whole figure: used before a region is chosen and for skin or general symptoms. */
export const WHOLE_FIGURE_BOX: FrameBox = { x: 56, y: 4, width: 208, height: 632 };
