
import { Stage, Layer, Rect, Circle, Text } from 'react-konva';
import { useAppSelector } from '../../store/hooks';

interface PreviewCanvasProps {
  width: number;
  height: number;
}

export const PreviewCanvas = ({ width, height }: PreviewCanvasProps) => {
  // Access Redux state (read-only)
  const { elements, config } = useAppSelector((state) => 
    state.canvas.present || state.canvas
  );

  if (!config) return <div>Loading Preview...</div>;

  // Calculate scale to fit the provided dimensions while maintaining aspect ratio
  const scaleX = width / config.width;
  const scaleY = height / config.height;
  const scale = Math.min(scaleX, scaleY);

  return (
    <div className="flex items-center justify-center w-full h-full bg-black">
      <Stage 
        width={config.width * scale} 
        height={config.height * scale} 
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          {/* Background - use solid color or config background */}
          <Rect 
            name="background"
            width={config.width} 
            height={config.height} 
            fill={config.background || '#292929'}
          />
          
          {/* Render all elements (read-only, no interaction) */}
          {elements.map((el) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {zIndex, type, ...elementProps} = el;
            
            const commonProps = {
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
    </div>
  );
};