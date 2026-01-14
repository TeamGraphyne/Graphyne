import { useAppDispatch } from '../../../stores/hooks';
import { addLayer } from '../stores/editorSlice';
import { v4 as uuidv4 } from 'uuid';

export function Toolbar() {
  const dispatch = useAppDispatch();

  const addRectangle = () => {
    dispatch(addLayer({
      id: uuidv4(),
      type: 'rect',
      name: 'Rectangle',
      x: 100, y: 100, width: 200, height: 150,
      fill: '#7b2cbf',
      rotation: 0
    }));
  };

  const addText = () => {
    dispatch(addLayer({
      id: uuidv4(),
      type: 'text',
      name: 'Text Layer',
      x: 150, y: 150, width: 300, height: 50,
      fill: '#ffffff',
      rotation: 0,
      text: 'New Headline',
      fontSize: 32
    }));
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 border-r border-gray-800 w-16 items-center">
      <button onClick={addRectangle} className="p-2 bg-blue-600 rounded hover:bg-blue-500" title="Add Rect">
        ⬜
      </button>
      <button onClick={addText} className="p-2 bg-purple-600 rounded hover:bg-purple-500" title="Add Text">
        Tt
      </button>
    </div>
  );
}