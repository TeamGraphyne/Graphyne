import { useEffect } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import { useAppDispatch, useAppSelector } from '../../../stores/hooks';
import { setLayers, type GraphicLayer } from '../../../features/editor/stores/editorSlice';
import { useSocket } from '@/hooks/useSocket';

export function ViewerPage() {
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const layers = useAppSelector((state) => state.editor.layers);
  const projectId = 'demo-project'; // Must match Editor

  useEffect(() => {
    if (!socket) return;

    // 1. Join the room
    socket.emit('join-project', projectId);

    // 2. Listen for updates from the server
    socket.on('update-layers', (incomingLayers: GraphicLayer[]) => {
      console.log('Received update:', incomingLayers);
      dispatch(setLayers(incomingLayers));
    });

    return () => {
      socket.off('update-layers');
    };
  }, [socket, dispatch]);

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      {/* Use a transparent background so it looks like an overlay. 
         In OBS, you would key out the background.
      */}
      <Stage width={1920} height={1080}>
        <Layer>
          {layers.map((layer) => {
            // Render shapes exactly like the Editor, but WITHOUT listeners/transformers
            if (layer.type === 'rect') {
              return <Rect key={layer.id} {...layer} />;
            }
            if (layer.type === 'text') {
              return <Text key={layer.id} {...layer} />;
            }
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}