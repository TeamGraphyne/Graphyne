import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store/store";
import { updateAsset, replaceAssetFile, setEditingId } from "../../store/assetSlice";

export default function AssetEditModal() {
  const dispatch = useDispatch<AppDispatch>();
  const { editingId, items, status } = useSelector((s: RootState) => s.assets);
  const asset = items.find(a => a.id === editingId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [altText, setAltText] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setAltText(asset.altText ?? "");
      setTags(asset.tags);
    }
  }, [asset]);

  if (!asset) return null;

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) setTags(prev => [...prev, trimmed]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleSave = () => {
    dispatch(updateAsset({ id: asset.id, payload: { name, altText, tags } }));
  };

  const handleReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) dispatch(replaceAssetFile({ id: asset.id, file }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#16181c] border border-[#2e3140] rounded-2xl w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3140]">
          <h2 className="text-sm font-medium text-white">Edit asset</h2>
          <button onClick={() => dispatch(setEditingId(null))} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#0e0f11] border border-[#2e3140] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Alt text (images only) */}
          {asset.type === "image" && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Alt text</label>
              <input
                value={altText}
                onChange={e => setAltText(e.target.value)}
                className="w-full bg-[#0e0f11] border border-[#2e3140] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tags</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-violet-500/15 text-violet-400 text-xs px-2 py-0.5 rounded-full">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-white leading-none">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()}
                placeholder="Add tag..."
                className="flex-1 bg-[#0e0f11] border border-[#2e3140] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
              <button onClick={addTag} className="px-3 py-2 text-xs border border-[#2e3140] rounded-lg text-slate-400 hover:text-white hover:border-violet-500 transition-all">Add</button>
            </div>
          </div>

          {/* Replace file */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Replace file</label>
            <input ref={fileRef} type="file" className="hidden" onChange={handleReplace} />
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs px-3 py-2 border border-dashed border-[#2e3140] rounded-lg text-slate-500 hover:border-violet-500/50 hover:text-slate-300 transition-all w-full"
            >
              Choose replacement file (keeps same ID)
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2e3140]">
          <button onClick={() => dispatch(setEditingId(null))} className="px-4 py-2 text-xs border border-[#2e3140] rounded-lg text-slate-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="px-4 py-2 text-xs bg-violet-600 hover:bg-violet-700 rounded-lg text-white font-medium disabled:opacity-50"
          >
            {status === "saving" ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}