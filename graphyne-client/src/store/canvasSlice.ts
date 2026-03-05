import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasState, CanvasElement, CanvasConfig } from '../types/canvas';

// --- GRID TYPES ---
interface GridState {
  show: boolean;
  snap: boolean;
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

const initialState: ExtendedCanvasState = {
  elements: [],
  selectedIds: [],
  config: {
    width: 1920,
    height: 1080,
    background: '#000000',
    zoom: 1 
  },
  meta: {
    id: null,
    name: 'New Graphic',
    projectId: null
  },
  grid: {
    show: true,
    snap: true,
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
      if (state.config.zoom === undefined) state.config.zoom = 1;
      state.config.zoom = Math.min(state.config.zoom + 0.1, 3);
    },

    zoomOut: state => {
      if (state.config.zoom === undefined) state.config.zoom = 1;
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

    setGridStyle: (
      state,
      action: PayloadAction<'lines' | 'dots' | 'graph'>
    ) => {
      state.grid.style = action.payload;
    }
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
  renameElement,
  zoomIn,      
  zoomOut,     
  setZoom,     
  setShowGrid,
  setSnap,
  setGridStyle,
} = canvasSlice.actions;

export default canvasSlice.reducer;