import { configureStore } from '@reduxjs/toolkit';
import undoable from 'redux-undo';
import canvasReducer from './canvasSlice';
import dataReducer from './dataSlice';
import { undoFilter, undoGroupBy } from './undoConfig'; // Import undo config
import viewReducer from './viewSlice'; // NEW: Import view slice reducer
import assetReducer from "./assetSlice";

export const store = configureStore({
  reducer: {
    // MODIFIED: Added filter and groupBy to make undo/redo more natural.
    // - filter: Excludes zoom actions from history (view-only, not design state).
    // - groupBy: Collapses rapid text edits and nudges into single undo entries.
    canvas: undoable(canvasReducer, {
      limit: 50,
      filter: undoFilter,
      groupBy: undoGroupBy,
    }),
    data: dataReducer,
    view: viewReducer, // NEW: Added view slice for zoom and other view-only state.
    assets: assetReducer,
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;