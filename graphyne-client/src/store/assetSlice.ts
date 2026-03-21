import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { assetService } from "../services/assetServices";
import type { Asset, AssetFilter, AssetSort, AssetState, AssetUpdatePayload } from "../types/asset";

const initialState: AssetState = {
  items: [],
  status: "idle",
  filter: "all",
  sort: "newest",
  search: "",
  editingId: null,
  error: null,
};

export const fetchAssets = createAsyncThunk("assets/fetchAll", async () =>
  assetService.fetchAll()
);

export const uploadAsset = createAsyncThunk("assets/upload", async (file: File) =>
  assetService.upload(file)
);

export const updateAsset = createAsyncThunk(
  "assets/update",
  async ({ id, payload }: { id: string; payload: AssetUpdatePayload }) =>
    assetService.updateMetadata(id, payload)
);

export const replaceAssetFile = createAsyncThunk(
  "assets/replaceFile",
  async ({ id, file }: { id: string; file: File }) =>
    assetService.replaceFile(id, file)
);

export const deleteAsset = createAsyncThunk("assets/delete", async (id: string) => {
  await assetService.remove(id);
  return id;
});

const assetSlice = createSlice({
  name: "assets",
  initialState,
  reducers: {
    setFilter(state, action: PayloadAction<AssetFilter>) {
      state.filter = action.payload;
    },
    setSort(state, action: PayloadAction<AssetSort>) {
      state.sort = action.payload;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setEditingId(state, action: PayloadAction<string | null>) {
      state.editingId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchAssets.pending,    (state) => { state.status = "loading"; })
      .addCase(fetchAssets.fulfilled,  (state, { payload }) => { state.items = payload; state.status = "idle"; })
      .addCase(fetchAssets.rejected,   (state) => { state.status = "error"; })
      // upload
      .addCase(uploadAsset.pending,    (state) => { state.status = "uploading"; })
      .addCase(uploadAsset.fulfilled,  (state, { payload }) => { state.items.unshift(payload); state.status = "idle"; })
      .addCase(uploadAsset.rejected,   (state) => { state.status = "error"; })
      // update
      .addCase(updateAsset.pending,    (state) => { state.status = "saving"; })
      .addCase(updateAsset.fulfilled,  (state, { payload }) => {
        const i = state.items.findIndex(a => a.id === payload.id);
        if (i !== -1) state.items[i] = payload;
        state.status = "idle";
        state.editingId = null;
      })
      // replace file
      .addCase(replaceAssetFile.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex(a => a.id === payload.id);
        if (i !== -1) state.items[i] = payload;
      })
      // delete
      .addCase(deleteAsset.fulfilled,  (state, { payload }) => {
        state.items = state.items.filter(a => a.id !== payload);
      });
  },
});

export const { setFilter, setSort, setSearch, setEditingId } = assetSlice.actions;
export default assetSlice.reducer;