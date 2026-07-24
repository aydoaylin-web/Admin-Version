import { useEffect, useMemo, useState } from 'react';
import App from '../App.jsx';
import './admin.css';
import NachziehHinweise, { ermittleNachziehschritte } from './NachziehHinweise.jsx';
import CodeWerkstatt from './CodeWerkstatt.jsx';
import { ladeEntwurf } from './codeEntwurf';
import { ladeZipHerunter } from './zipExport';

const PASSWORD_KEY = 'dd-react-admin-password-v2';
const DRAFT_KEY = 'dd-react-admin-draft-v2';
const BASELINE_KEY = 'dd-react-admin-baseline-v2';
const VERSION_KEY = 'dd-react-admin-versions-v2';

const FILES = [
  'settings',
  'posts',
  'tasks',
  'profiles',
  'stories',
  'guides',
];

const FILE_LABELS = {
  settings: 'Einstellungen',
  posts: 'Beiträge',
  tasks: 'Aufgaben',
  profiles: 'Profile',
  stories: 'Stories',
  guides: 'Hilfen',
};

function joinBase(path) {
  return `${import.meta.env.BASE_URL}${String(path || '').replace(
    /^\//,
    '',
  )}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function textValue(value, language = 'de') {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return value[language] ?? value.de ?? '';
  }

  return value ?? '';
}

function setTextValue(current, value, language = 'de') {
  if (
    current &&
    typeof current === 'object' &&
    !Array.isArray(current)
  ) {
    return {
      ...current,
      [language]: value,
    };
  }

  return {
    de: language === 'de' ? value : '',
    en: language === 'en' ? value : '',
  };
}

function readStore(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStore(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Lokaler Speicher ist nicht verfügbar.
  }
}

function downloadFile(
  filename,
  content,
  type = 'application/json;charset=utf-8',
) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

async function copyText(text) {
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function passwordRecord() {
  try {
    const value = readStore(PASSWORD_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

async function hashPassword(password, salt) {
  const value = `${salt}:${password}`;

  if (
    window.crypto?.subtle &&
    typeof TextEncoder !== 'undefined'
  ) {
    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest(
      'SHA-256',
      bytes,
    );

    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return String(hash >>> 0);
}

function createSalt() {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(4);
    window.crypto.getRandomValues(values);
    return Array.from(values).join('-');
  }

  return `${Date.now()}-${Math.random()}`;
}

async function savePassword(password) {
  const salt = createSalt();
  const hash = await hashPassword(password, salt);

  const success = writeStore(
    PASSWORD_KEY,
    JSON.stringify({
      salt,
      hash,
    }),
  );

  if (!success) {
    throw new Error(
      'Das Passwort konnte nicht im Browser gespeichert werden.',
    );
  }
}

async function checkPassword(password) {
  const record = passwordRecord();

  if (!record?.salt || !record?.hash) {
    return false;
  }

  const hash = await hashPassword(password, record.salt);
  return hash === record.hash;
}

function AdminLogin({ onUnlock }) {
  const [setup, setSetup] = useState(!passwordRecord());
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) {
      return;
    }

    setError('');
    setBusy(true);

    try {
      if (setup) {
        if (password.length < 6) {
          throw new Error(
            'Das Passwort muss mindestens sechs Zeichen enthalten.',
          );
        }

        if (password !== confirmation) {
          throw new Error(
            'Die beiden Passwörter stimmen nicht überein.',
          );
        }

        await savePassword(password);
        onUnlock();
        return;
      }

      const valid = await checkPassword(password);

      if (!valid) {
        throw new Error('Das Passwort ist falsch.');
      }

      onUnlock();
    } catch (submissionError) {
      setError(
        submissionError?.message ||
          'Die Anmeldung ist fehlgeschlagen.',
      );
    } finally {
      setBusy(false);
    }
  }

  function resetPassword() {
    const confirmed = window.confirm(
      'Passwort wirklich zurücksetzen?',
    );

    if (!confirmed) {
      return;
    }

    removeStore(PASSWORD_KEY);
    setSetup(true);
    setPassword('');
    setConfirmation('');
    setError('');
  }

  return (
    <div className="admin-login-shell">
      <section className="admin-login-card">
        <h1>
          {setup
            ? 'Admin-Zugang einrichten'
            : 'Admin-Anmeldung'}
        </h1>

        <p>
          Geschützter Bearbeitungsbereich von Deepfake Defender.
        </p>

        <label>
          Passwort

          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) =>
              setPassword(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                submit();
              }
            }}
          />
        </label>

        {setup && (
          <label>
            Passwort wiederholen

            <input
              type="password"
              value={confirmation}
              autoComplete="new-password"
              onChange={(event) =>
                setConfirmation(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  submit();
                }
              }}
            />
          </label>
        )}

        {error && <p className="admin-error">{error}</p>}

        <button
          type="button"
          className="admin-primary"
          disabled={busy}
          onClick={submit}
        >
          {busy
            ? 'Wird geprüft …'
            : setup
              ? 'Passwort speichern'
              : 'Anmelden'}
        </button>

        {!setup && (
          <button type="button" onClick={resetPassword}>
            Passwort zurücksetzen
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            window.location.hash = '';
          }}
        >
          Zur Schüler-App
        </button>
      </section>
    </div>
  );
}

function ItemEditor({ type, item, onChange }) {
  function set(key, value) {
    onChange({
      ...item,
      [key]: value,
    });
  }

  const commonFields = (
    <>
      <label>
        ID

        <input
          value={item.id || ''}
          onChange={(event) =>
            set('id', event.target.value)
          }
        />
      </label>

      <label className="admin-check">
        <input
          type="checkbox"
          checked={item.enabled !== false}
          onChange={(event) =>
            set('enabled', event.target.checked)
          }
        />

        Aktiv
      </label>
    </>
  );

  if (type === 'posts') {
    return (
      <div className="admin-form-grid">
        {commonFields}

        <label>
          Benutzername

          <input
            value={item.username || ''}
            onChange={(event) =>
              set('username', event.target.value)
            }
          />
        </label>

        <label>
          Anzeigename

          <input
            value={item.displayName || ''}
            onChange={(event) =>
              set('displayName', event.target.value)
            }
          />
        </label>

        <label>
          Profil-ID

          <input
            value={item.profileId || ''}
            onChange={(event) =>
              set('profileId', event.target.value)
            }
          />
        </label>

        <label>
          Aufgaben-ID

          <input
            value={item.taskId || ''}
            onChange={(event) =>
              set('taskId', event.target.value)
            }
          />
        </label>

        <label>
          Prüfaufgaben-ID

          <input
            value={item.reviewTaskId || ''}
            onChange={(event) =>
              set('reviewTaskId', event.target.value)
            }
          />
        </label>

        <label>
          Medienpfad

          <input
            value={item.media || ''}
            onChange={(event) =>
              set('media', event.target.value)
            }
          />
        </label>

        <label className="admin-wide">
          Beitragstext Deutsch

          <textarea
            value={textValue(item.caption, 'de')}
            onChange={(event) =>
              set(
                'caption',
                setTextValue(
                  item.caption,
                  event.target.value,
                  'de',
                ),
              )
            }
          />
        </label>

        <label className="admin-wide">
          Beitragstext Englisch

          <textarea
            value={textValue(item.caption, 'en')}
            onChange={(event) =>
              set(
                'caption',
                setTextValue(
                  item.caption,
                  event.target.value,
                  'en',
                ),
              )
            }
          />
        </label>
      </div>
    );
  }

  if (type === 'tasks') {
    return (
      <div className="admin-form-grid">
        {commonFields}

        <label>
          Typ

          <select
            value={item.type || 'news'}
            onChange={(event) =>
              set('type', event.target.value)
            }
          >
            <option value="news">Newskarte</option>
            <option value="liveCheck">Live-Check</option>
            <option value="perspective">
              Perspektivwechsel
            </option>
            <option value="realityDefense">
              Reality Defense
            </option>
          </select>
        </label>

        <label>
          Post-ID

          <input
            value={item.postId || ''}
            onChange={(event) =>
              set('postId', event.target.value)
            }
          />
        </label>

        <label>
          Richtige Einstufung

          <select
            value={item.correctVerdict || ''}
            onChange={(event) =>
              set('correctVerdict', event.target.value)
            }
          >
            <option value="">Keine Auswahl</option>
            <option value="echt">Echt</option>
            <option value="suspekt">Suspekt</option>
            <option value="manipuliert">
              Manipuliert
            </option>
          </select>
        </label>

        <label>
          Punkte richtig

          <input
            type="number"
            value={item.pointsCorrect ?? 0}
            onChange={(event) =>
              set(
                'pointsCorrect',
                Number(event.target.value),
              )
            }
          />
        </label>

        <label>
          Punkte falsch

          <input
            type="number"
            value={item.pointsWrong ?? 0}
            onChange={(event) =>
              set(
                'pointsWrong',
                Number(event.target.value),
              )
            }
          />
        </label>

        <label>
          Zeitlimit

          <input
            type="number"
            value={item.timeLimit ?? 180}
            onChange={(event) =>
              set('timeLimit', Number(event.target.value))
            }
          />
        </label>

        <label className="admin-wide">
          Titel Deutsch

          <input
            value={textValue(item.title, 'de')}
            onChange={(event) =>
              set(
                'title',
                setTextValue(
                  item.title,
                  event.target.value,
                  'de',
                ),
              )
            }
          />
        </label>

        <label className="admin-wide">
          Titel Englisch

          <input
            value={textValue(item.title, 'en')}
            onChange={(event) =>
              set(
                'title',
                setTextValue(
                  item.title,
                  event.target.value,
                  'en',
                ),
              )
            }
          />
        </label>

        <label className="admin-wide">
          Arbeitsauftrag Deutsch

          <textarea
            value={textValue(item.instruction, 'de')}
            onChange={(event) =>
              set(
                'instruction',
                setTextValue(
                  item.instruction,
                  event.target.value,
                  'de',
                ),
              )
            }
          />
        </label>

        <label className="admin-wide">
          Arbeitsauftrag Englisch

          <textarea
            value={textValue(item.instruction, 'en')}
            onChange={(event) =>
              set(
                'instruction',
                setTextValue(
                  item.instruction,
                  event.target.value,
                  'en',
                ),
              )
            }
          />
        </label>

        <label className="admin-wide">
          Akzeptierte Wörter, durch Kommas getrennt

          <textarea
            value={(item.acceptedWords || []).join(', ')}
            onChange={(event) =>
              set(
                'acceptedWords',
                event.target.value
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
      </div>
    );
  }

  if (type === 'profiles') {
    return (
      <div className="admin-form-grid">
        {commonFields}

        <label>
          Benutzername

          <input
            value={item.username || ''}
            onChange={(event) =>
              set('username', event.target.value)
            }
          />
        </label>

        <label>
          Anzeigename

          <input
            value={item.displayName || ''}
            onChange={(event) =>
              set('displayName', event.target.value)
            }
          />
        </label>

        <label className="admin-wide">
          Biografie Deutsch

          <textarea
            value={textValue(item.bio, 'de')}
            onChange={(event) =>
              set(
                'bio',
                setTextValue(
                  item.bio,
                  event.target.value,
                  'de',
                ),
              )
            }
          />
        </label>

        <label className="admin-wide">
          Biografie Englisch

          <textarea
            value={textValue(item.bio, 'en')}
            onChange={(event) =>
              set(
                'bio',
                setTextValue(
                  item.bio,
                  event.target.value,
                  'en',
                ),
              )
            }
          />
        </label>

        <label className="admin-check">
          <input
            type="checkbox"
            checked={Boolean(item.verified)}
            onChange={(event) =>
              set('verified', event.target.checked)
            }
          />

          Verifiziert
        </label>
      </div>
    );
  }

  if (type === 'stories' || type === 'guides') {
    const titleKey =
      item.label !== undefined ? 'label' : 'title';

    return (
      <div className="admin-form-grid">
        {commonFields}

        <label>
          Bezeichnung Deutsch

          <input
            value={textValue(item[titleKey], 'de')}
            onChange={(event) =>
              set(
                titleKey,
                setTextValue(
                  item[titleKey],
                  event.target.value,
                  'de',
                ),
              )
            }
          />
        </label>

        <label>
          Bezeichnung Englisch

          <input
            value={textValue(item[titleKey], 'en')}
            onChange={(event) =>
              set(
                titleKey,
                setTextValue(
                  item[titleKey],
                  event.target.value,
                  'en',
                ),
              )
            }
          />
        </label>

        <label>
          Profil-ID

          <input
            value={item.profileId || ''}
            onChange={(event) =>
              set('profileId', event.target.value)
            }
          />
        </label>

        <label>
          Bildpfad

          <input
            value={item.image || ''}
            onChange={(event) =>
              set('image', event.target.value)
            }
          />
        </label>
      </div>
    );
  }

  return null;
}

export default function AdminApp() {
  const [authenticated, setAuthenticated] =
    useState(false);

  const [data, setData] = useState(null);
  const [baseline, setBaseline] = useState(null);

  const [section, setSection] = useState('posts');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [view, setView] = useState('editor');
  const [codeFile, setCodeFile] = useState(
    'content/posts.json',
  );

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoadError('');

      const storedDraft = readStore(DRAFT_KEY);
      const storedBaseline = readStore(BASELINE_KEY);

      if (storedDraft) {
        try {
          const parsedDraft = JSON.parse(storedDraft);

          if (!cancelled) {
            setData(parsedDraft);

            setBaseline(
              storedBaseline
                ? JSON.parse(storedBaseline)
                : clone(parsedDraft),
            );
          }

          return;
        } catch {
          removeStore(DRAFT_KEY);
          removeStore(BASELINE_KEY);
        }
      }

      try {
        const entries = await Promise.all(
          FILES.map(async (name) => {
            const response = await fetch(
              joinBase(`content/${name}.json`),
              {
                cache: 'no-store',
              },
            );

            if (!response.ok) {
              throw new Error(
                `content/${name}.json konnte nicht geladen werden. Status ${response.status}.`,
              );
            }

            return [name, await response.json()];
          }),
        );

        const loaded = Object.fromEntries(entries);

        if (!cancelled) {
          setData(loaded);
          setBaseline(clone(loaded));

          writeStore(
            BASELINE_KEY,
            JSON.stringify(loaded),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error?.message ||
              'Die Inhalte konnten nicht geladen werden.',
          );
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const saved = writeStore(
      DRAFT_KEY,
      JSON.stringify(data),
    );

    if (!saved) {
      setStatus(
        'Der aktuelle Entwurf konnte nicht lokal gespeichert werden.',
      );
    }
  }, [data]);

  const changedFiles = useMemo(() => {
    if (!data || !baseline) {
      return [];
    }

    return FILES.filter(
      (name) => !same(data[name], baseline[name]),
    ).map((name) => `content/${name}.json`);
  }, [data, baseline]);

  const problems = useMemo(() => {
    if (!data) {
      return [];
    }

    const output = [];

    const postIds = new Set(
      (data.posts || []).map((post) => post.id),
    );

    const taskIds = new Set(
      (data.tasks || []).map((task) => task.id),
    );

    const profileIds = new Set(
      (data.profiles || []).map(
        (profile) => profile.id,
      ),
    );

    for (const post of data.posts || []) {
      if (!post.id) {
        output.push('Ein Beitrag besitzt keine ID.');
      }

      if (!post.username) {
        output.push(
          `Beitrag ${post.id || '?'} besitzt keinen Benutzernamen.`,
        );
      }

      if (!post.media) {
        output.push(
          `Beitrag ${post.id || '?'} besitzt keinen Medienpfad.`,
        );
      }

      if (
        post.taskId &&
        !taskIds.has(post.taskId)
      ) {
        output.push(
          `Beitrag ${post.id}: Aufgabe ${post.taskId} existiert nicht.`,
        );
      }

      if (
        post.reviewTaskId &&
        !taskIds.has(post.reviewTaskId)
      ) {
        output.push(
          `Beitrag ${post.id}: Prüfaufgabe ${post.reviewTaskId} existiert nicht.`,
        );
      }

      if (
        post.profileId &&
        !profileIds.has(post.profileId)
      ) {
        output.push(
          `Beitrag ${post.id}: Profil ${post.profileId} existiert nicht.`,
        );
      }
    }

    for (const task of data.tasks || []) {
      if (!task.id) {
        output.push('Eine Aufgabe besitzt keine ID.');
      }

      if (
        task.postId &&
        !postIds.has(task.postId)
      ) {
        output.push(
          `Aufgabe ${task.id || '?'}: Beitrag ${task.postId} existiert nicht.`,
        );
      }

      if (
        task.type === 'news' &&
        !['echt', 'suspekt', 'manipuliert'].includes(
          task.correctVerdict,
        )
      ) {
        output.push(
          `Aufgabe ${task.id || '?'} benötigt eine richtige Einstufung.`,
        );
      }
    }

    return output.slice(0, 20);
  }, [data]);

  const currentList = Array.isArray(data?.[section])
    ? data[section]
    : [];

  const filteredItems = currentList
    .map((item, index) => ({
      item,
      index,
    }))
    .filter(({ item }) =>
      JSON.stringify(item)
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  const selectedItem = currentList[selectedIndex];

  if (!authenticated) {
    return (
      <AdminLogin
        onUnlock={() => setAuthenticated(true)}
      />
    );
  }

  if (loadError) {
    return (
      <div className="admin-loading">
        <h1>Inhalte konnten nicht geladen werden</h1>

        <p>{loadError}</p>

        <p>
          Starte die App über npm run dev oder über die
          veröffentlichte HTTPS-Adresse.
        </p>

        <button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!data || !baseline) {
    return (
      <div className="admin-loading">
        Adminbereich wird geladen …
      </div>
    );
  }

  function updateItem(nextItem) {
    setData((current) => ({
      ...current,
      [section]: current[section].map(
        (item, index) =>
          index === selectedIndex ? nextItem : item,
      ),
    }));
  }

  function addItem() {
    const stamp = Date.now();

    let nextItem;

    if (section === 'posts') {
      nextItem = {
        id: `post_${stamp}`,
        enabled: true,
        username: 'neuer.account',
        displayName: 'Neuer Account',
        verified: false,
        mediaType: 'image',
        media: '',
        caption: {
          de: 'Neuer Beitrag',
          en: 'New post',
        },
        likes: 0,
        postType: 'news',
        comments: [],
      };
    } else if (section === 'tasks') {
      nextItem = {
        id: `task_${stamp}`,
        enabled: true,
        type: 'news',
        postId: '',
        correctVerdict: 'suspekt',
        pointsCorrect: 1,
        pointsWrong: 0,
        timeLimit: 180,
        title: {
          de: 'Neue Aufgabe',
          en: 'New task',
        },
        instruction: {
          de: '',
          en: '',
        },
      };
    } else if (section === 'profiles') {
      nextItem = {
        id: `profile_${stamp}`,
        enabled: true,
        username: 'neues.profil',
        displayName: 'Neues Profil',
        verified: false,
        bio: {
          de: '',
          en: '',
        },
      };
    } else {
      nextItem = {
        id: `${section.slice(0, -1)}_${stamp}`,
        enabled: true,
        title: {
          de: 'Neuer Eintrag',
          en: 'New entry',
        },
      };
    }

    setData((current) => ({
      ...current,
      [section]: [...current[section], nextItem],
    }));

    setSelectedIndex(currentList.length);
    setSearch('');
  }

  function removeItem() {
    if (!selectedItem) {
      return;
    }

    const confirmed = window.confirm(
      `Eintrag ${selectedItem.id || ''} wirklich entfernen?`,
    );

    if (!confirmed) {
      return;
    }

    setData((current) => ({
      ...current,
      [section]: current[section].filter(
        (_, index) => index !== selectedIndex,
      ),
    }));

    setSelectedIndex(0);
  }

  function saveVersion() {
    let versions = [];

    try {
      versions = JSON.parse(
        readStore(VERSION_KEY) || '[]',
      );
    } catch {
      versions = [];
    }

    versions.unshift({
      id:
        window.crypto?.randomUUID?.() ||
        String(Date.now()),
      createdAt: new Date().toISOString(),
      data: clone(data),
    });

    writeStore(
      VERSION_KEY,
      JSON.stringify(versions.slice(0, 20)),
    );

    setStatus('Version wurde lokal gespeichert.');
  }

  function downloadChangedFiles() {
    if (!changedFiles.length) {
      setStatus('Es gibt keine geänderten Dateien.');
      return;
    }

    for (const file of changedFiles) {
      const key = file
        .split('/')
        .pop()
        .replace('.json', '');

      downloadFile(
        `${key}.json`,
        `${JSON.stringify(data[key], null, 2)}\n`,
      );
    }

    downloadFile(
      'GEAENDERTE-DATEIEN.txt',
      `${changedFiles.join('\n')}\n`,
      'text/plain;charset=utf-8',
    );

    setStatus(
      'Die geänderten Dateien wurden heruntergeladen.',
    );
  }

  function downloadCurrentFile() {
    const key = codeFile
      .split('/')
      .pop()
      .replace('.json', '');

    downloadFile(
      `${key}.json`,
      `${JSON.stringify(data[key], null, 2)}\n`,
    );

    setStatus(`${key}.json wurde heruntergeladen.`);
  }

  function resetDraft() {
    const confirmed = window.confirm(
      'Alle nicht heruntergeladenen Änderungen verwerfen?',
    );

    if (!confirmed) {
      return;
    }

    const restored = clone(baseline);

    setData(restored);
    writeStore(DRAFT_KEY, JSON.stringify(restored));
    setStatus('Der Entwurf wurde zurückgesetzt.');
  }

  function markAsUploaded() {
    const confirmed = window.confirm(
      'Den aktuellen Stand als neuen Ausgangspunkt markieren?',
    );

    if (!confirmed) {
      return;
    }

    const nextBaseline = clone(data);

    setBaseline(nextBaseline);

    writeStore(
      BASELINE_KEY,
      JSON.stringify(nextBaseline),
    );

    setStatus(
      'Der aktuelle Stand gilt jetzt als Ausgangspunkt.',
    );
  }

  async function changePassword() {
    const current = window.prompt(
      'Aktuelles Passwort',
    );

    if (!current) {
      return;
    }

    const valid = await checkPassword(current);

    if (!valid) {
      window.alert(
        'Das aktuelle Passwort ist falsch.',
      );
      return;
    }

    const next = window.prompt(
      'Neues Passwort, mindestens sechs Zeichen',
    );

    if (!next || next.length < 6) {
      window.alert(
        'Das neue Passwort ist zu kurz.',
      );
      return;
    }

    await savePassword(next);
    window.alert('Das Passwort wurde geändert.');
  }

  const codeKey = codeFile
    .split('/')
    .pop()
    .replace('.json', '');

  const currentCode = `${JSON.stringify(
    data[codeKey],
    null,
    2,
  )}\n`;

  const originalCode = `${JSON.stringify(
    baseline[codeKey],
    null,
    2,
  )}\n`;

  const nachziehAnzahl = ermittleNachziehschritte(data).filter((s) => s.dringend).length;

  return (
    <div className="admin-app">
      <header className="admin-topbar">
        <div>
          <h1>Deepfake Defender Admin</h1>

          <p>
            Inhalte bearbeiten, direkt prüfen und als
            einzelne Dateien herunterladen.
          </p>
        </div>

        <div className="admin-actions">
          <button
            type="button"
            className={
              view === 'editor' ? 'admin-primary' : ''
            }
            onClick={() => setView('editor')}
          >
            Bearbeiten
          </button>

          <button
            type="button"
            className={
              view === 'preview' ? 'admin-primary' : ''
            }
            onClick={() => setView('preview')}
          >
            Live-Vorschau
          </button>

          <button
            type="button"
            className={
              view === 'code' ? 'admin-primary' : ''
            }
            onClick={() => setView('code')}
          >
            Code
          </button>

          <button
            type="button"
            className={
              view === 'nachziehen' ? 'admin-primary' : ''
            }
            onClick={() => setView('nachziehen')}
          >
            Nachziehen
            {nachziehAnzahl > 0 && ` (${nachziehAnzahl})`}
          </button>

          <button
            type="button"
            className={
              view === 'werkstatt' ? 'admin-primary' : ''
            }
            onClick={() => setView('werkstatt')}
          >
            Code-Werkstatt
          </button>

          <button
            type="button"
            onClick={() => ladeZipHerunter(data, ladeEntwurf())}
          >
            Gesamtes Paket als ZIP
          </button>

          <button type="button" onClick={saveVersion}>
            Version speichern
          </button>

          <button
            type="button"
            disabled={!changedFiles.length}
            onClick={downloadChangedFiles}
          >
            Geänderte Dateien herunterladen
          </button>

          <button
            type="button"
            disabled={!changedFiles.length}
            onClick={markAsUploaded}
          >
            Als hochgeladen markieren
          </button>

          <button
            type="button"
            disabled={!changedFiles.length}
            onClick={resetDraft}
          >
            Änderungen verwerfen
          </button>

          <button
            type="button"
            onClick={changePassword}
          >
            Passwort ändern
          </button>

          <button
            type="button"
            onClick={() => setAuthenticated(false)}
          >
            Admin sperren
          </button>
        </div>
      </header>

      {view === 'nachziehen' && <NachziehHinweise data={data} />}

      {view === 'werkstatt' && <CodeWerkstatt />}

      {view === 'preview' && (
        <main className="admin-preview-page">
          <div className="admin-preview-toolbar">
            <div>
              <strong>Echte App-Vorschau</strong>

              <span>
                Die Vorschau erhält den aktuellen
                Adminentwurf.
              </span>
            </div>
          </div>

          <div className="admin-preview-frame">
            <App
              contentOverride={data}
              previewMode
            />
          </div>
        </main>
      )}

      {view === 'code' && (
        <main className="admin-code-page">
          <aside className="admin-code-files">
            <h2>Dateien</h2>

            {FILES.map((name) => {
              const file = `content/${name}.json`;

              return (
                <button
                  type="button"
                  key={file}
                  className={
                    codeFile === file ? 'active' : ''
                  }
                  onClick={() => setCodeFile(file)}
                >
                  <span>{file}</span>

                  {changedFiles.includes(file) && (
                    <strong>geändert</strong>
                  )}
                </button>
              );
            })}
          </aside>

          <section className="admin-code-panel">
            <div className="admin-panel-head">
              <div>
                <h2>{codeFile}</h2>

                <p>
                  {currentCode === originalCode
                    ? 'Unverändert'
                    : 'Diese Datei wurde geändert.'}
                </p>
              </div>

              <div className="admin-actions">
                <button
                  type="button"
                  className="admin-primary"
                  onClick={async () => {
                    await copyText(currentCode);

                    setStatus(
                      'Der vollständige neue Dateicode wurde kopiert.',
                    );
                  }}
                >
                  Neuen Code kopieren
                </button>

                <button
                  type="button"
                  onClick={downloadCurrentFile}
                >
                  Datei herunterladen
                </button>
              </div>
            </div>

            <div className="admin-code-columns">
              <div>
                <h3>Vorher</h3>

                <pre>
                  <code>{originalCode}</code>
                </pre>
              </div>

              <div>
                <h3>Neu</h3>

                <pre>
                  <code>{currentCode}</code>
                </pre>
              </div>
            </div>
          </section>
        </main>
      )}

      {view === 'editor' && (
        <div className="admin-layout">
          <aside className="admin-sidebar">
            {FILES.map((name) => (
              <button
                type="button"
                key={name}
                className={
                  section === name ? 'active' : ''
                }
                onClick={() => {
                  setSection(name);
                  setSelectedIndex(0);
                  setSearch('');
                }}
              >
                {FILE_LABELS[name]}

                {changedFiles.includes(
                  `content/${name}.json`,
                ) && <span>●</span>}
              </button>
            ))}

            <section className="admin-changes">
              <strong>Geänderte Dateien</strong>

              {changedFiles.length ? (
                changedFiles.map((file) => (
                  <button
                    type="button"
                    key={file}
                    onClick={() => {
                      setCodeFile(file);
                      setView('code');
                    }}
                  >
                    {file}
                  </button>
                ))
              ) : (
                <small>Keine Änderungen</small>
              )}
            </section>

            {problems.length > 0 && (
              <section className="admin-changes">
                <strong>Zu prüfen</strong>

                {problems.map((problem) => (
                  <small
                    key={problem}
                    className="admin-error"
                  >
                    {problem}
                  </small>
                ))}
              </section>
            )}
          </aside>

          <main className="admin-workspace">
            {section === 'settings' ? (
              <section className="admin-panel">
                <h2>Einstellungen</h2>

                <div className="admin-form-grid">
                  <label>
                    Zielpunktzahl

                    <input
                      type="number"
                      value={
                        data.settings.targetScore ?? 20
                      }
                      onChange={(event) =>
                        setData((current) => ({
                          ...current,
                          settings: {
                            ...current.settings,
                            targetScore: Number(
                              event.target.value,
                            ),
                          },
                        }))
                      }
                    />
                  </label>

                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={
                        data.settings.randomizeFeed !==
                        false
                      }
                      onChange={(event) =>
                        setData((current) => ({
                          ...current,
                          settings: {
                            ...current.settings,
                            randomizeFeed:
                              event.target.checked,
                          },
                        }))
                      }
                    />

                    Feed zufällig sortieren
                  </label>

                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={
                        data.settings
                          .randomizePrimaryMissions !==
                        false
                      }
                      onChange={(event) =>
                        setData((current) => ({
                          ...current,
                          settings: {
                            ...current.settings,
                            randomizePrimaryMissions:
                              event.target.checked,
                          },
                        }))
                      }
                    />

                    Missionen zufällig sortieren
                  </label>
                </div>
              </section>
            ) : (
              <>
                <section className="admin-list-panel">
                  <div className="admin-list-head">
                    <input
                      placeholder="Suchen"
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                    />

                    <button
                      type="button"
                      onClick={addItem}
                    >
                      Hinzufügen
                    </button>
                  </div>

                  <div className="admin-list">
                    {filteredItems.map(
                      ({ item, index }) => (
                        <button
                          type="button"
                          key={`${item.id}-${index}`}
                          className={
                            selectedIndex === index
                              ? 'active'
                              : ''
                          }
                          onClick={() =>
                            setSelectedIndex(index)
                          }
                        >
                          <strong>
                            {item.id ||
                              `Eintrag ${index + 1}`}
                          </strong>

                          <small>
                            {textValue(
                              item.title ||
                                item.caption ||
                                item.displayName ||
                                item.label ||
                                item.username,
                            )}
                          </small>
                        </button>
                      ),
                    )}
                  </div>
                </section>

                <section className="admin-panel">
                  <div className="admin-panel-head">
                    <h2>
                      {selectedItem?.id || 'Eintrag'}
                    </h2>

                    <button
                      type="button"
                      className="admin-danger"
                      disabled={!selectedItem}
                      onClick={removeItem}
                    >
                      Entfernen
                    </button>
                  </div>

                  {selectedItem ? (
                    <ItemEditor
                      type={section}
                      item={selectedItem}
                      onChange={updateItem}
                    />
                  ) : (
                    <p>Kein Eintrag ausgewählt.</p>
                  )}
                </section>
              </>
            )}
          </main>
        </div>
      )}

      {status && (
        <button
          type="button"
          className="admin-status"
          onClick={() => setStatus('')}
        >
          {status}
        </button>
      )}
    </div>
  );
}