import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Graphic Definition
export interface GraphicLayer {
  id: string;
  type: 'rect' | 'text' | 'image';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  rotation: number;
  // Specific properties for Text
  text?: string;
  fontSize?: number;
}

interface EditorState {
  layers: GraphicLayer[];
  selectedLayerId: string | null;
}

const initialState: EditorState = {
  layers: [],
  selectedLayerId: null,
};

export const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {

    setLayers: (state, action: PayloadAction<GraphicLayer[]>) => {
      state.layers = action.payload;
    },

    // Action to add a new layer
    addLayer: (state, action: PayloadAction<GraphicLayer>) => {
      state.layers.push(action.payload);
      state.selectedLayerId = action.payload.id; // Auto-select new layer
    },

    // Action to update a layer (moving, resizing, changing color)
    updateLayer: (state, action: PayloadAction<Partial<GraphicLayer> & { id: string }>) => {
      const index = state.layers.findIndex(l => l.id === action.payload.id);
      if (index !== -1) {
        state.layers[index] = { ...state.layers[index], ...action.payload };
      }
    },

    // Action to select a layer
    selectLayer: (state, action: PayloadAction<string | null>) => {
      state.selectedLayerId = action.payload;
    },
  },
});

export const { addLayer, updateLayer, selectLayer, setLayers } = editorSlice.actions;
export default editorSlice.reducer;