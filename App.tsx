import React from 'react';
import { StudioProvider } from './context/StudioContext';
import { Shell } from './components/layout/Shell';

function App() {
  return (
    <StudioProvider>
      <Shell />
    </StudioProvider>
  );
}

export default App;
