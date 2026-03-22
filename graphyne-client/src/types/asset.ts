export type AssetType = "image" | "video" | "font";

export type Asset = {
  id: string;
  name: string;
  type: AssetType;
  mimeType: string;
  filePath: string;
  fileSize: number;
  altText: string | null;
  tags: string[];
  uploadedAt: string;
  updatedAt: string;
};

export type AssetUpdatePayload = {
  name?: string;
  altText?: string;
  tags?: string[];
};

export type AssetFilter = "all" | AssetType;
export type AssetSort = "newest" | "oldest" | "name" | "size";

export type AssetState = {
  items: Asset[];
  status: "idle" | "loading" | "uploading" | "saving" | "error";
  filter: AssetFilter;
  sort: AssetSort;
  search: string;
  editingId: string | null;
  error: string | null;
};