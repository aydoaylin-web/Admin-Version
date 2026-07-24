/* ===========================================================================
   Die Editoren.
   ---------------------------------------------------------------------------
   Jeder Abschnitt bekommt einen Behaelter und zeichnet sich hinein.
   Alle schreiben ueber store.edit / store.editLive, damit Rueckgaengig und
   die Aenderungsspur automatisch mitlaufen.
   =========================================================================== */

import { data, edit, imageUrl } from './store.js';
import {
  el, clear, text, field, biField, toggle, select,
  tagList, chip, button, card, toast,
} from './ui.js';

const VERDICTS = ['echt', 'suspekt', 'manipuliert'];
const VERDICT_LABEL = { echt: 'Echt', suspekt: 'Suspekt', manipuliert: 'Manipuliert' };

/* Merkt sich, welcher Eintrag in welchem Abschnitt gerade offen ist. */
const selection = { posts: 0, tasks: 0, reasons: 0, profiles: 0, hotspots: 0 };
export function getSelection() { return selection; }

/** Zweispaltiges Geruest: Liste links, Editor rechts. */
function split(items, key, render, onList) {
  const wrap = el('div', 'split');
  const list = el('div', 'list');
  const pane = el('div');

  const draw = () => {
    clear(list);
    items.forEach((item, index) => {
      const node = el('button');
      node.type = 'button';
      if (index === selection[key]) node.classList.add('on');
      onList(node, item, index);
      node.addEventListener('click', () => {
        selection[key] = index;
        draw();
        clear(pane);
        pane.append(render(items[index], index));
      });
      list.append(node);
    });
  };

  if (selection[key] >= items.length) selection[key] = 0;
  draw();
  if (items.length) pane.append(render(items[selection[key]], selection[key]));
  else pane.append(el('div', 'empty', 'Keine Einträge vorhanden.'));

  wrap.append(list, pane);
  return wrap;
}

/* ==========================================================================
   Beiträge
   ========================================================================== */

export function renderPosts(root) {
  clear(root);
  const d = data();

  root.append(head(
    'Beiträge',
    'Alles, was die Kinder im Feed sehen: Text, Bild, Kommentare und die beiden ' +
    'Prüfwerkzeuge Quelle und Bildherkunft. Links wählst du den Beitrag.'
  ));

  root.append(split(d.posts, 'posts',
    post => postEditor(post),
    (node, post) => {
      const task = d.tasks.find(t => t.id === post.taskId);
      node.append(
        el('span', 'id', post.id),
        el('span', 'name', post.username || '—'),
        el('span', 'meta', [
          task ? chip(task.correctVerdict) : el('span', 'chip', 'ohne Aufgabe'),
        ]),
      );
    }
  ));
}

function postEditor(post) {
  const d = data();
  const wrap = el('div');

  /* --- Kopfdaten --- */
  const imageChoices = [...new Set(d.posts.map(p => p.media).filter(Boolean))].sort();
  const preview = el('img');
  preview.src = imageUrl(post.media);
  preview.alt = '';
  preview.style.cssText = 'width:100%;max-height:190px;object-fit:contain;background:#111;border-radius:10px;display:block';

  const mediaPick = select('Bild', post, 'media', imageChoices,
    'Neue Bilder legst du in assets/posts/ ab und lädst das Projekt danach neu.');
  mediaPick.querySelector('select').addEventListener('change', event => {
    preview.src = imageUrl(event.target.value);
  });

  wrap.append(card('Absender', null, [
    row([
      field('Benutzername', post, 'username', { mono: true }),
      field('Anzeigename', post, 'displayName'),
    ]),
    row([
      field('Likes', post, 'likes', { type: 'number' }),
      select('Profil dahinter', post, 'profileId',
        d.profiles.map(p => p.id),
        'Bestimmt, was die Profilprüfung anzeigt.'),
    ]),
    toggle('Verifiziert (blauer Haken)', post, 'verified'),
  ]));

  wrap.append(card('Beitrag', null, [
    mediaPick,
    preview,
    biField('Bildunterschrift', post, 'caption', { multiline: true, rows: 3 }),
    biField('Bildbeschreibung für Screenreader', post, 'imageAlt', { multiline: true, rows: 2 }),
    row([
      biField('Zeitangabe', post, 'time'),
      biField('Ort', post, 'location'),
    ]),
  ]));

  wrap.append(commentsCard(post));
  wrap.append(sourceCard(post));
  wrap.append(originCard(post));

  return wrap;
}

function commentsCard(post) {
  const body = el('div');

  const draw = () => {
    clear(body);
    const comments = post.comments || (post.comments = []);
    if (!comments.length) {
      body.append(el('p', 'hint', 'Noch keine Kommentare.'));
    }
    comments.forEach((comment, index) => {
      const item = el('div', 'item');
      const top = el('div', 'item-top', [
        el('span', 'n', `#${index + 1}`),
        button('Löschen', 'btn small danger', () => {
          edit(() => { post.comments.splice(index, 1); });
          draw();
        }),
      ]);
      item.append(top);
      item.append(field('Benutzername', comment, 'username', { mono: true }));
      item.append(biField('Kommentar', comment, 'text', { multiline: true, rows: 2 }));
      body.append(item);
    });
  };

  draw();

  return card('Kommentare',
    'Sie machen den Feed lebendig — und einzelne davon sind Hinweise. ' +
    'Ein Kommentar wie „wo ist die Quelle??" darf ruhig auf die Spur führen.',
    [body, button('Kommentar hinzufügen', 'btn', () => {
      edit(() => {
        post.comments = post.comments || [];
        post.comments.push({ username: '', text: { de: '', en: '' } });
      });
      draw();
    })]
  );
}

function sourceCard(post) {
  const body = el('div');

  const draw = () => {
    clear(body);
    const check = post.sourceCheck;
    if (!check?.available) {
      body.append(el('p', 'hint',
        'Für diesen Beitrag gibt es keine Quellenprüfung. Die Kinder sehen dann ' +
        '„kein Link" — auch das kann ein Hinweis sein.'));
      body.append(button('Quellenprüfung anlegen', 'btn', () => {
        edit(() => {
          post.sourceCheck = {
            available: true, url: '', domain: '', status: 'reliable',
            linkLabel: { de: 'Weitere Infos', en: 'More information' },
            title: { de: '', en: '' }, note: { de: '', en: '' },
            imprint: { de: '', en: '' }, author: { de: '', en: '' },
            published: { de: '', en: '' }, keyFacts: [],
          };
        });
        draw();
      }));
      return;
    }

    body.append(row([
      field('Adresse', check, 'url', { mono: true }),
      field('Domain', check, 'domain', { mono: true }),
    ]));

    body.append(select('Einschätzung der Seite', check, 'status', [
      { value: 'official', label: 'Amtlich' },
      { value: 'reliable', label: 'Seriös' },
      { value: 'mixed', label: 'Gemischt — Seite sagt etwas anderes' },
      { value: 'warning', label: 'Zweifelhaft' },
      { value: 'ad', label: 'Werbung' },
    ], 'Färbt den Hinweiskasten in der Schüler-App.'));

    body.append(biField('Seitentitel', check, 'title'));
    body.append(row([
      biField('Impressum', check, 'imprint'),
      biField('Verantwortlich', check, 'author'),
      biField('Veröffentlicht', check, 'published'),
    ]));
    body.append(biField('Hinweis an die Kinder', check, 'note', { multiline: true, rows: 2 }));
    body.append(biField('Überschrift des Artikels', check, 'articleHeadline', { multiline: true, rows: 2 }));
    body.append(biField('Zusammenfassung', check, 'articleSummary', { multiline: true, rows: 3 }));

    /* Stichpunkte: Liste zweisprachiger Texte */
    const facts = el('div');
    const drawFacts = () => {
      clear(facts);
      check.keyFacts = check.keyFacts || [];
      check.keyFacts.forEach((fact, index) => {
        const holder = { value: fact };
        const line = el('div', 'item');
        line.append(el('div', 'item-top', [
          el('span', 'n', `Stichpunkt ${index + 1}`),
          button('Löschen', 'btn small danger', () => {
            edit(() => { check.keyFacts.splice(index, 1); });
            drawFacts();
          }),
        ]));
        line.append(biField(null, check.keyFacts, String(index)));
        facts.append(line);
      });
    };
    drawFacts();

    body.append(card('Stichpunkte auf der Seite',
      'Kurze Fakten, die die Kinder mit dem Beitrag vergleichen. Genau hier ' +
      'entsteht der Widerspruch, den sie finden sollen.',
      [facts, button('Stichpunkt hinzufügen', 'btn', () => {
        edit(() => {
          check.keyFacts = check.keyFacts || [];
          check.keyFacts.push({ de: '', en: '' });
        });
        drawFacts();
      })]));

    body.append(button('Quellenprüfung entfernen', 'btn small danger', () => {
      edit(() => { post.sourceCheck = { available: false }; });
      draw();
    }));
  };

  draw();
  return card('Werkzeug: Quellenprüfung', null, [body]);
}

function originCard(post) {
  const body = el('div');

  const draw = () => {
    clear(body);
    const check = post.imageOriginCheck;

    if (!check?.available) {
      body.append(el('p', 'hint',
        'Ohne Bildherkunft sehen die Kinder „nichts gefunden". Das ist ein Hinweis, ' +
        'darf aber nie allein die Lösung sein — es braucht immer ein zweites Signal.'));
      body.append(button('Bildherkunft anlegen', 'btn', () => {
        edit(() => { post.imageOriginCheck = { available: true, result: 'none', hits: [] }; });
        draw();
      }));
      return;
    }

    body.append(select('Ergebnis', check, 'result', [
      { value: 'confirm', label: 'Bestätigt den Beitrag' },
      { value: 'mismatch', label: 'Widerspricht dem Beitrag' },
      { value: 'none', label: 'Keine Treffer' },
    ]));

    const hits = el('div');
    const drawHits = () => {
      clear(hits);
      check.hits = check.hits || [];
      if (!check.hits.length) hits.append(el('p', 'hint', 'Keine Treffer — die Suche bleibt leer.'));
      check.hits.forEach((hit, index) => {
        const item = el('div', 'item');
        item.append(el('div', 'item-top', [
          el('span', 'n', `Treffer ${index + 1}`),
          button('Löschen', 'btn small danger', () => {
            edit(() => { check.hits.splice(index, 1); });
            drawHits();
          }),
        ]));
        item.append(field('Quelle', hit, 'source', { mono: true }));
        item.append(biField('Titel', hit, 'title', { multiline: true, rows: 2 }));
        item.append(biField('Datum', hit, 'date'));
        hits.append(item);
      });
    };
    drawHits();

    body.append(hits);
    body.append(button('Treffer hinzufügen', 'btn', () => {
      edit(() => {
        check.hits = check.hits || [];
        check.hits.push({ source: '', title: { de: '', en: '' }, date: { de: '', en: '' } });
      });
      drawHits();
    }));
    body.append(button('Bildherkunft entfernen', 'btn small danger', () => {
      edit(() => { post.imageOriginCheck = { available: false, result: 'none', hits: [] }; });
      draw();
    }));
  };

  draw();
  return card('Werkzeug: Bildherkunft', null, [body]);
}

/* ==========================================================================
   Aufgaben — hier sitzt das richtige Urteil
   ========================================================================== */

export function renderTasks(root) {
  clear(root);
  const d = data();

  root.append(head(
    'Aufgaben und Urteile',
    'Das richtige Urteil steht an zwei Stellen: in tasks.json und in ' +
    'reasonConcepts.js. Das Studio hält beide zusammen — änderst du es hier, ' +
    'wird es dort mitgezogen.'
  ));

  root.append(verdictBalance(d));

  root.append(split(d.tasks, 'tasks',
    task => taskEditor(task),
    (node, task) => {
      node.append(
        el('span', 'id', task.postId || task.id),
        el('span', 'name', text(task.title) || task.id),
        el('span', 'meta', [chip(task.correctVerdict)]),
      );
    }
  ));
}

/** Zeigt, wie sich die 18 Fälle auf die drei Urteile verteilen. */
function verdictBalance(d) {
  const counts = { echt: 0, suspekt: 0, manipuliert: 0 };
  for (const task of d.tasks) if (counts[task.correctVerdict] !== undefined) counts[task.correctVerdict]++;
  const total = d.tasks.length;

  const box = el('div', 'summary-box');
  box.append(el('div', null, [
    el('div', null, [el('strong', null, 'Verteilung der Urteile')]),
    el('div', 'hint', 'Zu viele Fälle einer Sorte machen das Spiel erratbar.'),
  ]));
  for (const verdict of VERDICTS) {
    box.append(el('div', null, [
      el('div', 'big', String(counts[verdict])),
      chip(verdict),
    ]));
  }
  box.append(el('div', null, [
    el('div', 'big', String(total)),
    el('span', 'chip', 'Fälle gesamt'),
  ]));
  return box;
}

function taskEditor(task) {
  const d = data();
  const wrap = el('div');
  const concept = d.reason.concepts[task.postId];

  /* --- Urteil --- */
  const picker = el('div', 'verdicts');
  const drawPicker = () => {
    clear(picker);
    for (const verdict of VERDICTS) {
      const node = el('button', task.correctVerdict === verdict ? 'on' : '', VERDICT_LABEL[verdict]);
      node.dataset.v = verdict;
      node.type = 'button';
      node.addEventListener('click', () => {
        edit(() => {
          task.correctVerdict = verdict;
          // Beide Stellen zusammenhalten
          if (d.reason.concepts[task.postId]) d.reason.concepts[task.postId].verdict = verdict;
        });
        drawPicker();
        toast(`Urteil auf „${VERDICT_LABEL[verdict]}" gesetzt — auch in reasonConcepts.js`);
      });
      picker.append(node);
    }
  };
  drawPicker();

  const notes = el('div');
  if (!concept) {
    notes.append(el('div', 'warn', [
      el('span', null, '⚠'),
      el('div', null, [
        el('b', null, 'Keine Begründungen hinterlegt. '),
        el('span', null, `Für ${task.postId} fehlt ein Eintrag in reasonConcepts.js. ` +
          'Ohne ihn kann kein Kind den zweiten Punkt bekommen.'),
      ]),
    ]));
  }

  wrap.append(card('Richtiges Urteil',
    'Ein Punkt für das Urteil, ein Punkt für die Begründung — mehr gibt es pro Fall nicht.',
    [picker, notes]));

  wrap.append(card('Texte der Aufgabe', null, [
    biField('Titel', task, 'title'),
    biField('Aufgabenstellung', task, 'instruction', { multiline: true, rows: 2 }),
    biField('Hinweis über dem Antwortfeld', task, 'answerPrompt', { multiline: true, rows: 2 }),
    row([
      field('Zeit in Sekunden', task, 'timeLimit', { type: 'number' }),
      field('Mindestlänge der Begründung', task, 'minimumReasonLength', { type: 'number' }),
    ]),
  ]));

  wrap.append(card('Rückmeldung nach dem Absenden',
    'Der wichtigste Lernmoment. Sag konkret, woran man es hätte sehen können — ' +
    'nicht nur, dass es falsch war.',
    [
      biField('Wenn richtig', task, 'feedbackCorrect', { multiline: true, rows: 4 }),
      biField('Wenn falsch', task, 'feedbackWrong', { multiline: true, rows: 4 }),
    ]));

  return wrap;
}

/* ==========================================================================
   Begründungen (reasonConcepts.js)
   ========================================================================== */

export function renderReasons(root) {
  clear(root);
  const d = data();
  const ids = Object.keys(d.reason.concepts);

  root.append(head(
    'Akzeptierte Begründungen',
    'Womit ein Kind den zweiten Punkt bekommt. Der Abgleich läuft offline und ' +
    'ohne KI: Begriffe werden auf den Wortstamm gekürzt, Tippfehler werden verziehen.'
  ));

  root.append(card('Wörter, die nie allein zählen',
    'Reiner Slang beschreibt ein Gefühl, aber keine Beobachtung. Wer nur „sus" ' +
    'schreibt, bekommt keinen Punkt — auch wenn das Urteil stimmt.',
    [tagList(null, d.reason, 'slangOnly')]));

  const items = ids.map(id => ({ id, entry: d.reason.concepts[id] }));

  root.append(split(items, 'reasons',
    item => reasonEditor(item.id, item.entry),
    (node, item) => {
      node.append(
        el('span', 'id', item.id),
        el('span', 'name', `${item.entry.concepts?.length || 0} Begründung(en)`),
        el('span', 'meta', [chip(item.entry.verdict)]),
      );
    }
  ));
}

function reasonEditor(postId, entry) {
  const d = data();
  const wrap = el('div');
  const task = d.tasks.find(t => t.postId === postId);

  if (task && task.correctVerdict !== entry.verdict) {
    wrap.append(el('div', 'warn', [
      el('span', null, '⚠'),
      el('div', null, [
        el('b', null, 'Die beiden Dateien widersprechen sich. '),
        el('span', null, `In tasks.json steht „${VERDICT_LABEL[task.correctVerdict]}", ` +
          `hier „${VERDICT_LABEL[entry.verdict]}". `),
        button('Auf tasks.json angleichen', 'btn small', () => {
          edit(() => { entry.verdict = task.correctVerdict; });
        }),
      ]),
    ]));
  }

  const list = el('div');
  const draw = () => {
    clear(list);
    entry.concepts = entry.concepts || [];
    entry.concepts.forEach((concept, index) => {
      const item = el('div', 'item');
      item.append(el('div', 'item-top', [
        el('span', 'n', `Begründung ${index + 1}`),
        entry.concepts.length > 1
          ? button('Löschen', 'btn small danger', () => {
              edit(() => { entry.concepts.splice(index, 1); });
              draw();
            })
          : null,
      ]));
      item.append(row([
        field('Kennung', concept, 'id', { mono: true }),
        field('Name (nur für dich)', concept, 'name'),
      ]));
      item.append(tagList('Einzelne Wörter', concept, 'terms',
        'Eines davon genügt zusammen mit dem Rest. Wortstamm reicht — „offiziell" fängt auch „offizielle".'));
      item.append(tagList('Ganze Wendungen', concept, 'phrases',
        'Werden als Ganzes gesucht. Gut für Sätze, die Kinder wirklich schreiben.'));
      list.append(item);
    });
  };
  draw();

  wrap.append(card('Was als Begründung gilt',
    'Mehrere Begründungen sind erlaubt — jede davon gibt den Punkt. Sinnvoll, ' +
    'wenn ein Fall auf zwei Wegen lösbar ist.',
    [list, button('Weitere Begründung zulassen', 'btn', () => {
      edit(() => {
        entry.concepts = entry.concepts || [];
        entry.concepts.push({ id: '', name: '', terms: [], phrases: [] });
      });
      draw();
    })]));

  wrap.append(card('Erklärung nach der Abgabe',
    'Steht neben der Antwort des Kindes, damit es den Unterschied selbst sieht.',
    [biField(null, entry, 'feedback', { multiline: true, rows: 4 })]));

  return wrap;
}

/* ==========================================================================
   Profile
   ========================================================================== */

export function renderProfiles(root) {
  clear(root);
  const d = data();
  const used = new Set(d.posts.map(p => p.profileId));

  root.append(head(
    'Profile',
    'Was die Profilprüfung anzeigt. Nur Profile mit einem Beitrag sind im Spiel ' +
    'sichtbar — die übrigen sind Vorrat.'
  ));

  const sorted = [...d.profiles].sort((a, b) =>
    (used.has(b.id) ? 1 : 0) - (used.has(a.id) ? 1 : 0) || a.id.localeCompare(b.id));

  root.append(split(sorted, 'profiles',
    profile => profileEditor(profile),
    (node, profile) => {
      node.append(
        el('span', 'id', profile.id),
        el('span', 'name', profile.username || profile.displayName || '—'),
        el('span', 'meta', [
          used.has(profile.id) ? el('span', 'chip echt', 'im Spiel') : el('span', 'chip', 'Vorrat'),
        ]),
      );
    }
  ));
}

function profileEditor(profile) {
  const wrap = el('div');

  wrap.append(card('Konto', null, [
    row([
      field('Benutzername', profile, 'username', { mono: true }),
      field('Anzeigename', profile, 'displayName'),
    ]),
    row([
      field('Folgende', profile, 'followers', { type: 'number' }),
      field('Folgt', profile, 'following', { type: 'number' }),
    ]),
    toggle('Verifiziert', profile, 'verified'),
    biField('Kurzbeschreibung', profile, 'bio', { multiline: true, rows: 2 }),
  ]));

  const check = profile.profileCheck || (profile.profileCheck = {});
  const fields = [
    ['accountType', 'Kontoart'],
    ['created', 'Erstellt'],
    ['visibility', 'Sichtbarkeit'],
    ['posts', 'Beiträge'],
    ['followers', 'Folgende'],
    ['verification', 'Verifizierung'],
    ['comments', 'Kommentare'],
    ['imprint', 'Impressum'],
    ['website', 'Webseite'],
    ['note', 'Besonderheit'],
    ['bio', 'Beschreibung in der Prüfung'],
  ];

  wrap.append(card('Was die Profilprüfung zeigt',
    'Leere Felder werden in der Schüler-App weggelassen — die Kinder sollen die ' +
    'Lücke selbst bemerken, statt „kein Impressum" vorgesagt zu bekommen.',
    fields.map(([key, label]) => biField(label, check, key))));

  return wrap;
}

/* ==========================================================================
   Einstellungen
   ========================================================================== */

export function renderSettings(root) {
  clear(root);
  const d = data();

  root.append(head('Einstellungen', 'Regeln, die für das ganze Spiel gelten.'));

  root.append(card('Spiel', null, [
    row([
      field('Punkte zum Gewinnen', d.settings, 'targetScore', { type: 'number' }),
      field('Punkte zum Verlieren', d.settings, 'loseScore', { type: 'number' }),
      field('Standardzeit je Fall (Sekunden)', d.settings, 'defaultTimeLimit', { type: 'number' }),
    ]),
    toggle('Reihenfolge der Fälle mischen', d.settings, 'randomizePrimaryMissions'),
    toggle('Feed mischen', d.settings, 'randomizeFeed'),
  ]));

  root.append(card('Bezeichnungen', null, [
    row([
      field('Name der App', d.settings, 'appName'),
      field('Name des Inhaltspakets', d.settings, 'contentPackName'),
      field('Fassung', d.settings, 'contentPackVersion', { mono: true }),
    ]),
  ]));

  const types = d.settings.taskTypes || {};
  root.append(card('Texte der Pushnachrichten',
    'Was auf der Benachrichtigung steht, wenn ein neuer Fall hereinkommt.',
    Object.keys(types).map(key => {
      const entry = types[key];
      return card(key, null, [
        biField('Bezeichnung', entry, 'label'),
        biField('Überschrift', entry, 'notificationTitle'),
        biField('Text', entry, 'notificationText', { multiline: true, rows: 2 }),
      ]);
    })));
}

/* ==========================================================================
   Kleinteile
   ========================================================================== */

function head(title, description) {
  return el('div', 'page-head', [
    el('h2', null, title),
    description ? el('p', null, description) : null,
  ]);
}

function row(children) {
  return el('div', 'row', children.filter(Boolean));
}
