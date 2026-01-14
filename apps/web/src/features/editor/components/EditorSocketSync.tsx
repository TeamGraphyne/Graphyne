import { useEffect } from 'react';
import { useAppSelector } from '../../../stores/hooks'; // Adjust path to your hooks
import { useSocket } from '../../../hooks/useSocket';

export function EditorSocketSync() {
  const { socket } = useSocket();
  const layers = useAppSelector((state) => state.editor.layers);
  const projectId = 'demo-project'; // Hardcoded for Sprint 0

  useEffect(() => {
    if (!socket) return;

    // 1. Join the room on mount
    socket.emit('join-project', projectId);

    // 2. Whenever 'layers' change in Redux, push to server
    // We use a timeout (debounce) to avoid spamming the server on every pixel drag
    const timeoutId = setTimeout(() => {
      socket.emit('canvas-update', {
        projectId,
        layers
      });
    }, 16); // ~60fps cap

    return () => clearTimeout(timeoutId);
  }, [socket, layers]); // Re-run whenever layers change

  return null; // This component renders nothing visually
}