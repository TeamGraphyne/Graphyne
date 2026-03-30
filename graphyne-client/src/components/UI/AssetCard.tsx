import { useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../store/store";
import { deleteAsset, setEditingId } from "../../store/assetSlice";
import type { Asset } from "../../types/asset";
import { addElement } from "../../store/canvasSlice";

type Props = { asset: Asset };

const TYPE_ICON: Record<string, string> = {
  image: "🖼",
  video: "▶",
  font: "T",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetCard({ asset }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    dispatch(deleteAsset(asset.id));
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(setEditingId(asset.id));
  };

  const handleAddToCanvas = () => {
    if (asset.type !== "image") return;
    const img = new window.Image();
    img.onload = () => {
      const maxSize = 500;
      const scale = Math.min(1, maxSize / img.width, maxSize / img.height);
      dispatch(addElement({
        type: "image",
        name: asset.name,
        x: 100,
        y: 100,
        width: img.width * scale,
        height: img.height * scale,
        src: `http://localhost:3002/uploads/${asset.filePath}`,
        opacity: 1,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        isLocked: false,
        isVisible: true,
        fill: "transparent",
        inAnimation: { type: "fade", duration: 0.5, delay: 0, ease: "power1.out" },
        outAnimation: { type: "fade", duration: 0.5, delay: 0, ease: "power1.out" },
      }));
    };
    img.src = `http://localhost:3002/uploads/${asset.filePath}`;
  };

  return (
    <div className="group relative bg-tab border border-border rounded-xl overflow-hidden hover:border-btn transition-all">

      {/* Thumbnail — clicking anywhere here adds to canvas */}
      <div
        onClick={asset.type === "image" ? handleAddToCanvas : undefined}
        className={`relative aspect-video bg-tab flex items-center justify-center overflow-hidden ${asset.type === "image" ? "cursor-pointer" : ""}`}
      >
        {asset.type === "image" ? (
          <img
            src={`http://localhost:3002/uploads/${asset.filePath}`}
            alt={asset.altText ?? asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl opacity-40">{TYPE_ICON[asset.type]}</span>
        )}

        {/* Edit + Delete buttons overlaid on thumbnail */}
        <div className="absolute inset-0 bg-tab opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={handleEdit}
            className="bg-tab border border-btn text-xs text-txt px-3 py-1.5 rounded-lg hover:border-hover transition-all"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all
              ${confirmDelete
                ? "bg-red-500/20 border-red-500 text-red-400"
                : "bg-tab border-btn text-txt hover:border-red-500/50"}`}
          >
            {confirmDelete ? "Confirm" : "Delete"}
          </button>
        </div>
      </div>

      {/* Info bar — always visible below thumbnail */}
      <div className="px-3 py-2">
        <p className="text-xs font-medium text-txt truncate">{asset.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium
            ${asset.type === "image" ? "bg-btn2 text-txtDisabled" :
              asset.type === "video" ? "bg-btn3 text-txtDisabled" :
              "bg-green-800/30 text-txt"}`}>
            {asset.type}
          </span>
          <span className="text-[10px] text-txt">{formatSize(asset.fileSize)}</span>
        </div>
      </div>

    </div>
  );
}