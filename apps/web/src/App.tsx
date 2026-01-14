import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { EditorPage } from './features/editor/pages/EditorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/editor" replace />} />
          <Route path="editor" element={<EditorPage />} />
          {/* Add DataPage, PreviewPage, PlaybackPage as they are created */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App;