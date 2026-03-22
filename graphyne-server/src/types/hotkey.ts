export type Hotkey = {
  id: string;
  action: string;
  keys: string;
  isCustom: boolean;
};

export type HotkeyState = {
  items: Hotkey[];
  status: "idle" | "loading" | "saving" | "error";
  editingId: string | null;
};

// These are locked and cannot be changed by the user
export const RESERVED_KEYS = [
  "Delete",
  "Backspace",
  "Escape",
  "ctrl+z",
  "ctrl+shift+z",
  "ctrl+=",
  "ctrl++",
  "ctrl+-",
  "ctrl+0",
  "ctrl+a",
  "ctrl+d",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "shift+ArrowUp",
  "shift+ArrowDown",
  "shift+ArrowLeft",
  "shift+ArrowRight",
];

// Default hotkeys users can customise or add to
export const DEFAULT_HOTKEYS: Omit<Hotkey, "id">[] = [
  { action: "Add Rectangle",   keys: "r",         isCustom: false },
  { action: "Add Circle",      keys: "c",         isCustom: false },
  { action: "Add Text",        keys: "t",         isCustom: false },
  { action: "Toggle Grid",     keys: "g",         isCustom: false },
  { action: "Toggle Assets",   keys: "a",         isCustom: false },
];