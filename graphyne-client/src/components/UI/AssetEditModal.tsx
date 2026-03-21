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
    <div className="fixed inset-0 bg-blur backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-tab border border-border rounded-2xl w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-txt">Edit asset</h2>
          <button onClick={() => dispatch(setEditingId(null))} className="text-txtDisabled hover:text-txt text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-txt mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-tab border border-border rounded-lg px-3 py-2 text-sm text-txt focus:border-select focus:outline-none hover:border-hover"
            />
          </div>

          {/* Alt text (images only) */}
          {asset.type === "image" && (
            <div>
              <label className="block text-xs text-txt mb-1">Alt text</label>
              <input
                value={altText}
                onChange={e => setAltText(e.target.value)}
                className="w-full bg-tab border border-border rounded-lg px-3 py-2 text-sm text-txt focus:outline-none focus:border-select hover:border-hover"
              />
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs text-txt mb-1">Tags</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-lgOrngDis text-txtSelect text-xs px-2 py-0.5 rounded-full">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-txtSelect leading-none">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()}
                placeholder="Add tag..."
                className="flex-1 bg-tab border border-border rounded-lg px-3 py-2 text-sm text-txt focus:outline-none focus:border-select hover:border-hover"
              />
              <button onClick={addTag} className="px-3 py-2 text-xs border border-border rounded-lg text-txt hover:text-txtSelect hover:border-select transition-all">Add</button>
            </div>
          </div>

          {/* Replace file */}
          <div>
            <label className="block text-xs text-txt mb-1">Replace file</label>
            <input ref={fileRef} type="file" className="hidden" onChange={handleReplace} />
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs px-3 py-2 border border-dashed border-border rounded-lg text-txtDisabled hover:border-hover hover:text-txt transition-all w-full"
            >
              Choose replacement file (keeps same ID)
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={() => dispatch(setEditingId(null))} className="px-4 py-2 text-xs border border-border rounded-lg text-txt hover:text-txtSelect">Cancel</button>
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="px-4 py-2 text-xs bg-linear-to-r from-lgOrngDis to-lgPurpDis 
                             hover:from-logoOrange hover:to-logoPurple rounded-lg 
                             text-txt font-medium disabled:opacity-50 hover:text-txtSelect"
          >
            {status === "saving" ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}