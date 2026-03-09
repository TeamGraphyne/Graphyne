import type { GuideLine, SnapPoint } from '../types/alignment';
import type { CanvasElement } from '../types/canvas'; 

const SNAP_THRESHOLD = 15;
const GUIDE_COLOR = '#00a1ff';
const SPACING_GUIDE_COLOR = '#ff00ff';


//Snap guides
export function calculateSnapPoints (
    elements: CanvasElement[],
    excludeId: string
    ): { vertical: SnapPoint[]; horizontal: SnapPoint[] } {
        const vertical: SnapPoint[] = [];
        const horizontal: SnapPoint[] = [];

        elements.forEach((el) => {
            if (el.id === excludeId) return;

            const width = el.width || 0;
            const height = el.height || 0;

            //Vertical snap points
            vertical.push (
                {position: el.x, elementId: el.id, type: 'left'},
                {position: el.x + width/2, elementId: el.id, type: 'center'},
                {position: el.x + width, elementId: el.id, type: 'right'}
            );

            //Horizontalsnap points
            horizontal.push(
                {position: el.y, elementId: el.id, type: 'top'},
                {position: el.y + height/2, elementId: el.id, type: 'middle'},
                {position: el.y + height, elementId: el.id, type: 'bottom'}
            );
        });

        return { vertical, horizontal };
    }

//Canvas guides
export function calculateCenterGuides (
    canvasWidth: number,
    canvasHeight: number
): GuideLine[] {
    return [
        {
            id: 'center-v',
            type: 'vertical',
            position: canvasWidth/2,
            label: 'Center',
            color: GUIDE_COLOR,
        },
        {
            id: 'center-h',
            type: 'horizontal',
            position: canvasHeight/2,
            label: 'Center',
            color: GUIDE_COLOR,
        },
    ];
}

//Set visibility of guidelines
export function findActiveGuides (
    draggedElement: {x: number, y: number, width: number, height: number},
    canvasWidth: number,
    canvasHeight: number,
    snapPoints: {vertical: SnapPoint[]; horizontal: SnapPoint[]}
): GuideLine[] {
    const guides: GuideLine[] = [];
    const {x, y, width, height} = draggedElement;

    const left = x;
    const centerX = x + width/2;
    const right = x + width;
    const top = y;
    const middleY = y + height/2;
    const bottom = y + height;

    const canvasCenterX = canvasWidth/2;
    const canvasCenterY = canvasHeight/2;

    //Check canvas center alignment
    if (Math.abs(centerX - canvasCenterX) < SNAP_THRESHOLD) {
        guides.push ({
            id: 'canvas-center-v',
            type: 'vertical',
            position: canvasCenterX,
            label: 'Center',
            color: GUIDE_COLOR,
        });
    }

    if (Math.abs(middleY - canvasCenterY) < SNAP_THRESHOLD) {
        guides.push ({
            id: 'canvas-center-h',
            type: 'horizontal',
            position: canvasCenterY,
            label: 'Center',
            color: GUIDE_COLOR,
        });
    }

    //Checkalignment with other elements
    snapPoints.vertical.forEach((point) => {
        if (Math.abs(left - point.position) < SNAP_THRESHOLD) {
            guides.push ({
                id: `align-v-left-${point.elementId}`,
                type: 'vertical',
                position: point.position,
                color: GUIDE_COLOR,
            });
        }
        if (Math.abs(centerX - point.position) < SNAP_THRESHOLD) {
            guides.push ({
                id: `align-v-center-${point.elementId}`,
                type: 'vertical',
                position: point.position,
                color: GUIDE_COLOR,
            });
        }
        if (Math.abs(right - point.position) < SNAP_THRESHOLD) {
            guides.push ({
                id: `align-v-right-${point.elementId}`,
                type: 'vertical',
                position: point.position,
                color: GUIDE_COLOR,
            });
        }
    });

    snapPoints.horizontal.forEach((point) => {
        if(Math.abs(top - point.position) < SNAP_THRESHOLD) {
            guides.push ({
                id: `align-h-top-${point.elementId}`,
                type: 'horizontal',
                position: point.position,
                color: GUIDE_COLOR,
            });
        }
        if (Math.abs(middleY - point.position) < SNAP_THRESHOLD) {
            guides.push ({
                id: `align-h-middle-${point.elementId}`,
                type: 'horizontal',
                position: point.position,
                color: GUIDE_COLOR,
            });
        }
        if (Math.abs(bottom - point.position) < SNAP_THRESHOLD) {
            guides.push ({
                id: `aligh-h-bottom-${point.elementId}`,
                type: 'horizontal',
                position: point.position,
                color: GUIDE_COLOR,
            });
        }
    });

    return guides;
}

//Detect equal spacing between multiple elements
export function detectSpacingGuides (
    elements: CanvasElement[],
    draggedId: string
): GuideLine[] {
    const guides: GuideLine[] = [];

    //x position
    const sortedByX = [...elements].filter(el => el.id !== draggedId).sort((a, b) => a.x - b.x);

    //y position
    const sortedByY = [...elements].filter(el => el.id !== draggedId).sort((a, b) => a.y - b.y);

    //y position

    const draggedEl = elements.find(el => el.id === draggedId);
    if (!draggedEl) return guides;

    //horizontal spacing (x-axis)
    if (sortedByX.length >= 2) {
        for (let i = 0; i < sortedByX.length - 1; i++) {
            const el1 = sortedByX[i];
            const el2 = sortedByX[i + 1];
            const spacing = el2.x - (el1.x + (el1.width || 0));

            //Chek whether the dragged element is being moved into equal spacing
            const leftSpacing = draggedEl.x - (el1.x + (el1.width || 0));
            const rightSpacing = el2.x - (draggedEl.x + (draggedEl.width || 0));

            if (Math.abs(leftSpacing - spacing) < SNAP_THRESHOLD) {
                const guideX = el1.x + (el1.width || 0) + spacing/2;
                guides.push ({
                    id: `spacing-v-${i}`,
                    type: 'vertical',
                    position: guideX,
                    color: SPACING_GUIDE_COLOR,
                });
            }

            if (Math.abs(rightSpacing - spacing) < SNAP_THRESHOLD) {
                const guideX = draggedEl.x + (draggedEl.width || 0) + spacing/2;
                guides.push ({
                    id: `spacing-v-next-${i}`,
                    type: 'vertical',
                    position: guideX,
                    color: SPACING_GUIDE_COLOR,
                });
            }
        }
    }

    //Vertical spacing (y-axis)
    if (sortedByY.length >= 2) {
        for (let i = 0; i < sortedByY.length - 1; i++) {
            const el1 = sortedByY[i];
            const el2 = sortedByY[i + 1];
            const spacing = el2.y - (el1.y + (el1.height || 0));

            const topSpacing = draggedEl.y - (el1.y + (el1.height || 0));
            const bottomSpacing = el2.y - (draggedEl.y + (draggedEl.height || 0));

            if (Math.abs(topSpacing - spacing) < SNAP_THRESHOLD) {
                const guideY = el1.y + (el1.height || 0) + spacing/2;
                guides.push ({
                    id: `spacing-h-${i}`,
                    type: 'horizontal',
                    position: guideY,
                    color: SPACING_GUIDE_COLOR,
                });
            }
            if (Math.abs(bottomSpacing - spacing) < SNAP_THRESHOLD) {
                const guideY = draggedEl.y + (draggedEl.height || 0) + spacing/2;
                guides.push ({
                    id: `spacing-h-next-${i}`,
                    type: 'horizontal',
                    position: guideY,
                    color: SPACING_GUIDE_COLOR,
                });
            }
        }
    }
    return guides;
}

export function snapToGuide(
  position: number,
  size: number,           // pass width or height
  guides: GuideLine[],
  isVertical: boolean
): number {
  const relevantGuides = guides.filter(g =>
    isVertical ? g.type === 'vertical' : g.type === 'horizontal'
  );

  for (const guide of relevantGuides) {
    if (Math.abs(position - guide.position) < SNAP_THRESHOLD) {
      return guide.position;                // leading edge snap
    }
    if (Math.abs((position + size) - guide.position) < SNAP_THRESHOLD) {
      return guide.position - size;         // trailing edge snap
    }
  }

  return position;
}