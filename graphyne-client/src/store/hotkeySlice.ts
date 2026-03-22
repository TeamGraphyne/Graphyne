import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { hotkeyService } from "../services/hotkeyService";
import type {HotkeyState } from "../types/hotkey";

const initialState: HotkeyState = {
  items: [],
  status: "idle",
  editingId: null,
};

export const fetchHotkeys = createAsyncThunk("hotkeys/fetchAll", async () =>
  hotkeyService.fetchAll()
);

export const createHotkey = createAsyncThunk(
  "hotkeys/create",
  async ({ action, keys }: { action: string; keys: string }) =>
    hotkeyService.create(action, keys)
);

export const updateHotkey = createAsyncThunk(
  "hotkeys/update",
  async ({ id, keys }: { id: string; keys: string }) =>
    hotkeyService.update(id, keys)
);

export const deleteHotkey = createAsyncThunk(
  "hotkeys/delete",
  async (id: string) => {
    await hotkeyService.remove(id);
    return id;
  }
);

const hotkeySlice = createSlice({
  name: "hotkeys",
  initialState,
  reducers: {
    setEditingId(state, action: PayloadAction<string | null>) {
      state.editingId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHotkeys.pending,    (state) => { state.status = "loading"; })
      .addCase(fetchHotkeys.fulfilled,  (state, { payload }) => {
        state.items = payload;
        state.status = "idle";
      })
      .addCase(createHotkey.fulfilled,  (state, { payload }) => {
        state.items.push(payload);
        state.status = "idle";
      })
      .addCase(updateHotkey.pending,    (state) => { state.status = "saving"; })
      .addCase(updateHotkey.fulfilled,  (state, { payload }) => {
        const i = state.items.findIndex(h => h.id === payload.id);
        if (i !== -1) state.items[i] = payload;
        state.status = "idle";
        state.editingId = null;
      })
      .addCase(deleteHotkey.fulfilled,  (state, { payload }) => {
        state.items = state.items.filter(h => h.id !== payload);
      });
  },
});

export const { setEditingId } = hotkeySlice.actions;
export default hotkeySlice.reducer;