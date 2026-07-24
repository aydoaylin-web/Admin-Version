/* ===========================================================================
   Testansicht — so sieht ein Kind den Fall.
   ---------------------------------------------------------------------------
   Die Bewertung der Begruendung ist dieselbe Rechnung wie in der Schueler-App
   (src/data/conceptMatcher.js): normalisieren, Wortstamm kuerzen, Tippfehler
   verzeihen. Du kannst hier also eine echte Kinderantwort eintippen und
   sofort sehen, ob sie den Punkt bekommt.
   =========================================================================== */

import { data, imageUrl } from './store.js';
import { el, clear, text, button } from './ui.js';

const VERDICT_LABEL = { echt: 'Echt', suspekt: 'Suspekt', manipuliert: 'Manipuliert' };

/* --------------------------------------------------------------------------
   Abgleich der Begruendung — 1:1 wie in der App
   -------------------------------------------------------------------------- */

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stem(word) {
  for (const suffix of ['en', 'em', 'er', 'es', 'te', 'ten', 'st', 'e', 'n', 's']) {
    if (word.length - suffix.length >= 3 && word.endsWith(suffix)) return word.slice(0, -suffix.length);
  }
  return word;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[n];
}

function tokenHitsTerm(token, term) {
  if (!term) return false;
  if (token === term) return true;
  const tolerance = term.length >= 7 ? 2 : term.length >= 5 ? 1 : 0;
  if (tolerance > 0 && levenshtein(token, term) <= tolerance) return true;
  const stemmed = stem(term);
  return stemmed.length >= 4 && stem(token) === stemmed;
}

function phraseInText(tokens, raw, phrase) {
  if (raw.includes(phrase)) return true;
  const parts = phrase.split(' ').filter(w => w.length > 2);
  if (!parts.length) return false;
  return parts.every(part => tokens.some(token => tokenHitsTerm(token, part)));
}

function termInText(tokens, raw, term) {
  if (term.includes(' ')) return phraseInText(tokens, raw, term);
  return tokens.some(token => tokenHitsTerm(token, term));
}

export function matchReason(postId, answer) {
  const d = data();
  const entry = d.reason.concepts[postId];
  const raw = normalize(answer);
  const tokens = raw.split(' ').filter(Boolean);
  const slangOnly = () => tokens.some(token =>
    d.reason.slangOnly.some(word => tokenHitsTerm(token, normalize(word))));

  if (!entry || !tokens.length) {
    return { matched: false, hadSlangOnly: slangOnly(), feedback: entry?.feedback || null };
  }
  for (const concept of entry.concepts || []) {
    for (const term of concept.terms || []) {
      if (termInText(tokens, raw, normalize(term))) {
        return { matched: true, via: term, conceptName: concept.name, feedback: entry.feedback };
      }
    }
    for (const phrase of concept.phrases || []) {
      if (phraseInText(tokens, raw, normalize(phrase))) {
        return { matched: true, via: phrase, conceptName: concept.name, feedback: entry.feedback };
      }
    }
  }
  return { matched: false, hadSlangOnly: slangOnly(), feedback: entry.feedback };
}

/* --------------------------------------------------------------------------
   Die Ansicht
   -------------------------------------------------------------------------- */

const view = { postIndex: 0, lang: 'de', verdict: null, answer: '', result: null, openTool: null };

export function renderPreview(root) {
  clear(root);
  const d = data();

  if (view.postIndex >= d.posts.length) view.postIndex = 0;
  const post = d.posts[view.postIndex];
  const task = d.tasks.find(t => t.id === post.taskId || t.postId === post.id);

  root.append(el('div', 'page-head', [
    el('h2', null, 'Testansicht'),
    el('p', null,
      'Der Fall so, wie ihn ein Kind sieht. Tipp eine Begründung ein und drück ' +
      'auf Prüfen — bewertet wird mit derselben Rechnung wie im Spiel.'),
  ]));

  /* Steuerleiste */
  const picker = el('select');
  picker.style.maxWidth = '320px';
  d.posts.forEach((p, index) => {
    const option = el('option', null, `${p.id} · ${p.username}`);
    option.value = String(index);
    picker.append(option);
  });
  picker.value = String(view.postIndex);
  picker.addEventListener('change', () => {
    view.postIndex = Number(picker.value);
    reset();
    renderPreview(root);
  });

  const langPick = el('div', 'langpick');
  for (const lang of ['de', 'en']) {
    const node = el('button', view.lang === lang ? 'on' : '', lang.toUpperCase());
    node.type = 'button';
    node.addEventListener('click', () => { view.lang = lang; renderPreview(root); });
    langPick.append(node);
  }

  const bar = el('div', 'row');
  bar.style.marginBottom = '16px';
  bar.append(picker, el('div', 'tight', langPick),
    el('div', 'tight', button('Zurücksetzen', 'btn', () => { reset(); renderPreview(root); })));
  root.append(bar);

  root.append(studentCard(post, task, root));
}

function reset() {
  view.verdict = null;
  view.answer = '';
  view.result = null;
  view.openTool = null;
}

function studentCard(post, task, root) {
  const d = data();
  const lang = view.lang;
  const t = value => text(value, lang);
  const wrap = el('div', 'stu-wrap');

  /* Kopf */
  wrap.append(el('div', 'stu-bar', [
    el('span', 't', t(task?.title) || 'Faktencheck'),
    el('span', 'clock', `${task?.timeLimit ?? 180}s`),
  ]));

  /* Der Beitrag */
  const media = el('img', 'stu-img');
  media.src = imageUrl(post.media);
  media.alt = t(post.imageAlt);

  wrap.append(el('div', 'stu-post', [
    el('div', 'stu-head', [
      el('div', 'stu-av', (post.username || '?').slice(0, 1).toUpperCase()),
      el('div', null, [
        el('strong', null, post.username || ''),
        el('small', null, t(post.location) || t(post.time) || ''),
      ]),
    ]),
    media,
    el('div', 'stu-cap', [el('b', null, post.username || ''), document.createTextNode(t(post.caption))]),
  ]));

  /* Die vier Werkzeuge */
  const tools = el('div', 'stu-tools');
  const profile = d.profiles.find(p => p.id === post.profileId);
  tools.append(
    tool('Bildanalyse', imageToolBody(post), root),
    tool('Quellenprüfung', sourceToolBody(post, t), root),
    tool('Profilprüfung', profileToolBody(profile, t), root),
    tool('Bildherkunft', originToolBody(post, t), root),
  );
  wrap.append(tools);

  /* Urteil */
  wrap.append(el('div', 'stu-q', lang === 'de'
    ? 'Was ist dein Urteil? Ist dieser Feed echt, suspekt oder manipuliert?'
    : "What's your verdict? Is this feed real, suspicious or manipulated?"));

  const verdicts = el('div', 'stu-verdicts');
  for (const verdict of ['echt', 'suspekt', 'manipuliert']) {
    const node = el('button', view.verdict === verdict ? 'on' : '', VERDICT_LABEL[verdict]);
    node.type = 'button';
    node.addEventListener('click', () => { view.verdict = verdict; renderPreview(root); });
    verdicts.append(node);
  }
  wrap.append(verdicts);

  /* Begründung */
  const answer = el('textarea');
  answer.rows = 3;
  answer.placeholder = t(task?.answerPrompt) || 'Warum?';
  answer.value = view.answer;
  answer.addEventListener('input', () => { view.answer = answer.value; });

  const check = button(lang === 'de' ? 'Antwort prüfen' : 'Check answer', 'btn dark', () => {
    const match = matchReason(post.id, view.answer);
    view.result = {
      verdictOk: view.verdict === task?.correctVerdict,
      reasonOk: match.matched,
      via: match.via,
      slangOnly: match.hadSlangOnly,
    };
    renderPreview(root);
  });
  check.style.width = '100%';
  check.style.marginTop = '10px';

  wrap.append(el('div', 'stu-answer', [answer, check]));

  /* Ergebnis */
  if (view.result) {
    const { verdictOk, reasonOk, via, slangOnly } = view.result;
    const points = (verdictOk ? 1 : 0) + (reasonOk ? 1 : 0);
    const box = el('div', `stu-result ${points === 2 ? 'ok' : 'no'}`);

    box.append(el('b', null, `${points} von 2 Punkten`));
    box.append(el('div', null,
      `${verdictOk ? '✓' : '✗'} Urteil${verdictOk ? '' : ` — richtig wäre „${VERDICT_LABEL[task?.correctVerdict]}"`}`));
    box.append(el('div', null, `${reasonOk ? '✓' : '✗'} Begründung`));

    if (reasonOk && via) {
      const note = el('div', null, `erkannt über: „${via}"`);
      note.style.cssText = 'margin-top:6px;font-family:var(--mono);font-size:11px;opacity:.75';
      box.append(note);
    }
    if (!reasonOk && slangOnly) {
      const note = el('div', null,
        'Die Antwort enthält nur ein Gefühlswort wie „sus" oder „fake" — das zählt bewusst nicht allein.');
      note.style.cssText = 'margin-top:6px;font-size:12px';
      box.append(note);
    }
    if (!reasonOk && !slangOnly && view.answer.trim()) {
      const note = el('div', null,
        'Kein hinterlegter Begriff getroffen. Wenn diese Antwort gelten soll, ' +
        'nimm sie unter „Begründungen" auf.');
      note.style.cssText = 'margin-top:6px;font-size:12px';
      box.append(note);
    }

    const explain = t(d.reason.concepts[post.id]?.feedback);
    if (explain) {
      const note = el('div', null, explain);
      note.style.cssText = 'margin-top:9px;padding-top:9px;border-top:1px solid currentColor;font-size:12px;opacity:.9';
      box.append(note);
    }
    wrap.append(box);
  }

  return wrap;
}

function tool(name, body, root) {
  const node = el('div', 'stu-tool');
  const open = view.openTool === name;
  const head = el('button', null, [
    el('span', null, name),
    el('span', null, open ? '−' : '+'),
  ]);
  head.type = 'button';
  head.addEventListener('click', () => {
    view.openTool = open ? null : name;
    renderPreview(root);
  });
  node.append(head);
  if (open) node.append(el('div', 'body', body));
  return node;
}

function imageToolBody(post) {
  const d = data();
  const entry = d.hotspots[post.id];
  if (!entry) return [el('span', null, 'Für diesen Beitrag ist keine Bildanalyse hinterlegt.')];
  if (entry.inspectionOnly) return [el('span', null, 'Das Bild kann nur betrachtet und vergrößert werden.')];

  const stage = el('div', 'stage');
  const image = el('img');
  image.src = imageUrl(post.media);
  image.alt = '';
  stage.append(image);
  (entry.hotspots || []).forEach((zone, index) => {
    const node = el('div', 'zone');
    node.style.left = `${zone.x}%`;
    node.style.top = `${zone.y}%`;
    node.style.width = `${zone.w}%`;
    node.style.height = `${zone.h}%`;
    node.append(el('b', null, String(index + 1)));
    stage.append(node);
  });

  const hints = el('ol');
  hints.style.cssText = 'margin:9px 0 0;padding-left:20px;font-size:12px';
  for (const zone of entry.hotspots || []) hints.append(el('li', null, zone.hint || '(kein Text)'));

  return [
    el('p', null, 'Die Kinder sehen die Rahmen nicht — sie müssen die Stellen selbst treffen.'),
    stage,
    hints,
  ];
}

function sourceToolBody(post, t) {
  const check = post.sourceCheck;
  if (!check?.available) return [el('span', null, 'Kein Link am Beitrag — die Quellenprüfung bleibt leer.')];

  const rows = [
    ['Adresse', check.url],
    ['Titel', t(check.title)],
    ['Impressum', t(check.imprint)],
    ['Verantwortlich', t(check.author)],
    ['Veröffentlicht', t(check.published)],
  ].filter(([, value]) => value);

  const dl = el('dl');
  for (const [label, value] of rows) {
    dl.append(el('dt', null, label), el('dd', null, String(value)));
  }

  const parts = [dl];
  if (t(check.articleSummary)) parts.push(el('p', null, t(check.articleSummary)));
  if (check.keyFacts?.length) {
    const list = el('ul');
    list.style.cssText = 'margin:6px 0 0;padding-left:20px';
    for (const fact of check.keyFacts) list.append(el('li', null, t(fact)));
    parts.push(list);
  }
  if (t(check.note)) parts.push(el('div', 'tip', t(check.note)));
  return parts;
}

function profileToolBody(profile, t) {
  if (!profile) return [el('span', null, 'Diesem Beitrag ist kein Profil zugeordnet.')];
  const fields = ['accountType', 'created', 'visibility', 'posts', 'followers',
    'verification', 'comments', 'imprint', 'website', 'note'];
  const check = profile.profileCheck || {};
  const dl = el('dl');
  let any = false;
  for (const key of fields) {
    const value = t(check[key]);
    if (!value) continue;      // leere Felder werden bewusst weggelassen
    any = true;
    dl.append(el('dt', null, key), el('dd', null, value));
  }
  return any ? [dl] : [el('span', null, 'Zu diesem Profil ist nichts hinterlegt.')];
}

function originToolBody(post, t) {
  const check = post.imageOriginCheck;
  if (!check?.available) return [el('span', null, 'Die Bildherkunft ist für diesen Beitrag abgeschaltet.')];
  if (!check.hits?.length) return [el('span', null, 'Die Suche findet nichts — die leere Liste ist selbst der Hinweis.')];

  const list = el('div');
  for (const hit of check.hits) {
    const item = el('div', 'item');
    item.style.margin = '0 0 8px';
    item.append(el('strong', null, t(hit.title)));
    const meta = el('div', null, `${hit.source} · ${t(hit.date)}`);
    meta.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--text-pale);margin-top:3px';
    item.append(meta);
    list.append(item);
  }
  return [list];
}
