import { describe, it, expect, beforeEach } from "vitest";
import reducer, {
  addElement,
  updateElement,
  removeElement,
  selectElement,
  toggleSelection,
  moveLayerUp,
  moveLayerDown,
  duplicateElements,
  setGraphicMeta,
  loadGraphic,
  updateElements,
  toggleVisibility,
  toggleLock,
  reorderElement,
  renameElement,
  nudgeElements,
  setShowGrid,
  setShowAlignmentGuides,
  setSnap,
  setGridStyle,
} from "./canvasSlice";
import type { CanvasElement } from "../types/canvas";

describe("canvasSlice", () => {
  let initialState: ReturnType<typeof reducer>;

  beforeEach(() => {
    initialState = reducer(undefined, { type: "unknown" });
  });

  it("addElement generates a UUID, sets default flags, and selects it", () => {
    const newElement = {
      type: "rect",
      name: "Rectangle",
      x: 0,
      y: 0,
    } as CanvasElement;
    const state = reducer(initialState, addElement(newElement));

    expect(state.elements.length).toBe(1);
    expect(state.elements[0].id).toBeDefined(); // UUID generated
    expect(state.elements[0].isVisible).toBe(true); // Default
    expect(state.elements[0].isLocked).toBe(false); // Default
    expect(state.selectedIds).toContain(state.elements[0].id);
  });

  it("updateElement merges partial changes without overwriting unrelated fields", () => {
    const setupState = reducer(
      initialState,
      addElement({
        type: "rect",
        name: "Original",
        x: 10,
        y: 10,
      } as CanvasElement),
    );
    const elementId = setupState.elements[0].id;

    const nextState = reducer(
      setupState,
      updateElement({ id: elementId, x: 50 }),
    );

    expect(nextState.elements[0].x).toBe(50);
    expect(nextState.elements[0].y).toBe(10); // Untouched
    expect(nextState.elements[0].name).toBe("Original"); // Untouched
  });

  it("removeElement removes from both elements and selectedIds", () => {
    const setupState = reducer(
      initialState,
      addElement({ type: "rect", name: "Rect", x: 0, y: 0 } as CanvasElement),
    );
    const elementId = setupState.elements[0].id;

    expect(setupState.selectedIds).toContain(elementId);

    const nextState = reducer(setupState, removeElement(elementId));
    expect(nextState.elements.length).toBe(0);
    expect(nextState.selectedIds).not.toContain(elementId);
  });

  it("selectElement(null) clears all selections", () => {
    const setupState = reducer(
      initialState,
      addElement({ type: "rect", name: "Rect", x: 0, y: 0 } as CanvasElement),
    );
    const nextState = reducer(setupState, selectElement(null));
    expect(nextState.selectedIds).toEqual([]);
  });

  it("toggleSelection adds ID if absent, removes if present", () => {
    let state = reducer(
      initialState,
      addElement({ type: "rect", name: "Rect", x: 0, y: 0 } as CanvasElement),
    );
    const id = state.elements[0].id;

    // Toggle off
    state = reducer(state, toggleSelection(id));
    expect(state.selectedIds).not.toContain(id);

    // Toggle on
    state = reducer(state, toggleSelection(id));
    expect(state.selectedIds).toContain(id);
  });

  it("moveLayerUp / moveLayerDown swap elements correctly", () => {
    let state = reducer(
      initialState,
      addElement({ type: "rect", name: "Rect 1", x: 0, y: 0 } as CanvasElement),
    );
    state = reducer(
      state,
      addElement({ type: "rect", name: "Rect 2", x: 0, y: 0 } as CanvasElement),
    );

    const id1 = state.elements[0].id;
    const id2 = state.elements[1].id;

    // Move Rect 1 Up
    state = reducer(state, moveLayerUp(id1));
    expect(state.elements[0].id).toBe(id2);
    expect(state.elements[1].id).toBe(id1);

    // Move Rect 1 Down
    state = reducer(state, moveLayerDown(id1));
    expect(state.elements[0].id).toBe(id1);
    expect(state.elements[1].id).toBe(id2);
  });

  it("duplicateElements produces a clone offset by +20/+20 with a new UUID", () => {
    let state = reducer(
      initialState,
      addElement({
        type: "rect",
        name: "Source",
        x: 10,
        y: 10,
      } as CanvasElement),
    );
    const sourceId = state.elements[0].id;

    state = reducer(state, duplicateElements([sourceId]));

    expect(state.elements.length).toBe(2);
    const duplicate = state.elements[1];

    expect(duplicate.id).not.toBe(sourceId); // New UUID
    expect(duplicate.name).toBe("Source Copy");
    expect(duplicate.x).toBe(30); // 10 + 20
    expect(duplicate.y).toBe(30); // 10 + 20
    expect(state.selectedIds).toContain(duplicate.id); // Clone gets selected
  });

  it("setGraphicMeta updates only provided keys", () => {
    const state = reducer(
      initialState,
      setGraphicMeta({ name: "Updated Name" }),
    );
    expect(state.meta.name).toBe("Updated Name");
    expect(state.meta.projectId).toBe(initialState.meta.projectId); // Unchanged
  });

  it("loadGraphic replaces elements and config, clears selectedIds", () => {
    const payload = {
      id: "g-1",
      name: "Graphic 1",
      elements: [{ id: "e-1", type: "rect", x: 0, y: 0 } as CanvasElement],
      config: { width: 1280, height: 720, background: "#fff" },
    };
    const state = reducer(initialState, loadGraphic(payload));
    expect(state.meta.id).toBe("g-1");
    expect(state.elements.length).toBe(1);
    expect(state.config.width).toBe(1280);
    expect(state.selectedIds.length).toBe(0);
  });

  it("updateElements updates multiple elements correctly", () => {
    let state = reducer(
      initialState,
      addElement({ type: "rect", name: "A", x: 0, y: 0 } as CanvasElement),
    );
    state = reducer(
      state,
      addElement({ type: "rect", name: "B", x: 0, y: 0 } as CanvasElement),
    );

    state = reducer(
      state,
      updateElements([
        { id: state.elements[0].id, x: 100 },
        { id: state.elements[1].id, y: 200 },
      ]),
    );

    expect(state.elements[0].x).toBe(100);
    expect(state.elements[1].y).toBe(200);
  });

  it("toggleVisibility and toggleLock work correctly", () => {
    let state = reducer(
      initialState,
      addElement({
        type: "rect",
        name: "Rect",
        isVisible: true,
        isLocked: false,
      } as CanvasElement),
    );
    const id = state.elements[0].id;

    state = reducer(state, toggleVisibility(id));
    expect(state.elements[0].isVisible).toBe(false);

    state = reducer(state, toggleLock(id));
    expect(state.elements[0].isLocked).toBe(true);
  });

  it("reorderElement moves element and updates zIndex", () => {
    let state = reducer(
      initialState,
      addElement({ type: "rect", name: "A" } as CanvasElement),
    );
    state = reducer(
      state,
      addElement({ type: "rect", name: "B" } as CanvasElement),
    );
    state = reducer(
      state,
      addElement({ type: "rect", name: "C" } as CanvasElement),
    );

    // Move C (index 2) to index 0
    state = reducer(state, reorderElement({ fromIndex: 2, toIndex: 0 }));

    expect(state.elements[0].name).toBe("C");
    expect(state.elements[0].zIndex).toBe(0);
    expect(state.elements[1].name).toBe("A");
    expect(state.elements[1].zIndex).toBe(1);
  });

  it("renameElement changes the element name", () => {
    let state = reducer(
      initialState,
      addElement({ type: "rect", name: "Old" } as CanvasElement),
    );
    state = reducer(
      state,
      renameElement({ id: state.elements[0].id, name: "New Name" }),
    );
    expect(state.elements[0].name).toBe("New Name");
  });

  it("nudgeElements skips locked elements", () => {
    let state = reducer(
      initialState,
      addElement({
        type: "rect",
        name: "A",
        x: 10,
        y: 10,
        isLocked: false,
      } as CanvasElement),
    );
    let stateLocked = reducer(
      initialState,
      addElement({
        type: "rect",
        name: "B",
        x: 10,
        y: 10,
        isLocked: true,
      } as CanvasElement),
    );

    const id = state.elements[0].id;
    const idLocked = stateLocked.elements[0].id;

    state = reducer(state, nudgeElements({ ids: [id], dx: 5, dy: -5 }));
    expect(state.elements[0].x).toBe(15);
    expect(state.elements[0].y).toBe(5);

    stateLocked = reducer(
      stateLocked,
      nudgeElements({ ids: [idLocked], dx: 5, dy: -5 }),
    );
    expect(stateLocked.elements[0].x).toBe(10); // Unchanged because it's locked
  });

  it("grid toggle functions update grid state", () => {
    let state = reducer(initialState, setShowGrid(false));
    expect(state.grid.show).toBe(false);

    state = reducer(state, setShowAlignmentGuides(false));
    expect(state.grid.showAlignmentGuides).toBe(false);

    state = reducer(state, setSnap(false));
    expect(state.grid.snap).toBe(false);

    state = reducer(state, setGridStyle("dots"));
    expect(state.grid.style).toBe("dots");
  });
});
