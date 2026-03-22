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
          ? "border-select bg-tab"
          : "border-btnUnfocused hover:border-select hover:bg-white/5 "}`}
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
      <p className="text-sm font-medium text-txt hover:text-txtSelect">Drop files or click to upload</p>
      <p className="text-xs text-txtDisabled mt-1">Images, videos, fonts supported</p>
    </div>
  );
}