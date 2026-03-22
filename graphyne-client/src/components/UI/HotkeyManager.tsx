import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store/store";
import {
  fetchHotkeys, createHotkey, updateHotkey,
  deleteHotkey, setEditingId
} from "../../store/hotkeySlice";
import { RESERVED_KEYS, DEFAULT_HOTKEYS } from "../../types/hotkey";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HotkeyManager({ isOpen, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { items, status, editingId } = useSelector((s: RootState) => s.hotkeys);

  const [newAction, setNewAction] = useState("");
  const [newKeys, setNewKeys]     = useState("");
  const [editKeys, setEditKeys]   = useState("");
  const [error, setError]         = useState("");

  useEffect(() => {
    if (isOpen) dispatch(fetchHotkeys());
  }, [isOpen, dispatch]);

  // Normalise key combo for comparison e.g "Ctrl+S" → "ctrl+s"
  const normalise = (keys: string) => keys.toLowerCase().trim();

  const isReserved = (keys: string) =>
    RESERVED_KEYS.map(k => k.toLowerCase()).includes(normalise(keys));

  const isDuplicate = (keys: string, excludeId?: string) =>
    items.some(h => normalise(h.keys) === normalise(keys) && h.id !== excludeId);

  // CREATE
  const handleCreate = () => {
    setError("");
    if (!newAction.trim()) return setError("Action name is required.");
    if (!newKeys.trim())   return setError("Key combination is required.");
    if (isReserved(newKeys)) return setError("That key combination is reserved by the editor and cannot be used.");
    if (isDuplicate(newKeys)) return setError("That key combination is already assigned.");
    dispatch(createHotkey({ action: newAction.trim(), keys: newKeys.trim() }));
    setNewAction("");
    setNewKeys("");
  };

  // UPDATE
  const handleUpdate = (id: string) => {
    setError("");
    if (!editKeys.trim()) return setError("Key combination is required.");
    if (isReserved(editKeys)) return setError("That key combination is reserved by the editor and cannot be used.");
    if (isDuplicate(editKeys, id)) return setError("That key combination is already assigned.");
    dispatch(updateHotkey({ id, keys: editKeys.trim() }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#16181c] border border-[#2e3140] rounded-2xl w-[560px] max-h-[80vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3140] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">Hotkey Manager</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reserved editor shortcuts cannot be overridden
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Reserved keys — read only display */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Reserved (locked)
            </p>
            <div className="grid grid-cols-2 gap-1">
              {RESERVED_KEYS.map(k => (
                <div key={k} className="flex items-center justify-between px-3 py-1.5 bg-[#0e0f11] rounded-lg border border-[#2e3140]">
                  <span className="text-xs text-slate-500 truncate">{k}</span>
                  <span className="text-[10px] text-slate-600 ml-2 shrink-0">locked</span>
                </div>
              ))}
            </div>
          </div>

          {/* User-defined hotkeys */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Custom hotkeys
            </p>
            {status === "loading" && (
              <p className="text-xs text-slate-500">Loading...</p>
            )}
            {items.length === 0 && status !== "loading" && (
              <p className="text-xs text-slate-500">No custom hotkeys yet.</p>
            )}
            <div className="space-y-1">
              {items.map(hotkey => (
                <div key={hotkey.id} className="flex items-center gap-2 px-3 py-2 bg-[#0e0f11] rounded-lg border border-[#2e3140]">
                  <span className="text-xs text-white flex-1 truncate">{hotkey.action}</span>

                  {editingId === hotkey.id ? (
                    <>
                      <input
                        autoFocus
                        value={editKeys}
                        onChange={e => setEditKeys(e.target.value)}
                        placeholder="e.g. ctrl+shift+r"
                        className="bg-[#16181c] border border-[#2e3140] rounded px-2 py-1 text-xs text-white w-36 focus:outline-none focus:border-violet-500"
                      />
                      <button
                        onClick={() => handleUpdate(hotkey.id)}
                        disabled={status === "saving"}
                        className="text-xs px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => dispatch(setEditingId(null))}
                        className="text-xs px-2 py-1 border border-[#2e3140] text-slate-400 hover:text-white rounded"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <kbd className="bg-[#2a2d35] border border-[#3a3f50] rounded px-2 py-0.5 text-xs font-mono text-slate-300">
                        {hotkey.keys}
                      </kbd>
                      <button
                        onClick={() => { dispatch(setEditingId(hotkey.id)); setEditKeys(hotkey.keys); setError(""); }}
                        className="text-xs text-slate-500 hover:text-violet-400 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => dispatch(deleteHotkey(hotkey.id))}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Create new hotkey */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Add new hotkey
            </p>
            <div className="space-y-2">
              <input
                value={newAction}
                onChange={e => setNewAction(e.target.value)}
                placeholder="Action name (e.g. Toggle Sidebar)"
                className="w-full bg-[#0e0f11] border border-[#2e3140] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              />
              <input
                value={newKeys}
                onChange={e => setNewKeys(e.target.value)}
                placeholder="Keys (e.g. ctrl+shift+s)"
                className="w-full bg-[#0e0f11] border border-[#2e3140] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              />
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              <button
                onClick={handleCreate}
                className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Add Hotkey
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}