import { describe, it, expect, vi } from 'vitest';
import { resolveBindings, pushUpdatesToIframe, getBindableProperties } from './dataResolver';
import type { CanvasElement } from '../types/canvas';

describe('dataResolver utilities', () => {
  describe('resolveBindings', () => {
    it('returns an empty array when no elements have bindings', () => {
      const elements = [{ id: '1', type: 'text' }] as CanvasElement[];
      const result = resolveBindings(elements, 'src-1', { data: 'value' });
      expect(result).toEqual([]);
    });

    it('skips bindings whose sourceId doesnt match', () => {
      const elements = [
        {
          id: '1',
          type: 'text',
          dataBindings: [{ sourceId: 'src-1', fieldPath: 'score', targetProperty: 'text' }]
        }
      ] as CanvasElement[];
      
      const result = resolveBindings(elements, 'src-2', { score: 10 });
      expect(result).toEqual([]);
    });

    it('applies a format template replacing {{value}}', () => {
      const elements = [
        {
          id: '1',
          type: 'text',
          dataBindings: [{ sourceId: 'src-1', fieldPath: 'score', targetProperty: 'text', format: 'Score: {{value}}' }]
        }
      ] as CanvasElement[];
      
      const result = resolveBindings(elements, 'src-1', { score: 42 });
      expect(result[0].value).toBe('Score: 42');
    });

    it('returns raw value when no format template is set', () => {
      const elements = [
        {
          id: '1',
          type: 'text',
          dataBindings: [{ sourceId: 'src-1', fieldPath: 'score', targetProperty: 'text' }]
        }
      ] as CanvasElement[];
      
      const result = resolveBindings(elements, 'src-1', { score: 42 });
      expect(result[0].value).toBe(42);
    });
  });

  describe('pushUpdatesToIframe', () => {
    it('calls postMessage with gfx- prefixed element IDs', () => {
      const mockPostMessage = vi.fn();
      const mockIframe = {
        contentWindow: { postMessage: mockPostMessage }
      } as unknown as HTMLIFrameElement;

      const updates = [{ elementId: '123-abc', property: 'text', value: 'Hello' }];
      pushUpdatesToIframe(mockIframe, updates);

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'data:update',
          updates: [{ elementId: 'gfx-123-abc', property: 'text', value: 'Hello' }]
        },
        '*'
      );
    });

    it('does nothing when iframe is null or updates are empty', () => {
      expect(() => pushUpdatesToIframe(null, [{ elementId: '1', property: 'p', value: 'v' }])).not.toThrow();
      
      const mockPostMessage = vi.fn();
      const mockIframe = { contentWindow: { postMessage: mockPostMessage } } as unknown as HTMLIFrameElement;
      pushUpdatesToIframe(mockIframe, []);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('getBindableProperties', () => {
    it('exposes text and fontSize for text elements', () => {
      const props = getBindableProperties('text');
      const keys = props.map(p => p.key);
      expect(keys).toContain('text');
      expect(keys).toContain('fontSize');
      expect(keys).toContain('fill');
    });

    it('exposes src for image elements but not text', () => {
      const props = getBindableProperties('image');
      const keys = props.map(p => p.key);
      expect(keys).toContain('src');
      expect(keys).not.toContain('text');
    });
  });
});