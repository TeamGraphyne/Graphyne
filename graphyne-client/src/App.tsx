import { Provider } from 'react-redux';
import { store } from './store/store';
import { TestArtboard } from './tests/TestArtboard';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        {/* Debugging Artboard, Feel free to add your own components here for testing */}
        <TestArtboard />
      </div>
    </Provider>
  );
}

export default App;