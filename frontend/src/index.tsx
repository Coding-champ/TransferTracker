import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { initTelemetry, setTelemetryUser, setTelemetryContextProvider } from './utils/telemetry';

// Initialize telemetry (no-op if DSN not provided)
initTelemetry(process.env.REACT_APP_SENTRY_DSN, {
  environment: process.env.NODE_ENV,
  release: process.env.REACT_APP_GIT_SHA,
});

// Optional: set user id if you have auth (placeholder reads from localStorage)
try {
  const uid = localStorage.getItem('userId') || undefined;
  setTelemetryUser(uid || undefined);
  setTelemetryContextProvider(() => ({
    userId: uid,
    app: 'TransferTracker',
  }));
} catch {
  // ignore storage errors
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();