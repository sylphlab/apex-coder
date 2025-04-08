import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'virtual:uno.css'; // Move imports to top level
import './styles/nordic-theme.css'; // Move imports to top level

// Removed leftover comments and try-catch

// Get the root element
const rootElement = document.getElementById('app');
const root = createRoot(rootElement!); // Use createRoot from React 18
if (!rootElement) {
  console.error('Root element with id "app" not found in the document.');
} else {
  // Render the app using legacy ReactDOM.render
  try {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log('App rendered successfully!');
  } catch (e) {
    console.error('Failed to render App:', e);
  }
}
