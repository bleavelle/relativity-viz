import React from 'react';
import './App.css';
import RelativityVisualizer from './components/RelativityVisualizer';

function App() {
  return (
    <div className="App bg-gray-900 text-white">
      <div className="container mx-auto py-8 px-4">
        <RelativityVisualizer />
      </div>
    </div>
  );
}

export default App;
