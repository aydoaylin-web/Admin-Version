import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import './styles.css';

/* ============================================================
   EINSTELLUNGEN — hier oben alles, was du anfassen willst.

   ADMIN_KNOPF_SICHTBAR
     true  = der Knopf "Admin" schwebt unten links in der App.
             Praktisch beim Vorbereiten.
     false = kein Knopf. Fuer den Unterricht empfohlen, dann
             kommen die Kinder gar nicht erst auf die Idee.
             Du selbst kommst weiterhin ueber die Geste rein.

   HALTEDAUER
     Millisekunden, die der Finger auf der linken oberen Ecke
     liegen muss. 2000 = zwei Sekunden.
   ============================================================ */
const ADMIN_KNOPF_SICHTBAR = true;
const HALTEDAUER = 2000;

/* ============================================================
   DREI WEGE IN DEN ADMINBEREICH
   1. der Knopf unten links (wenn oben eingeschaltet)
   2. zwei Sekunden auf die linke obere Ecke druecken
   3. am Rechner: Strg + Alt + A
   Zusaetzlich weiterhin ueber die Adresse:
      .../#/admin   .../#admin   .../#/Admin   .../?admin
   ============================================================ */
function isAdminRoute() {
  const hash = (window.location.hash || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();
  const path = (window.location.pathname || '').toLowerCase();
  return hash.replace(/^#\/?/, '').startsWith('admin')
    || search === '?admin'
    || /\/admin\/?$/.test(path);
}

/* Sichtbarer Knopf. Er sitzt unten links und damit
   ueber der unteren Navigationsleiste (die endet bei 86 Punkten)
   und neben dem Punktestand, der rechts sitzt.
   Die Ebene 45 liegt ueber der Navigation, aber unter Dialogen -
   sobald eine Feed-Pruefung offen ist, verschwindet er also. */
function AdminKnopf({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Adminbereich oeffnen"
      style={{
        position: 'fixed', bottom: 96, left: 12, zIndex: 45,
        padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6,
        minHeight: 36, border: '1px solid rgba(9,43,97,.18)', borderRadius: 999,
        background: 'rgba(255,255,255,.92)', color: '#092b61',
        font: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(13,36,79,.14)',
        WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span aria-hidden="true">🔒</span> Admin
    </button>
  );
}

/* Unsichtbare Flaeche in der linken oberen Ecke, ueber dem
   Schriftzug im Kopf der App. Dort ist nichts anklickbar,
   im normalen Gebrauch merkt niemand etwas davon. */
function AdminGeste({ onOpen }) {
  const timer = useRef(null);
  const stop = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const start = () => { stop(); timer.current = setTimeout(onOpen, HALTEDAUER); };
  useEffect(() => stop, []);
  return (
    <div
      aria-hidden="true"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed', top: 0, left: 0, width: 60, height: 60,
        zIndex: 2147483647, background: 'transparent',
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none', userSelect: 'none',
      }}
    />
  );
}

/* Rueckweg fuer den Fall, dass der Adminbereich ueber Knopf,
   Geste oder Tastenkuerzel geoeffnet wurde. Wichtig, weil die
   Knoepfe innerhalb des Adminbereichs die Adresse zuruecksetzen -
   und wenn dort ohnehin nichts stand, passiert dabei nichts. */
function ZurueckKnopf({ onBack }) {
  return (
    <button
      type="button"
      onClick={onBack}
      style={{
        position: 'fixed', top: 12, right: 12, zIndex: 2147483646,
        padding: '9px 13px', minHeight: 38,
        border: '1px solid #cbd5e1', borderRadius: 999,
        background: '#fff', color: '#182235',
        font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(13,36,79,.14)',
      }}
    >
      ← Zur Schueler-App
    </button>
  );
}

/* ============================================================
   FEHLERGRENZE
   Ohne sie wird die Seite bei einem Fehler beim Aufbauen einfach
   weiss, ohne jeden Hinweis. Mit ihr steht die Ursache lesbar auf
   dem Bildschirm - wichtig, wenn im Unterricht etwas klemmt und
   keine Entwicklerkonsole zur Hand ist. Die Gestaltung steht
   absichtlich direkt im Element, damit sie auch dann greift, wenn
   das Stylesheet nicht geladen wurde.
   ============================================================ */
class Fehlergrenze extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('Absturz beim Rendern:', error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ maxWidth: 640, margin: '48px auto', padding: 24, fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
        <h1 style={{ fontSize: 20, margin: '0 0 12px' }}>Da ist etwas schiefgelaufen</h1>
        <p style={{ margin: '0 0 12px' }}>Die Seite konnte nicht dargestellt werden. Die technische Ursache:</p>
        <pre style={{ padding: 12, background: '#f3f6fb', border: '1px solid #dce3ee', borderRadius: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>
          {String(this.state.error?.message || this.state.error)}
        </pre>
        <button
          style={{ marginTop: 12, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', cursor: 'pointer', font: 'inherit' }}
          onClick={() => { window.location.hash = ''; window.location.reload(); }}
        >
          Neu laden
        </button>
      </div>
    );
  }
}

function RootRouter() {
  const [adminUeberAdresse, setAdminUeberAdresse] = useState(isAdminRoute);
  const [adminManuell, setAdminManuell] = useState(false);
  const admin = adminUeberAdresse || adminManuell;

  useEffect(() => {
    const onRoute = () => setAdminUeberAdresse(isAdminRoute());
    window.addEventListener('hashchange', onRoute);
    window.addEventListener('popstate', onRoute);
    const onKey = (e) => {
      if (e.ctrlKey && e.altKey && (e.key === 'a' || e.key === 'A')) setAdminManuell(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('hashchange', onRoute);
      window.removeEventListener('popstate', onRoute);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  function zurueckZurApp() {
    setAdminManuell(false);
    if (window.location.hash) window.location.hash = '';
    setAdminUeberAdresse(false);
  }

  if (admin) return <>
    <AdminApp />
    <ZurueckKnopf onBack={zurueckZurApp} />
  </>;

  return <>
    <App />
    {ADMIN_KNOPF_SICHTBAR && <AdminKnopf onOpen={() => setAdminManuell(true)} />}
    <AdminGeste onOpen={() => setAdminManuell(true)} />
  </>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Fehlergrenze>
      <RootRouter />
    </Fehlergrenze>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (import.meta.env.DEV) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.filter((key) => key.startsWith('deepfake-defender')).map((key) => caches.delete(key)));
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`, { updateViaCache: 'none' });
      await registration.update();
    } catch (error) {
      console.warn('Service worker registration failed.', error);
    }
  });
}
