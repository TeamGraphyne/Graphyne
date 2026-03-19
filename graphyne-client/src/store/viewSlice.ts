// NEW: Dedicated slice for view-only state that should NEVER be undoable.
// Zoom, pan offset, grid visibility, etc. live here — NOT in canvasSlice.
// :3
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ViewState {
  zoom: number;
}

const initialState: ViewState = {
  zoom: 0.7,
};

export const viewSlice = createSlice({
  name: 'view',
  initialState,
  reducers: {
    zoomIn: (state) => {
      state.zoom = Math.min(state.zoom + 0.1, 3);
    },

    zoomOut: (state) => {
      state.zoom = Math.max(state.zoom - 0.1, 0.2);
    },

    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = Math.max(0.2, Math.min(3, action.payload));
    },
  },
});

export const { zoomIn, zoomOut, setZoom } = viewSlice.actions;

export default viewSlice.reducer;