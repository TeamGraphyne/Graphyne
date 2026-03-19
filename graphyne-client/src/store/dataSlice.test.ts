import { describe, it, expect, beforeEach } from 'vitest';
import reducer, {
  setSources,
  upsertSource,
  removeSource,
  setLiveData,
  setError,
} from './dataSlice';
import type { DataSourceData } from '../types/datasource'; // Adjust path if necessary

describe('dataSlice', () => {
  let initialState: ReturnType<typeof reducer>;

  // A helper to generate a valid mock source so we don't repeat boilerplate
  const createMockSource = (overrides?: Partial<DataSourceData>): DataSourceData => ({
    id: 'src-default',
    projectId: 'proj-123',
    name: 'Default Source',
    type: 'csv-file',
    config: {}, 
    pollingInterval: 5,
    autoStart: true,
    fields: [],
    ...overrides,
  });

  beforeEach(() => {
    initialState = {
      sources: [],
      liveData: {},
      errors: {},
    };
  });

  it('setSources replaces the entire sources array', () => {
    const mockSources: DataSourceData[] = [
      createMockSource({ id: 'src1', name: 'Source 1' }),
      createMockSource({ id: 'src2', name: 'Source 2' }),
    ];
    
    const state = reducer(initialState, setSources(mockSources));
    expect(state.sources).toEqual(mockSources);
    expect(state.sources.length).toBe(2);
  });

  it('upsertSource updates an existing source by ID', () => {
    const originalSource = createMockSource({ id: 'src1', name: 'Old Name' });
    const startState = {
      ...initialState,
      sources: [originalSource]
    };
    
    // Update the name and polling interval
    const updatedSource = createMockSource({ id: 'src1', name: 'New Name', pollingInterval: 10 });
    
    const state = reducer(startState, upsertSource(updatedSource));
    expect(state.sources.length).toBe(1);
    expect(state.sources[0].name).toBe('New Name');
    expect(state.sources[0].pollingInterval).toBe(10);
  });

  it('upsertSource inserts a new source if ID is absent', () => {
    const newSource = createMockSource({ id: 'src-new', name: 'Brand New Source' });
    const state = reducer(initialState, upsertSource(newSource));
    
    expect(state.sources).toContainEqual(newSource);
    expect(state.sources.length).toBe(1);
  });

  it('removeSource deletes from sources, liveData, and errors', () => {
    const startState = {
      sources: [createMockSource({ id: 'src1' })],
      liveData: { 'src1': { score: 10 } },
      errors: { 'src1': 'Network timeout' },
    };

    const state = reducer(startState, removeSource('src1'));
    
    expect(state.sources.length).toBe(0);
    expect(state.liveData['src1']).toBeUndefined();
    expect(state.errors['src1']).toBeUndefined();
  });

  it('setLiveData stores data keyed by sourceId and clears that sources error', () => {
    const startState = { ...initialState, errors: { 'src1': 'Old Error' } };
    const payload = { sourceId: 'src1', data: { matchTime: '45:00', homeScore: 2 } };
    
    const state = reducer(startState, setLiveData(payload));
    
    expect(state.liveData['src1']).toEqual(payload.data);
    expect(state.errors['src1']).toBeNull();
  });

  it('setError stores error message for the correct sourceId', () => {
    const state = reducer(initialState, setError({ sourceId: 'src1', error: 'Failed to authenticate' }));
    
    expect(state.errors['src1']).toBe('Failed to authenticate');
    expect(state.errors['src2']).toBeUndefined(); // Ensure it doesn't bleed
  });
});