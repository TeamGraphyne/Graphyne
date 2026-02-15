import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasState, CanvasElement, CanvasConfig } from '../types/canvas';
import undoable, { excludeAction, groupByActionTypes } from 'redux-undo';

// Extend the state to track Metadata (Database IDs)
interface ExtendedCanvasState extends CanvasState {
  meta: {
    id: string | null;        // The Database ID of this graphic
    name: string;             // The name of the graphic
    projectId: string | null; // The currently selected Project/Playlist ID
  };
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
    name: "New Graphic",
    projectId: null
  }
};



export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // --- METADATA ACTIONS ---
    setGraphicMeta: (state, action: PayloadAction<{ id?: string; name?: string; projectId?: string | null }>) => {
      if (action.payload.id !== undefined) state.meta.id = action.payload.id;
      if (action.payload.name !== undefined) state.meta.name = action.payload.name;
      if (action.payload.projectId !== undefined) state.meta.projectId = action.payload.projectId;
    },

    // [FIXED] Replaced 'any' with 'CanvasConfig'
    loadGraphic: (state, action: PayloadAction<{ id: string; name: string; elements: CanvasElement[]; config: CanvasConfig }>) => {
      state.meta.id = action.payload.id;
      state.meta.name = action.payload.name;
      state.elements = action.payload.elements;
      state.config = { ...state.config, ...action.payload.config };
      state.selectedIds = [];
    },

    // --- EXISTING ACTIONS ---
    addElement: (state, action: PayloadAction<Omit<CanvasElement, 'id'>>) => {
      const newElement = {
        ...action.payload,
        id: uuidv4(),
        isVisible: action.payload.isVisible ?? true,
        isLocked: action.payload.isLocked ?? false,
        zIndex: state.elements.length
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

    //Separate action for text updates, this will be gruoped when user clickes undo :)
    updateElementText: (state, action: PayloadAction<{ id: string; text: string }>) => {
      const index = state.elements.findIndex(el => el.id === action.payload.id);
      if (index !== -1) {
        state.elements[index].text = action.payload.text;
      }
    },

    updateElements: (state, action: PayloadAction<(Partial<CanvasElement> & { id: string })[]>) => {
      action.payload.forEach(({ id, ...changes }) => {
        const index = state.elements.findIndex(el => el.id === id);
        if (index !== -1) {
          state.elements[index] = { ...state.elements[index], ...changes };
        }
      }
    );
    },

    removeElement: (state, action: PayloadAction<string>) => {
      state.elements = state.elements.filter(el => el.id !== action.payload);
      state.selectedIds = state.selectedIds.filter(id => id !== action.payload);
    },

    selectElement: (state, action: PayloadAction<string | null>) => {
      if (action.payload === null) {
        state.selectedIds = [];
      } else {
        state.selectedIds = [action.payload];
      }
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
      
      // Update zIndex for all elements based on new array order
      state.elements.forEach((el, idx) => {
        el.zIndex = idx;
      });
    },

    moveLayerUp: (state, action: PayloadAction<string>) => {
      const index = state.elements.findIndex(el => el.id === action.payload);
      if (index < state.elements.length - 1 && index !== -1) {
        const temp = state.elements[index];
        state.elements[index] = state.elements[index + 1];
        state.elements[index + 1] = temp;
      }
    },

    moveLayerDown: (state, action: PayloadAction<string>) => {
      const index = state.elements.findIndex(el => el.id === action.payload);
      if (index > 0 && index !== -1) {
        const temp = state.elements[index];
        state.elements[index] = state.elements[index - 1];
        state.elements[index - 1] = temp;
      }
    },
    renameElement: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const el = state.elements.find(e => e.id === action.payload.id);
      if (el) el.name = action.payload.name;
    },

    zoomIn: (state) => {
      state.config.zoom = Math.min(state.config.zoom + 0.1, 3);
    },

    zoomOut: (state) => {
      state.config.zoom = Math.max(state.config.zoom - 0.1, 0.2);
    },

    setZoom: (state, action: PayloadAction<number>) => {
      state.config.zoom = Math.max(0.2, Math.min(3, action.payload));
    }
  }
});

export const {
  setGraphicMeta,
  loadGraphic,
  addElement, 
  updateElement,
  updateElementText, 
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
  setZoom
} = canvasSlice.actions;

// export default canvasSlice.reducer;
// Wrap the reducer with redux-undo
const undoableReducer = undoable(canvasSlice.reducer, {
  limit: 50,
  
  filter: excludeAction([
    'canvas/selectElement',
    'canvas/setSelection',
    'canvas/toggleSelection',
    'canvas/zoomIn',
    'canvas/zoomOut',
    'canvas/setZoom',
    'canvas/setGraphicMeta',
    'canvas/loadGraphic',
  ]),
  
  groupBy: groupByActionTypes(['canvas/updateElementText']),
});

export default undoableReducer;