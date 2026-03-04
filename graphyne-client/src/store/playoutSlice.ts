import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type GraphicType = "SERVER" | "LOCAL_HTML";

export interface PlaylistItem {
  id: string;
  name: string;
  type: GraphicType;
  filePath?: string;      // for server graphics
  htmlContent?: string;   // for imported local HTML
}

interface PlayoutState {
  rundown: PlaylistItem[];
  previewItem: PlaylistItem | null;
  programItem: PlaylistItem | null;
}

const initialState: PlayoutState = {
  rundown: [],
  previewItem: null,
  programItem: null,
};

export const playoutSlice = createSlice({
  name: "playout",
  initialState,
  reducers: {
    //  ADD HTML TO RUNDOWN
    addLocalHtmlGraphic: (state, action: PayloadAction<PlaylistItem>) => {
      state.rundown.push(action.payload);
    },

    // SET PREVIEW
    setPreviewItem: (state, action: PayloadAction<PlaylistItem | null>) => {
      state.previewItem = action.payload;
    },

    // TAKE
    takeToProgram: (state) => {
      state.programItem = state.previewItem;
    },

    //  CLEAR
    clearProgram: (state) => {
      state.programItem = null;
    },

    // OPTIONAL: REMOVE FROM RUNDOWN
    removeFromRundown: (state, action: PayloadAction<string>) => {
      state.rundown = state.rundown.filter(
        item => item.id !== action.payload
      );
    }
  },
});

export const {
  addLocalHtmlGraphic,
  setPreviewItem,
  takeToProgram,
  clearProgram,
  removeFromRundown
} = playoutSlice.actions;

export default playoutSlice.reducer;