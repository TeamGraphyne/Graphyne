import { configureStore } from '@reduxjs/toolkit';
import undoable from 'redux-undo';
import canvasReducer from './canvasSlice';

export const store = configureStore({
  reducer: {
    canvas: undoable(canvasReducer) // Wrap reducer with Undo/Redo logic
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;