import { configureStore } from '@reduxjs/toolkit';
import undoable from 'redux-undo';
import canvasReducer from './canvasSlice';
import playoutReducer from "./playoutSlice";

export const store = configureStore({
  reducer: {
    // Limit history to 50 steps
    canvas: undoable(canvasReducer, { limit: 50 }),
    playout: playoutReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;