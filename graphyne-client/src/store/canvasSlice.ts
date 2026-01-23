import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasState, CanvasElement } from '../types/canvas';

const initialState: CanvasState = {
  elements: [],
  selectedIds: [],
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
    addElement: (state, action: PayloadAction<Omit<CanvasElement, 'id'>>) => {
      const newElement = {
        ...action.payload,
        id: uuidv4(), // Generate ID automatically
        // Ensure defaults if missing
        isVisible: true,
        isLocked: false,
        zIndex: state.elements.length
      };
      state.elements.push(newElement);
      // Auto-select the new element
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
      const [removed] = state.elements.splice(action.payload.fromIndex, 1);
      state.elements.splice(action.payload.toIndex, 0, removed);
    },

    // FIX 2: Add Layer Movement Logic
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
    }
  }
});

export const {
  addElement, updateElement, updateElements, removeElement,
  selectElement, setSelection, toggleSelection, reorderElement,
  toggleVisibility, toggleLock, moveLayerUp, moveLayerDown
} = canvasSlice.actions;

export default canvasSlice.reducer;