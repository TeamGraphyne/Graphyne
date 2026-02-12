import type { GuideLine, SnapPoint } from '../types/alignment';
import type { CanvasElement } from '../types/canvas'; 

const SNAP_THRESHOLD = 5;
const GUIDE_COLOR = '#00a1ff';
const SPACING_GUIDE_COLOR = '#ff00ff';

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