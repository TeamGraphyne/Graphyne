import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasState, CanvasElement, CanvasConfig } from '../types/canvas';

// --- GRID TYPES ---
interface GridState {
  show: boolean;
  snap: boolean;
  size: number;
  snapStyle: 'centers' | 'edges';
  style: 'lines' | 'dots' | 'graph';
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

// MODIFIED: Removed 'zoom' from config — it now lives in viewSlice
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
    projectId: null
  },
  grid: {
    show: true,
    snap: true,
    size: 20,
    snapStyle: 'centers',
    style: 'lines'
  }
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // ---------------- META ----------------
    setGraphicMeta: (
      state,
      action: PayloadAction<{ id?: string; name?: string; projectId?: string | null }>
    ) => {
      if (action.payload.id !== undefined) state.meta.id = action.payload.id;
      if (action.payload.name !== undefined) state.meta.name = action.payload.name;
      if (action.payload.projectId !== undefined)
        state.meta.projectId = action.payload.projectId;
    },

    loadGraphic: (
      state,
      action: PayloadAction<{
        id: string;
        name: string;
        elements: CanvasElement[];
        config: CanvasConfig;
      }>
    ) => {
      state.meta.id = action.payload.id;
      state.meta.name = action.payload.name;
      state.elements = action.payload.elements;
      state.config = { ...state.config, ...action.payload.config };
      state.selectedIds = [];
    },

    // ---------------- ELEMENTS ----------------
    addElement: (state, action: PayloadAction<Omit<CanvasElement, 'id'>>) => {
      const newElement: CanvasElement = {
        ...action.payload,
        id: uuidv4(),
        isVisible: action.payload.isVisible ?? true,
        isLocked: action.payload.isLocked ?? false,
        zIndex: state.elements.length
      };

      state.elements.push(newElement);
      state.selectedIds = [newElement.id];
    },

    updateElement: (
      state,
      action: PayloadAction<Partial<CanvasElement> & { id: string }>
    ) => {
      const { id, ...changes } = action.payload;
      const index = state.elements.findIndex(el => el.id === id);
      if (index !== -1) {
        state.elements[index] = { ...state.elements[index], ...changes };
      }
    },

    updateElements: (
      state,
      action: PayloadAction<(Partial<CanvasElement> & { id: string })[]>
    ) => {
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

    // ---------------- SELECTION ----------------
    selectElement: (state, action: PayloadAction<string | null>) => {
      state.selectedIds = action.payload ? [action.payload] : [];
    },

    setSelection: (state, action: PayloadAction<string[]>) => {
      state.selectedIds = action.payload;
    },

    toggleSelection: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.selectedIds.indexOf(id);
      if (index !== -1) {
        state.selectedIds.splice(index, 1);
      } else {
        state.selectedIds.push(id);
      }
    },

    // ---------------- LAYER CONTROL ----------------
    reorderElement: (
      state,
      action: PayloadAction<{ fromIndex: number; toIndex: number }>
    ) => {
      const { fromIndex, toIndex } = action.payload;
      const [removed] = state.elements.splice(fromIndex, 1);
      state.elements.splice(toIndex, 0, removed);

      state.elements.forEach((el, idx) => {
        el.zIndex = idx;
      });
    },

    moveLayerUp: (state, action: PayloadAction<string>) => {
      const index = state.elements.findIndex(el => el.id === action.payload);
      if (index !== -1 && index < state.elements.length - 1) {
        [state.elements[index], state.elements[index + 1]] = [
          state.elements[index + 1],
          state.elements[index]
        ];
      }
    },

    moveLayerDown: (state, action: PayloadAction<string>) => {
      const index = state.elements.findIndex(el => el.id === action.payload);
      if (index > 0) {
        [state.elements[index], state.elements[index - 1]] = [
          state.elements[index - 1],
          state.elements[index]
        ];
      }
    },

    // ---------------- VISIBILITY / LOCK ----------------
    toggleVisibility: (state, action: PayloadAction<string>) => {
      const el = state.elements.find(e => e.id === action.payload);
      if (el) el.isVisible = !el.isVisible;
    },

    toggleLock: (state, action: PayloadAction<string>) => {
      const el = state.elements.find(e => e.id === action.payload);
      if (el) el.isLocked = !el.isLocked;
    },

    renameElement: (
      state,
      action: PayloadAction<{ id: string; name: string }>
    ) => {
      const element = state.elements.find(el => el.id === action.payload.id);
      if (element) element.name = action.payload.name;
    },

    // ---------------- ZOOM ----------------
    zoomIn: state => {
      state.config.zoom = Math.min(state.config.zoom + 0.1, 3);
    },

    zoomOut: state => {
      state.config.zoom = Math.max(state.config.zoom - 0.1, 0.2);
    },

    setZoom: (state, action: PayloadAction<number>) => {
      state.config.zoom = Math.max(0.2, Math.min(3, action.payload));
    },

    // ---------------- GRID ----------------
    setShowGrid: (state, action: PayloadAction<boolean>) => {
      state.grid.show = action.payload;
    },

    setSnap: (state, action: PayloadAction<boolean>) => {
      state.grid.snap = action.payload;
    },

    setGridSize: (state, action: PayloadAction<number>) => {
      state.grid.size = action.payload;
    },

    setSnapStyle: (
      state,
      action: PayloadAction<'centers' | 'edges'>
    ) => {
      state.grid.snapStyle = action.payload;
    },

    setGridStyle: (
      state,
      action: PayloadAction<'lines' | 'dots' | 'graph'>
    ) => {
      state.grid.style = action.payload;
    }
    // REMOVED: zoomIn, zoomOut, setZoom — moved to viewSlice.ts

    // Add this to your canvasSlice reducers
    renameElement: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const element = state.elements.find(el => el.id === action.payload.id);
      if (element) {
        element.name = action.payload.name;
      }
    },

    // NEW: Nudge selected elements by a delta. Skips locked elements.
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

    // NEW: Duplicate selected elements as a single undo step.
    // Clones each element with a new UUID and offsets position by 20px.
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
      // Auto-select the duplicated elements
      state.selectedIds = newIds;
    },
  }
});

export const {
  setGraphicMeta,
  loadGraphic,
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
  zoomIn,
  zoomOut,
  setZoom,
  renameElement,
  setShowGrid,
  setSnap,
  setGridSize,
  setSnapStyle,
  setGridStyle
  renameElement,
  nudgeElements,
  duplicateElements,
  // REMOVED: zoomIn, zoomOut, setZoom — now exported from viewSlice.ts
} = canvasSlice.actions;

export default canvasSlice.reducer;
