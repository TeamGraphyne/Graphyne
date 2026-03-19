import { describe, it, expect } from 'vitest';
import {
  calculateSnapPoints,
  findActiveGuides,
  snapToGuide,
  detectSpacingGuides,
} from './alignmentGuides';
import type { CanvasElement } from '../types/canvas';

describe('alignmentGuides', () => {
  const mockElements: CanvasElement[] = [
    { id: '1', type: 'rect', x: 100, y: 100, width: 50, height: 50 } as CanvasElement,
    { id: '2', type: 'rect', x: 200, y: 100, width: 50, height: 50 } as CanvasElement,
  ];

  it('calculateSnapPoints excludes the dragged elements own ID', () => {
    const { vertical, horizontal } = calculateSnapPoints(mockElements, '1');
    expect(vertical.every(p => p.elementId !== '1')).toBe(true);
    expect(horizontal.every(p => p.elementId !== '1')).toBe(true);
  });

  it('calculateSnapPoints returns correct left/center/right vertical points', () => {
    const { vertical } = calculateSnapPoints(mockElements, '1');
    const el2Points = vertical.filter(p => p.elementId === '2');
    expect(el2Points).toEqual([
      { position: 200, elementId: '2', type: 'left' },
      { position: 225, elementId: '2', type: 'center' }, // 200 + 50/2
      { position: 250, elementId: '2', type: 'right' },
    ]);
  });

  it('findActiveGuides returns a canvas-center guide when elements center-X is within threshold', () => {
    const dragged = { x: 495, y: 100, width: 10, height: 10 }; // CenterX = 500
    const guides = findActiveGuides(dragged, 1000, 1000, { vertical: [], horizontal: [] });
    expect(guides.some(g => g.id === 'canvas-center-v')).toBe(true);
  });

  it('findActiveGuides returns no guides when no element is near a snap point', () => {
    const dragged = { x: 0, y: 0, width: 10, height: 10 };
    const snapPoints = {
      vertical: [{ position: 500, elementId: '2', type: 'left' as const }],
      horizontal: []
    };
    const guides = findActiveGuides(dragged, 2000, 2000, snapPoints);
    expect(guides.length).toBe(0);
  });

  it('snapToGuide returns the guide position when within threshold', () => {
    const guides = [{ id: '1', type: 'vertical' as const, position: 100, color: 'red', label: '' }];
    const snapped = snapToGuide(95, guides, true);
    expect(snapped).toBe(100);
  });

  it('snapToGuide returns the original position when outside threshold', () => {
    const guides = [{ id: '1', type: 'vertical' as const, position: 100, color: 'red', label: '' }];
    const snapped = snapToGuide(50, guides, true);
    expect(snapped).toBe(50);
  });

it('detectSpacingGuides returns a spacing guide when equal gaps are detected', () => {
    const elements: CanvasElement[] = [
      { id: '1', type: 'rect', x: 100, y: 10, width: 50, height: 50 } as CanvasElement,
      { id: '2', type: 'rect', x: 250, y: 200, width: 50, height: 50 } as CanvasElement,
      { id: 'dragged', type: 'rect', x: 245, y: 500, width: 50, height: 50 } as CanvasElement,
    ];
    
    const guides = detectSpacingGuides(elements, 'dragged');
    expect(guides.length).toBeGreaterThan(0);
    expect(guides[0].type).toBe('vertical');
  });
});