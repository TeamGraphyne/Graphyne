import type { Hotkey } from "../types/hotkey";

const BASE = "http://localhost:3001/api/hotkeys";

export const hotkeyService = {
  fetchAll: (): Promise<Hotkey[]> =>
    fetch(BASE).then(r => r.json()),

  create: (action: string, keys: string): Promise<Hotkey> =>
    fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, keys }),
    }).then(r => r.json()),

  update: (id: string, keys: string): Promise<Hotkey> =>
    fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
    }).then(r => r.json()),

  remove: (id: string): Promise<void> =>
    fetch(`${BASE}/${id}`, { method: "DELETE" }).then(() => {}),
};