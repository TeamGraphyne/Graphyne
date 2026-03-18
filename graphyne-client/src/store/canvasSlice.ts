import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasState, CanvasElement, CanvasConfig } from '../types/canvas';

// --- GRID TYPES ---
interface GridState {
  show: boolean;
  snap: boolean;
  style: 'lines' | 'dots' | 'graph';
  showAlignmentGuides: boolean;
}

// --- EXTENDED STATE ---
interface ExtendedCanvasState extends CanvasState {
  meta: {
    id: string | null;
    name: string;
    projectId: string | null;
  };
  grid: GridState;
}

const initialState: ExtendedCanvasState = {
  elements: [],
  selectedIds: [],
  config: {
    width: 1920,
    height: 1080,
    background: '#000000',
  },
  meta: {
    id: null,
    name: 'New Graphic',
    projectId: null,
  },
  grid: {
    show: true,
    snap: true,
    style: 'lines',
    showAlignmentGuides: true,
  },
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {

    // --- METADATA ---
    setGraphicMeta: (state, action: PayloadAction<{ id?: string; name?: string; projectId?: string | null }>) => {
      if (action.payload.id !== undefined) state.meta.id = action.payload.id;
      if (action.payload.name !== undefined) state.meta.name = action.payload.name;
      if (action.payload.projectId !== undefined) state.meta.projectId = action.payload.projectId;
    },

    loadGraphic: (state, action: PayloadAction<{ id: string; name: string; elements: CanvasElement[]; config: CanvasConfig }>) => {
      state.meta.id = action.payload.id;
      state.meta.name = action.payload.name;
      state.elements = action.payload.elements;
      state.config = { ...state.config, ...action.payload.config };
      state.selectedIds = [];
    },

    updateConfig: (state, action: PayloadAction<Partial<CanvasConfig>>) => {
      state.config = { ...state.config, ...action.payload };
    },

    // --- ELEMENTS ---
    addElement: (state, action: PayloadAction<Omit<CanvasElement, 'id'>>) => {
      const newElement: CanvasElement = {
        ...action.payload,
        id: uuidv4(),
        isVisible: action.payload.isVisible ?? true,
        isLocked: action.payload.isLocked ?? false,
        zIndex: state.elements.length,
      };
      state.elements.push(newElement);
      state.selectedIds = [newElement.id];
    },

    updateElement: (state, action: PayloadAction<Partial<CanvasElement> & { id: string }>) => {
      const { id, ...changes } = action.payload;
      const index = state.elements.findIndex(el => el.id === id);
      if (index !== -1) {
        state.elements[index] = { ...state.elements[index], ...changes };
      }
    },

    updateElements: (state, action: PayloadAction<(Partial<CanvasElement> & { id: string })[]>) => {
      action.payload.forEach(({ id, ...changes }) => {
        const index = state.elements.findIndex(el => el.id === id);
        if (index !== -1) {
          state.elements[index] = { ...state.elements[index], ...changes };
        }
      });
    },

    removeElement: (state, action: PayloadAction<string>) => {
      state.elements = state.elements.filter(el => el.id !== action.payload);
      state.selectedIds = state.selectedIds.filter(id => id !== action.payload);
    },

    selectElement: (state, action: PayloadAction<string | null>) => {
      state.selectedIds = action.payload === null ? [] : [action.payload];
    },

    setSelection: (state, action: PayloadAction<string[]>) => {
      state.selectedIds = action.payload;
    },

    toggleSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedIds.indexOf(action.payload);
      if (index !== -1) {
        state.selectedIds.splice(index, 1);
      } else {
        state.selectedIds.push(action.payload);
      }
    },

    toggleVisibility: (state, action: PayloadAction<string>) => {
      const el = state.elements.find(e => e.id === action.payload);
      if (el) el.isVisible = !el.isVisible;
    },

    toggleLock: (state, action: PayloadAction<string>) => {
      const el = state.elements.find(e => e.id === action.payload);
      if (el) el.isLocked = !el.isLocked;
    },

    reorderElement: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      const [removed] = state.elements.splice(fromIndex, 1);
      state.elements.splice(toIndex, 0, removed);
      state.elements.forEach((el, idx) => { el.zIndex = idx; });
    },

    moveLayerUp: (state, action: PayloadAction<string>) => {
      const index = state.elements.findIndex(el => el.id === action.payload);
      if (index !== -1 && index < state.elements.length - 1) {
        const temp = state.elements[index];
        state.elements[index] = state.elements[index + 1];
        state.elements[index + 1] = temp;
      }
    },

    moveLayerDown: (state, action: PayloadAction<string>) => {
      const index = state.elements.findIndex(el => el.id === action.payload);
      if (index > 0) {
        const temp = state.elements[index];
        state.elements[index] = state.elements[index - 1];
        state.elements[index - 1] = temp;
      }
    },

    renameElement: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const el = state.elements.find(e => e.id === action.payload.id);
      if (el) el.name = action.payload.name;
    },

    nudgeElements: (state, action: PayloadAction<{ ids: string[]; dx: number; dy: number }>) => {
      const { ids, dx, dy } = action.payload;
      ids.forEach((id) => {
        const el = state.elements.find(e => e.id === id);
        if (el && !el.isLocked) {
          el.x += dx;
          el.y += dy;
        }
      });
    },

    // FIX: was incorrectly nested inside setGridStyle — now a proper sibling reducer
    duplicateElements: (state, action: PayloadAction<string[]>) => {
      const newIds: string[] = [];
      action.payload.forEach((id) => {
        const source = state.elements.find(el => el.id === id);
        if (source) {
          const newId = uuidv4();
          const clone: CanvasElement = {
            ...source,
            id: newId,
            name: `${source.name} Copy`,
            x: source.x + 20,
            y: source.y + 20,
            zIndex: state.elements.length,
          };
          state.elements.push(clone);
          newIds.push(newId);
        }
      });
      state.selectedIds = newIds;
    },

    // --- GRID ---
    setShowGrid: (state, action: PayloadAction<boolean>) => {
      state.grid.show = action.payload;
    },

    setShowAlignmentGuides: (state, action: PayloadAction<boolean>) => {
      state.grid.showAlignmentGuides = action.payload;
    },

    setSnap: (state, action: PayloadAction<boolean>) => {
      state.grid.snap = action.payload;
    },

    // FIX: was missing its closing brace, causing duplicateElements to nest inside it
    setGridStyle: (state, action: PayloadAction<'lines' | 'dots' | 'graph'>) => {
      state.grid.style = action.payload;
    },
  },
});

export const {
  setGraphicMeta,
  loadGraphic,
  updateConfig,
  addElement,
  updateElement,
  updateElements,
  removeElement,
  selectElement,
  setSelection,
  toggleSelection,
  reorderElement,
  toggleVisibility,
  toggleLock,
  moveLayerUp,
  moveLayerDown,
  renameElement,
  nudgeElements,
  duplicateElements,
  setShowGrid,
  setShowAlignmentGuides,
  setSnap,
  setGridStyle,
} = canvasSlice.actions;

export default canvasSlice.reducer;