import { useEffect } from 'react';
import { useAppSelector } from '../../../stores/hooks';
import { useSocket } from '@/hooks/useSocket';
import { Toolbar } from '../components/Toolbar';
import { CanvasArea } from '../components/CanvasArea';
import { PropertiesPanel } from '../components/PropertiesPanel';

export function EditorPage() {
  const { socket } = useSocket();
  const layers = useAppSelector((state) => state.editor.layers);
  const projectId = 'demo-project'; // In real app, get this from route or context

  // Join the project room on load
  useEffect(() => {
    if (socket) {
      socket.emit('join-project', projectId);
    }
  }, [socket]);

  // Emit changes whenever the 'layers' array changes
  useEffect(() => {
    if (socket && layers.length > 0) {
      // Debounce could be added here for performance
      socket.emit('sync-layers', { projectId, layers });
    }
  }, [layers, socket]);

  return (
    <div className="flex h-full w-full">
      <Toolbar />
      <CanvasArea />
      <PropertiesPanel />
    </div>
  );
}