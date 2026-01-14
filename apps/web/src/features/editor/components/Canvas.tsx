import { useRef, useState } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';

export function Canvas({ width = 1920, height = 1080 }) {
  const stageRef = useRef(null);
  const [scale] = useState(0.5); 

  return (
    <div className="canvas-container" style={{ overflow: 'auto', height: '100%' }}>
      <Stage
        ref={stageRef}
        width={width * scale}
        height={height * scale}
        scaleX={scale}
        scaleY={scale}
        style={{ background: '#2a2a3e' }}
      >
        <Layer>
          <Rect x={100} y={100} width={200} height={100} fill="#7b2cbf" draggable />
          <Text x={100} y={250} text="Graphyne Canvas" fontSize={32} fill="#fff" draggable />
        </Layer>
      </Stage>
    </div>
  );
}