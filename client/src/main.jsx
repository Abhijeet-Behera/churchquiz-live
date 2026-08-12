import React from 'react';
import ReactDOM from 'react-dom/client';
import LightfallBackground from './components/LightfallBackground';


import {
  ClerkProvider
} from '@clerk/react';

import App from './App';

import './styles/main.css';


const PUBLISHABLE_KEY =
  import.meta.env
    .VITE_CLERK_PUBLISHABLE_KEY;


if (!PUBLISHABLE_KEY) {
  throw new Error(
    'Missing VITE_CLERK_PUBLISHABLE_KEY in client/.env'
  );
}


ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>

    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInUrl="/login"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/login"
    >
      <LightfallBackground />

      <div className="churchquiz-app-layer">
        <App />
      </div>
    </ClerkProvider>

  </React.StrictMode>
);