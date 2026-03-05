import type { CanvasElement } from '../types/canvas';

// A single resolved update to push into an iframe
export interface ResolvedUpdate {
  elementId: string;     // Raw UUID (without gfx- prefix)
  property: string;      // CSS/DOM property name
  value: unknown;        // The resolved value
}

/**
 * Given a graphic's elements and incoming live data for one source,
 * resolve all matching bindings into concrete DOM updates.
 */
export function resolveBindings(
  elements: CanvasElement[],
  sourceId: string,
  data: Record<string, unknown>
): ResolvedUpdate[] {
  const updates: ResolvedUpdate[] = [];

  for (const el of elements) {
    if (!el.dataBindings || el.dataBindings.length === 0) continue;

    for (const binding of el.dataBindings) {
      // Only process bindings that match this source
      if (binding.sourceId !== sourceId) continue;

      const rawValue = data[binding.fieldPath];
      if (rawValue === undefined) continue;

      // Apply format template if present
      let value: unknown = rawValue;
      if (binding.format && typeof rawValue !== 'undefined') {
        value = binding.format.replace(/\{\{value\}\}/g, String(rawValue));
      }

      updates.push({
        elementId: el.id,
        property: binding.targetProperty,
        value,
      });
    }
  }

  return updates;
}

/**
 * Push resolved data updates into an iframe via postMessage.
 * The exported HTML graphic has a listener that handles these.
 */
export function pushUpdatesToIframe(
  iframe: HTMLIFrameElement | null,
  updates: ResolvedUpdate[]
): void {
  if (!iframe?.contentWindow || updates.length === 0) return;

  iframe.contentWindow.postMessage(
    {
      type: 'data:update',
      updates: updates.map((u) => ({
        // Apply the GFX prefix rule from the exporter
        elementId: `gfx-${u.elementId}`,
        property: u.property,
        value: u.value,
      })),
    },
    '*'
  );
}

/**
 * Returns the list of bindable properties for a given element type.
 * Used by the DataBindingTab UI to populate the dropdown.
 */
export function getBindableProperties(elementType: CanvasElement['type']): { key: string; label: string }[] {
  const common = [
    { key: 'fill', label: 'Fill Color' },
    { key: 'opacity', label: 'Opacity' },
  ];

  switch (elementType) {
    case 'text':
      return [
        { key: 'text', label: 'Text Content' },
        { key: 'fontSize', label: 'Font Size' },
        ...common,
      ];
    case 'image':
      return [
        { key: 'src', label: 'Image URL' },
        ...common,
      ];
    case 'rect':
    case 'circle':
    default:
      return common;
  }
}