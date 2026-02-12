import { useState, useEffect, type RefObject } from 'react';

export function useFullscreen(targetRef: RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // GO INTO FULLSCREEN
  const enterFullscreen = () => {
    if (targetRef.current?.requestFullscreen) {
      targetRef.current.requestFullscreen();
    }
  };

  // COME OUT OF FULLSCREEN
  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  // LISTEN FOR CHANGES
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return { isFullscreen, enterFullscreen, exitFullscreen };
}

