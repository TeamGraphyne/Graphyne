import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CanvasElement, CanvasState } from '../types/canvas';
import { v4 as uuidv4 } from 'uuid';

const initialState: CanvasState = {
  elements: [],
  selectedIds: [],
  canvasConfig: { width: 1920, height: 1080, background: '#ffffff' }
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    addElement: (state, action: PayloadAction<Omit<CanvasElement, 'id'>>) => {
      const newElement = { ...action.payload, id: uuidv4() };
      state.elements.push(newElement);
      state.selectedIds = [newElement.id];
    },

    // REFACTOR: Flattened payload to match component usage
    updateElement: (state, action: PayloadAction<Partial<CanvasElement> & { id: string }>) => {
      const { id, ...changes } = action.payload;
      const index = state.elements.findIndex(el => el.id === id);
      if (index !== -1) {
        state.elements[index] = { ...state.elements[index], ...changes };
      }
    },

    // REFACTOR: Flattened payload for bulk updates
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

    reorderElement: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const [removed] = state.elements.splice(action.payload.fromIndex, 1);
      state.elements.splice(action.payload.toIndex, 0, removed);
    }
  }
});

export const {
  addElement,
  updateElement,
  updateElements,
  removeElement,
  selectElement,
  setSelection,
  toggleSelection,
  reorderElement
} = canvasSlice.actions;

export default canvasSlice.reducer;