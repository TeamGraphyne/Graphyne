import type { GuideLine, SnapPoint } from '../types/alignment';
import type { CanvasElement } from '../types/canvas'; 

const SNAP_THRESHOLD = 5;
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
export function CalculateCenterGuides (
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

