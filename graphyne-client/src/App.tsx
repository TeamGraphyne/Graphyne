import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { EditorPage } from './pages/EditorPage';
import { PlayoutPage } from './pages/PlayoutPage'; 


function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Default to Editor*/}
          <Route path="/" element={<Navigate to="/editor" replace />} />
          
          {/* The Editor Zone */}
          <Route path="/editor" element={<EditorPage />} />
          
          {/*The Playout Engine*/}
          <Route path="/playout" element={<PlayoutPage />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;