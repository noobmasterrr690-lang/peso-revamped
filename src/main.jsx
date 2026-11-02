import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const mountEl = document.getElementById('react-framework-bridge');
if (mountEl) {
  const root = createRoot(mountEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
