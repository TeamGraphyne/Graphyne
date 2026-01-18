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
      state.selectedIds = [newElement.id]; // Auto-select new item
    },
    updateElement: (state, action: PayloadAction<{ id: string; props: Partial<CanvasElement> }>) => {
      const index = state.elements.findIndex(el => el.id === action.payload.id);
      if (index !== -1) {
        state.elements[index] = { ...state.elements[index], ...action.payload.props };
      }
    },
    removeElement: (state, action: PayloadAction<string>) => {
      state.elements = state.elements.filter(el => el.id !== action.payload);
      state.selectedIds = [];
    },
    selectElement: (state, action: PayloadAction<string>) => {
      state.selectedIds = [action.payload];
    },
    reorderElement: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
       const [removed] = state.elements.splice(action.payload.fromIndex, 1);
       state.elements.splice(action.payload.toIndex, 0, removed);
    }
  }
});

export const { addElement, updateElement, removeElement, selectElement, reorderElement } = canvasSlice.actions;
export default canvasSlice.reducer;