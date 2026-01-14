import { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Transformer } from 'react-konva';
import { useAppSelector, useAppDispatch } from '../../../stores/hooks';
import { updateLayer, selectLayer } from '../stores/editorSlice';

export function CanvasArea() {
  const dispatch = useAppDispatch();
  const layers = useAppSelector((state) => state.editor.layers);
  const selectedId = useAppSelector((state) => state.editor.selectedLayerId);
  
  const trRef = useRef<any>(null); // Transformer reference

  // Effect to attach transformer to selected node
  useEffect(() => {
    if (selectedId && trRef.current) {
      const stage = trRef.current.getStage();
      const selectedNode = stage.findOne('.' + selectedId);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        trRef.current.getLayer().batchDraw();
      }
    } else if (trRef.current) {
      trRef.current.nodes([]); // Clear selection
    }
  }, [selectedId, layers]);

  return (
    <div className="flex-1 bg-gray-800 overflow-hidden flex justify-center items-center">
      <Stage width={800} height={450} className="bg-black shadow-lg">
        <Layer>
          {/* Render all layers */}
          {layers.map((layer) => {
            const commonProps = {
              key: layer.id,
              id: layer.id,
              name: layer.id,
              x: layer.x,
              y: layer.y,
              rotation: layer.rotation,
              draggable: true,
              onClick: () => dispatch(selectLayer(layer.id)),
              onDragEnd: (e: any) => {
                dispatch(updateLayer({
                  id: layer.id,
                  x: e.target.x(),
                  y: e.target.y()
                }));
              },
              onTransformEnd: (e: any) => {
                 // Sync resize data back to Redux
                 const node = e.target;
                 dispatch(updateLayer({
                   id: layer.id,
                   x: node.x(),
                   y: node.y(),
                   width: node.width() * node.scaleX(),
                   height: node.height() * node.scaleY(),
                   rotation: node.rotation(),
                 }));
                 // Reset scale to avoid side effects
                 node.scaleX(1);
                 node.scaleY(1);
              }
            };

            if (layer.type === 'rect') {
              return <Rect {...commonProps} width={layer.width} height={layer.height} fill={layer.fill} />;
            }
            if (layer.type === 'text') {
              return <Text {...commonProps} text={layer.text} fontSize={layer.fontSize} fill={layer.fill} />;
            }
            return null;
          })}

          {/* The Transformer */}
          <Transformer ref={trRef} />
        </Layer>
      </Stage>
    </div>
  );
}