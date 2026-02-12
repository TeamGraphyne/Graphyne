
import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text } from 'react-konva';
import { useAppSelector } from '../../store/hooks';

export const PreviewCanvas = () => {
    const { elements, config } = useAppSelector((state) =>
        state.canvas.present || state.canvas
    );

    if (!config) return <div>Loading Preview...</div>

    const scale = 1;

    return (
        <Stage
        wdith={config.width * scale}
        height={config.height * scale}
        scaleX={scale}
        scaleY={scale}
        >
            <Layer>
                <Rect
                    name="background"
                    width={config.width}
                    height={config.height}
                    fill={config.background || '#292929'}
                />

                {elements.map((el) => {
                    const {zIndex, type, ...elementProps} = el;

                    const commonProps ={
                        ...elementProps,
                        draggable: false,
                        listening: false,
                    };

                    if (el.isVisible === false) return null;

                    if (el.type === 'rect') return <Rect key={el.id} {...commonProps} />;
                    if (el.type === 'circle') return <Circle key={el.id} {...commonProps} />;
                    if (el.type === 'text') return <Text key={el.id} {...commonProps} />;
                    return null;
                })}
            </Layer>
        </Stage>
    );
};