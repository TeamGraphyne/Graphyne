import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store/store";
import {
  fetchHotkeys,
  createHotkey,
  updateHotkey,
  deleteHotkey,
  setEditingId,
} from "../../store/hotkeySlice";
import { RESERVED_KEYS } from "../../types/hotkey";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HotkeyManager({ isOpen, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { items, status, editingId } = useSelector(
    (s: RootState) => s.hotkeys
  );

  const [newAction, setNewAction] = useState("");
  const [newKeys, setNewKeys] = useState("");
  const [editKeys, setEditKeys] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && status === "idle") {
      dispatch(fetchHotkeys());
    }
  }, [isOpen, status, dispatch]);

  const normalise = (keys: string) => keys.toLowerCase().trim();

  const isReserved = (keys: string) =>
    RESERVED_KEYS.map((k) => k.toLowerCase()).includes(normalise(keys));

  const isDuplicate = (keys: string, excludeId?: string) =>
    items.some(
      (h) => normalise(h.keys) === normalise(keys) && h.id !== excludeId
    );

  const handleCreate = () => {
    setError("");

    if (!newAction.trim()) return setError("Action name is required.");
    if (!newKeys.trim()) return setError("Key combination is required.");
    if (isReserved(newKeys))
      return setError(
        "That key combination is reserved by the editor and cannot be used."
      );
    if (isDuplicate(newKeys))
      return setError("That key combination is already assigned.");

    dispatch(
      createHotkey({
        action: newAction.trim(),
        keys: newKeys.trim(),
      })
    );

    setNewAction("");
    setNewKeys("");
  };

  const handleUpdate = (id: string) => {
    setError("");

    if (!editKeys.trim()) return setError("Key combination is required.");
    if (isReserved(editKeys))
      return setError(
        "That key combination is reserved by the editor and cannot be used."
      );
    if (isDuplicate(editKeys, id))
      return setError("That key combination is already assigned.");

    dispatch(updateHotkey({ id, keys: editKeys.trim() }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#16181c] border border-[#2e3140] rounded-2xl w-140 max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3140] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Hotkey Manager
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reserved editor shortcuts cannot be overridden
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Reserved */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
              Reserved (locked)
            </p>
            <div className="grid grid-cols-2 gap-1">
              {RESERVED_KEYS.map((k) => (
                <div
                  key={k}
                  className="flex justify-between px-3 py-1.5 bg-[#0e0f11] rounded-lg border border-[#2e3140]"
                >
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-[10px] text-slate-600">locked</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
              Custom hotkeys
            </p>

            {status === "loading" && (
              <p className="text-xs text-slate-500">Loading...</p>
            )}

            <div className="space-y-1">
              {items.map((hotkey) => (
                <div
                  key={hotkey.id}
                  className="flex items-center gap-2 px-3 py-2 bg-[#0e0f11] rounded-lg border border-[#2e3140]"
                >
                  <span className="text-xs text-white flex-1">
                    {hotkey.action}
                  </span>

                  {editingId === hotkey.id ? (
                    <>
                      <input
                        autoFocus
                        value={editKeys}
                        onChange={(e) => {
                          setEditKeys(e.target.value);
                          setError("");
                        }}
                        className="w-36 text-xs"
                      />
                      <button onClick={() => handleUpdate(hotkey.id)}>
                        Save
                      </button>
                      <button
                        onClick={() => dispatch(setEditingId(null))}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <kbd>{hotkey.keys}</kbd>
                      <button
                        onClick={() => {
                          dispatch(setEditingId(hotkey.id));
                          setEditKeys(hotkey.keys || "");
                          setError("");
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          dispatch(deleteHotkey(hotkey.id))
                        }
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Create */}
          <div>
            <input
              value={newAction}
              onChange={(e) => {
                setNewAction(e.target.value);
                setError("");
              }}
              placeholder="Action name"
            />
            <input
              value={newKeys}
              onChange={(e) => {
                setNewKeys(e.target.value);
                setError("");
              }}
              placeholder="Keys"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button onClick={handleCreate}>Add Hotkey</button>
          </div>
        </div>
      </div>
    </div>
  );
}