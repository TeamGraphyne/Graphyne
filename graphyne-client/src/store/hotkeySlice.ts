import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { hotkeyService } from "../services/hotkeyService";
import type { HotkeyState } from "../types/hotkey";

const initialState: HotkeyState = {
  items: [],
  status: "idle",
  editingId: null,
};

export const fetchHotkeys = createAsyncThunk(
  "hotkeys/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await hotkeyService.fetchAll();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return rejectWithValue(err.response?.data || "Failed to fetch hotkeys");
    }
  }
);

export const createHotkey = createAsyncThunk(
  "hotkeys/create",
  async (
    { action, keys }: { action: string; keys: string },
    { rejectWithValue }
  ) => {
    try {
      return await hotkeyService.create(action, keys);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return rejectWithValue(err.response?.data || "Failed to create hotkey");
    }
  }
);

export const updateHotkey = createAsyncThunk(
  "hotkeys/update",
  async (
    { id, keys }: { id: string; keys: string },
    { rejectWithValue }
  ) => {
    try {
      return await hotkeyService.update(id, keys);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return rejectWithValue(err.response?.data || "Failed to update hotkey");
    }
  }
);

export const deleteHotkey = createAsyncThunk(
  "hotkeys/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await hotkeyService.remove(id);
      return id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return rejectWithValue(err.response?.data || "Failed to delete hotkey");
    }
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
      .addCase(fetchHotkeys.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchHotkeys.fulfilled, (state, { payload }) => {
        state.items = payload;
        state.status = "idle";
      })
      .addCase(fetchHotkeys.rejected, (state) => {
        state.status = "error";
      })

      .addCase(createHotkey.pending, (state) => {
        state.status = "saving";
      })
      .addCase(createHotkey.fulfilled, (state, { payload }) => {
        state.items.push(payload);
        state.status = "idle";
      })
      .addCase(createHotkey.rejected, (state) => {
        state.status = "error";
      })

      .addCase(updateHotkey.pending, (state) => {
        state.status = "saving";
      })
      .addCase(updateHotkey.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex((h) => h.id === payload.id);
        if (i !== -1) state.items[i] = payload;
        state.status = "idle";
        state.editingId = null;
      })
      .addCase(updateHotkey.rejected, (state) => {
        state.status = "error";
      })

      .addCase(deleteHotkey.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((h) => h.id !== payload);
      })
      .addCase(deleteHotkey.rejected, (state) => {
        state.status = "error";
      });
  },
});

export const { setEditingId } = hotkeySlice.actions;
export default hotkeySlice.reducer;