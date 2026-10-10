import type { PredictResponse } from '../../lib/api/schemas';
import type { FigureView } from '../symptoms/body-map/regions';

export const MAX_SYMPTOMS = 17;

export interface AssessmentState {
  selected: string[];
  region: string | null;
  figureView: FigureView;
  /** Which panel occupies the desktop workspace slot. */
  workspace: 'figure' | 'report';
  result: PredictResponse | null;
  /** Symptom set of the last successful request; drives the stale flag. */
  lastRequest: string[] | null;
}

export type AssessmentAction =
  | { type: 'add'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'toggle'; id: string }
  | { type: 'clear' }
  | { type: 'replace'; ids: string[] }
  | { type: 'region'; region: string | null }
  | { type: 'figureView'; view: FigureView }
  | { type: 'workspace'; workspace: 'figure' | 'report' }
  | { type: 'result'; request: string[]; result: PredictResponse };

export const initialAssessmentState: AssessmentState = {
  selected: [],
  region: null,
  figureView: 'front',
  workspace: 'figure',
  result: null,
  lastRequest: null,
};

function add(selected: string[], id: string): string[] {
  if (selected.includes(id) || selected.length >= MAX_SYMPTOMS) return selected;
  return [...selected, id];
}

export function assessmentReducer(
  state: AssessmentState,
  action: AssessmentAction,
): AssessmentState {
  switch (action.type) {
    case 'add':
      return { ...state, selected: add(state.selected, action.id) };
    case 'remove':
      return { ...state, selected: state.selected.filter((id) => id !== action.id) };
    case 'toggle':
      return state.selected.includes(action.id)
        ? { ...state, selected: state.selected.filter((id) => id !== action.id) }
        : { ...state, selected: add(state.selected, action.id) };
    case 'clear':
      return { ...state, selected: [] };
    case 'replace':
      return { ...state, selected: [...new Set(action.ids)].slice(0, MAX_SYMPTOMS) };
    case 'region':
      return { ...state, region: action.region };
    case 'figureView':
      return { ...state, figureView: action.view };
    case 'workspace':
      return { ...state, workspace: action.workspace };
    case 'result':
      return {
        ...state,
        result: action.result,
        lastRequest: action.request,
        workspace: 'report',
      };
    default:
      return state;
  }
}

export function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export function isStale(state: AssessmentState): boolean {
  return (
    state.result !== null &&
    state.lastRequest !== null &&
    !sameSet(state.selected, state.lastRequest)
  );
}
