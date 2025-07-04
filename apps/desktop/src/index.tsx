import React from 'react';
import ReactDOM from 'react-dom/client';
import ImprovedApp from './ImprovedApp';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ImprovedApp />
  </React.StrictMode>
);
