import type { Asset, AssetUpdatePayload } from "../types/asset";

const BASE = "http://localhost:3002/api/assets";

export const assetService = {

  // READ — fetch all assets
  fetchAll: (): Promise<Asset[]> =>
    fetch(BASE).then(r => r.json()),

  // CREATE — upload a file with metadata
  upload: (file: File): Promise<Asset> => {
    const form = new FormData();
    form.append("file", file);
    form.append("name", file.name);
    return fetch(BASE, { method: "POST", body: form }).then(r => {
      if (!r.ok) throw new Error("Upload failed");
      return r.json();
    });
  },

  // UPDATE — patch metadata only
  updateMetadata: (id: string, payload: AssetUpdatePayload): Promise<Asset> =>
    fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(r => r.json()),

  // UPDATE — replace the physical file, keep same record ID
  replaceFile: (id: string, file: File): Promise<Asset> => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/${id}/replace`, { method: "PUT", body: form }).then(r => r.json());
  },

  // DELETE — removes DB record + file from disk
  remove: (id: string): Promise<void> =>
    fetch(`${BASE}/${id}`, { method: "DELETE" }).then(r => {
      if (!r.ok) throw new Error("Delete failed");
    }),
};