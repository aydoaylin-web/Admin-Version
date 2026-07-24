import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.jsx';
import InlineAdmin, {
  AdminKopfKnopf,
} from './admin/InlineAdmin.jsx';

import './styles.css';

/* ============================================================
   EINSTIEG

   ADMIN_KNOPF_SICHTBAR
     true  = der Knopf "Admin" sitzt in der Kopfleiste der App.
     false = kein sichtbarer Knopf für die Unterrichtsversion.

   Der Adminmodus kann zusätzlich über folgende Wege geöffnet
   werden:

   Strg + Alt + A
   #/admin
   ?admin
   ?admin=true
   ============================================================ */

const ADMIN_KNOPF_SICHTBAR = true;

function istAdminAdresse() {
  const hash = (window.location.hash || '').toLowerCase();
  const params = new URLSearchParams(window.location.search);

  return (
    hash.replace(/^#\/?/, '').startsWith('admin') ||
    params.has('admin')
  );
}

class Fehlergrenze extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error(
      'Absturz beim Rendern:',
      error,
      info,
    );
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const message =
      this.state.error?.message ||
      this.state.error;

    return (
      <div
        style={{
          maxWidth: 640,
          margin: '48px auto',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1.5,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            margin: '0 0 12px',
          }}
        >
          Da ist etwas schiefgelaufen
        </h1>

        <pre
          style={{
            padding: 12,
            background: '#f3f6fb',
            border: '1px solid #dce3ee',
            borderRadius: 10,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: 13,
          }}
        >
          {String(message)}
        </pre>

        <button
          type="button"
          style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            background: '#fff',
            font: 'inherit',
            cursor: 'pointer',
          }}
          onClick={() => {
            window.location.hash = '';
            window.location.reload();
          }}
        >
          Neu laden
        </button>
      </div>
    );
  }
}

function Wurzel() {
  const [admin, setAdmin] = useState(
    istAdminAdresse,
  );

  useEffect(() => {
    const beiAdresse = () => {
      setAdmin(istAdminAdresse());
    };

    const beiTaste = (event) => {
      const istAdminKuerzel =
        event.ctrlKey &&
        event.altKey &&
        event.key.toLowerCase() === 'a';

      if (!istAdminKuerzel) {
        return;
      }

      event.preventDefault();

      window.location.hash = '/admin';
      setAdmin(true);
    };

    window.addEventListener(
      'hashchange',
      beiAdresse,
    );

    window.addEventListener(
      'popstate',
      beiAdresse,
    );

    window.addEventListener(
      'keydown',
      beiTaste,
    );

    return () => {
      window.removeEventListener(
        'hashchange',
        beiAdresse,
      );

      window.removeEventListener(
        'popstate',
        beiAdresse,
      );

      window.removeEventListener(
        'keydown',
        beiTaste,
      );
    };
  }, []);

  if (admin) {
    return <InlineAdmin />;
  }

  return (
    <>
      <App />

      {ADMIN_KNOPF_SICHTBAR && (
        <AdminKopfKnopf
          aktiv={false}
          onClick={() => {
            window.location.hash = '/admin';
            setAdmin(true);
          }}
        />
      )}
    </>
  );
}

ReactDOM
  .createRoot(
    document.getElementById('root'),
  )
  .render(
    <React.StrictMode>
      <Fehlergrenze>
        <Wurzel />
      </Fehlergrenze>
    </React.StrictMode>,
  );

if ('serviceWorker' in navigator) {
  window.addEventListener(
    'load',
    async () => {
      if (import.meta.env.DEV) {
        try {
          const registrations =
            await navigator.serviceWorker
              .getRegistrations();

          await Promise.all(
            registrations.map(
              (registration) =>
                registration.unregister(),
            ),
          );

          const cacheKeys =
            await caches.keys();

          await Promise.all(
            cacheKeys
              .filter((key) =>
                key.startsWith(
                  'deepfake-defender',
                ),
              )
              .map((key) =>
                caches.delete(key),
              ),
          );
        } catch (error) {
          console.warn(
            'Service-Worker-Bereinigung fehlgeschlagen.',
            error,
          );
        }

        return;
      }

      try {
        const registration =
          await navigator.serviceWorker.register(
            `${import.meta.env.BASE_URL}service-worker.js`,
            {
              updateViaCache: 'none',
            },
          );

        await registration.update();
      } catch (error) {
        console.warn(
          'Service worker registration failed.',
          error,
        );
      }
    },
  );
}
