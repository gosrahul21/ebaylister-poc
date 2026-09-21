/**
 * CDP Helper facade
 * Re-exports segregated CDP helper functions and types from src/background/helper/
 * for full backward compatibility across the codebase.
 */
export {
  ensureDebuggerAttached,
  injectVisualCursor,
  dispatchMouseMove,
  dispatchClick,
  cdpTypeHuman,
  getElementCoords,
  waitForElementCoords,
  waitForUrlAndComplete,
  smoothScrollToElement,
  clickOutsideModal,
  cdpHumanInput
} from '../helper';

export type { Point, InputTarget } from '../helper';
