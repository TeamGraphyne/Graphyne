import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { CanvasState, CanvasElement } from '../types/canvas';

const initialState: CanvasState = {
  elements: [],
  selectedIds: [],
  // --- ADD INITIAL CONFIG ---
  config: {
    width: 1920,
    height: 1080,
    background: '#000000'
  }
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {

    addElement: (state, action: PayloadAction<CanvasElement>) => {
      state.elements.push(action.payload);
    },

    updateElement: (state, action: PayloadAction<Partial<CanvasElement> & { id: string }>) => {
      const index = state.elements.findIndex(el => el.id === action.payload.id);
      if (index !== -1) {
        state.elements[index] = { ...state.elements[index], ...action.payload };
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

    // Accepts string or null. If null, clears selection.
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

    toggleVisibility: (state, action) => {
      const el = state.elements.find(e => e.id === action.payload);
      if (el) {
        el.isVisible = !el.isVisible;
      }
    },

    toggleLock: (state, action) => {
      const el = state.elements.find(e => e.id === action.payload);
      if (el) {
        el.isLocked = !el.isLocked;
      }
    },

    reorderElement: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const [removed] = state.elements.splice(action.payload.fromIndex, 1);
      state.elements.splice(action.payload.toIndex, 0, removed);
    }
  }
});

export const { addElement, updateElement, updateElements, removeElement, selectElement, setSelection, toggleSelection, reorderElement } = canvasSlice.actions;

export default canvasSlice.reducer;