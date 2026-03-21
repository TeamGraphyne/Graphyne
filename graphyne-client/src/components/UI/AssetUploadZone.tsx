import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../store/store";
import { uploadAsset } from "../../store/assetSlice";

const ACCEPTED = ".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.ttf,.otf,.woff,.woff2";

export default function AssetUploadZone() {
  const dispatch = useDispatch<AppDispatch>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => dispatch(uploadAsset(file)));
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
        ${dragging
          ? "border-violet-500 bg-violet-500/10"
          : "border-[#2e3140] hover:border-violet-500/50 hover:bg-white/5"}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      <div className="text-3xl mb-2">↑</div>
      <p className="text-sm font-medium text-white">Drop files or click to upload</p>
      <p className="text-xs text-slate-500 mt-1">Images, videos, fonts supported</p>
    </div>
  );
}