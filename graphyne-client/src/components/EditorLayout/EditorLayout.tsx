
import { TestArtboard } from '../../tests/TestArtboard';
import { AnimationPanel } from '../Panel/AnimationPanel';

export const EditorLayout = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Canvas Area */}
      <div className="flex-1 bg-gray-900">
        <TestArtboard />
      </div>
      
      {/* Right Side Panel with AnimationPanel */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
        <AnimationPanel />
      </div>
    </div>
  );
};