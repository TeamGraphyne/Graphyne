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
      // Auto-select new item
      state.selectedIds = [newElement.id]; 
    },
    
    updateElement: (state, action: PayloadAction<{ id: string; props: Partial<CanvasElement> }>) => {
      const index = state.elements.findIndex(el => el.id === action.payload.id);
      if (index !== -1) {
        state.elements[index] = { ...state.elements[index], ...action.payload.props };
      }
    },

    updateElements: (state, action: PayloadAction<{ id: string; props: Partial<CanvasElement> }[]>) => {
      action.payload.forEach(update => {
        const index = state.elements.findIndex(el => el.id === update.id);
        if (index !== -1) {
          state.elements[index] = { ...state.elements[index], ...update.props };
        }
      });
    },
    
    removeElement: (state, action: PayloadAction<string>) => {
      state.elements = state.elements.filter(el => el.id !== action.payload);
      // Only remove the deleted ID from selection, keep others selected
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

    // Toggles selection for multi-select
    toggleSelection: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.selectedIds.indexOf(id);
      
      if (index !== -1) {
        // If already selected, remove it
        state.selectedIds.splice(index, 1);
      } else {
        // If not selected, add it
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
    },

    // move layers up and down
    moveLayerUp: (state, action) => {
      const index = state.elements.findIndex(
        el => el.id === action.payload
      );

      if (index === -1 || index === state.elements.length - 1) return;

      const temp = state.elements[index];
      state.elements[index] = state.elements[index + 1];
      state.elements[index + 1] = temp;
    },

    moveLayerDown: (state, action) => {
      const index = state.elements.findIndex(
        el => el.id === action.payload
      );

      if (index <= 0) return;

      const temp = state.elements[index];
      state.elements[index] = state.elements[index - 1];
      state.elements[index - 1] = temp;
    },
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
  reorderElement,
  toggleVisibility,
  toggleLock,
  moveLayerUp,
  moveLayerDown
} = canvasSlice.actions;

export default canvasSlice.reducer;