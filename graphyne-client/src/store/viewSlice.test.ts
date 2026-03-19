import { describe, it, expect, beforeEach } from 'vitest';
import reducer, { zoomIn, zoomOut, setZoom } from './viewSlice';

describe('viewSlice', () => {
  let initialState: ReturnType<typeof reducer>;

  beforeEach(() => {
    initialState = { zoom: 1 };
  });

  it('zoomIn increments by 0.1 and clamps at 3.0', () => {
    let state = reducer(initialState, zoomIn());
    expect(state.zoom).toBeCloseTo(1.1);

    state = reducer({ zoom: 2.95 }, zoomIn());
    expect(state.zoom).toBe(3.0);
  });

  it('zoomOut decrements by 0.1 and clamps at 0.2', () => {
    let state = reducer(initialState, zoomOut());
    expect(state.zoom).toBeCloseTo(0.9);

    state = reducer({ zoom: 0.25 }, zoomOut());
    expect(state.zoom).toBe(0.2);
  });

  it('setZoom with out-of-range value is clamped', () => {
    let state = reducer(initialState, setZoom(5.0));
    expect(state.zoom).toBe(3.0);

    state = reducer(initialState, setZoom(-1.0));
    expect(state.zoom).toBe(0.2);

    state = reducer(initialState, setZoom(1.5));
    expect(state.zoom).toBe(1.5);
  });
});