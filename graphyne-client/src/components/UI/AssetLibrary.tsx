import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store/store";
import { fetchAssets, setFilter, setSort, setSearch } from "../../store/assetSlice";
import type { AssetFilter, AssetSort } from "../../types/asset";
import AssetCard from "./AssetCard";
import AssetUploadZone from "./AssetUploadZone";
import AssetEditModal from "./AssetEditModal";

export default function AssetLibrary() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, status, filter, sort, search, editingId } = useSelector((s: RootState) => s.assets);

  useEffect(() => { dispatch(fetchAssets()); }, [dispatch]);

  const filtered = items
    .filter(a => filter === "all" || a.type === filter)
    .filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      if (sort === "oldest") return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      if (sort === "name")   return a.name.localeCompare(b.name);
      if (sort === "size")   return b.fileSize - a.fileSize;
      return 0;
    });

  const FILTERS: { label: string; value: AssetFilter }[] = [
    { label: "All", value: "all" },
    { label: "Images", value: "image" },
    { label: "Videos", value: "video" },
    { label: "Fonts", value: "font" },
  ];

  return (
    <div className="h-full flex flex-col bg-tab text-txt">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-base font-semibold">Asset Library</h1>
          <p className="text-xs text-txtDisabled  mt-0.5">{items.length} asset{items.length !== 1 ? "s" : ""}</p>
        </div>
        {status === "uploading" && (
          <span className="text-xs text-select animate-pulse">Uploading...</span>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border flex-wrap">
        {/* Search */}
        <input
          value={search}
          onChange={e => dispatch(setSearch(e.target.value))}
          placeholder="Search by name or tag..."
          className="bg-tab border border-border rounded-lg px-3 py-1.5 text-xs text-txt w-52 focus:outline-none focus:border-select hover:border-hover"
        />

        {/* Filter tabs */}
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => dispatch(setFilter(f.value))}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all
                ${filter === f.value
                  ? "bg-select text-tab"
                  : "text-txtDisabled hover:text-txtSelect hover:bg-hover"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => dispatch(setSort(e.target.value as AssetSort))}
          className="ml-auto bg-tab border border-border rounded-lg px-3 py-1.5 text-xs text-txt focus:outline-none focus:border-select hover:border-hover focus:text-txtSelect"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="size">Largest first</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Upload zone */}
        <AssetUploadZone />

        {/* Grid */}
        {status === "loading" ? (
          <p className="text-xs text-txtDisabled text-center py-12">Loading assets...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-txtDisabled text-center py-12">No assets match your filter.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(asset => <AssetCard key={asset.id} asset={asset} />)}
          </div>
        )}
      </div>

      {editingId && <AssetEditModal />}
    </div>
  );
}