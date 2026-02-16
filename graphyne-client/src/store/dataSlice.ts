import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DataSourceData, DataField } from '../types/datasource';

interface DataState {
  // Configured sources for the current project
  sources: DataSourceData[];
  // Live data from polling: { [sourceId]: { "batting.runs": 300, ... } }
  liveData: Record<string, Record<string, unknown>>;
  // Error state per source
  errors: Record<string, string | null>;
}

const initialState: DataState = {
  sources: [],
  liveData: {},
  errors: {},
};

export const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    // Load all sources for a project (from API)
    setSources: (state, action: PayloadAction<DataSourceData[]>) => {
      state.sources = action.payload;
    },

    // Add or update a single source
    upsertSource: (state, action: PayloadAction<DataSourceData>) => {
      const idx = state.sources.findIndex(s => s.id === action.payload.id);
      if (idx !== -1) {
        state.sources[idx] = action.payload;
      } else {
        state.sources.push(action.payload);
      }
    },

    // Remove a source
    removeSource: (state, action: PayloadAction<string>) => {
      state.sources = state.sources.filter(s => s.id !== action.payload);
      delete state.liveData[action.payload];
      delete state.errors[action.payload];
    },

    // Update detected fields for a source
    updateSourceFields: (state, action: PayloadAction<{ sourceId: string; fields: DataField[] }>) => {
      const source = state.sources.find(s => s.id === action.payload.sourceId);
      if (source) {
        source.fields = action.payload.fields;
      }
    },

    // Called when the server pushes a data:update event
    setLiveData: (state, action: PayloadAction<{ sourceId: string; data: Record<string, unknown> }>) => {
      state.liveData[action.payload.sourceId] = action.payload.data;
      // Clear error on successful data
      state.errors[action.payload.sourceId] = null;
    },

    // Called when the server pushes a data:error event
    setError: (state, action: PayloadAction<{ sourceId: string; error: string }>) => {
      state.errors[action.payload.sourceId] = action.payload.error;
    },

    // Clear everything (e.g., when switching projects)
    clearDataState: (state) => {
      state.sources = [];
      state.liveData = {};
      state.errors = {};
    },
  },
});

export const {
  setSources,
  upsertSource,
  removeSource,
  updateSourceFields,
  setLiveData,
  setError,
  clearDataState,
} = dataSlice.actions;

export default dataSlice.reducer;