/* ===========================================================================
   Bildzonen — der Editor fuer die Bildanalyse.
   ---------------------------------------------------------------------------
   Die Kinder tippen im Spiel auf verdaechtige Stellen im Bild. Hier ziehst du
   diese Stellen direkt mit der Maus auf, statt Prozentzahlen zu tippen.
   =========================================================================== */

import { data, edit, imageUrl } from './store.js';
import { el, clear, field, button, card, toast } from './ui.js';

let selectedPost = null;
let selectedZone = 0;

export function renderHotspots(root) {
  clear(root);
  const d = data();

  root.append(el('div', 'page-head', [
    el('h2', null, 'Bildzonen'),
    el('p', null,
      'Ziehe mit der Maus ein Rechteck über die Stelle, die das Kind finden soll. ' +
      'Jede Zone braucht einen Text, der erklärt, warum genau diese Stelle verräterisch ist.'),
  ]));

  if (!selectedPost || !d.posts.some(p => p.id === selectedPost)) {
    selectedPost = d.posts[0]?.id || null;
  }

  const wrap = el('div', 'split');
  const list = el('div', 'list');
  const pane = el('div');

  const drawList = () => {
    clear(list);
    for (const post of d.posts) {
      const entry = d.hotspots[post.id];
      const count = entry?.inspectionOnly ? 'nur ansehen'
        : entry?.hotspots?.length ? `${entry.hotspots.length} Zone(n)`
        : 'keine Zonen';
      const node = el('button');
      node.type = 'button';
      if (post.id === selectedPost) node.classList.add('on');
      node.append(
        el('span', 'id', post.id),
        el('span', 'name', post.username || '—'),
        el('span', 'meta', [el('span', 'chip', count)]),
      );
      node.addEventListener('click', () => {
        selectedPost = post.id;
        selectedZone = 0;
        drawList();
        drawPane();
      });
      list.append(node);
    }
  };

  const drawPane = () => {
    clear(pane);
    pane.append(zoneEditor(selectedPost, drawList));
  };

  drawList();
  drawPane();
  wrap.append(list, pane);
  root.append(wrap);
}

function zoneEditor(postId, refreshList) {
  const d = data();
  const post = d.posts.find(p => p.id === postId);
  const wrap = el('div');

  let entry = d.hotspots[postId];

  /* --- Noch nichts hinterlegt --- */
  if (!entry) {
    return card('Für diesen Beitrag gibt es noch keine Bildanalyse',
      'Du kannst Zonen anlegen, die gefunden werden müssen — oder das Bild nur ' +
      'zum Anschauen freigeben, wenn der Fall über Quelle und Profil läuft.',
      [
        button('Zonen anlegen', 'btn dark', () => {
          edit(() => { d.hotspots[postId] = { errorCount: 0, hotspots: [] }; });
          refreshList();
          rerender();
        }),
        button('Nur zum Anschauen', 'btn', () => {
          edit(() => { d.hotspots[postId] = { inspectionOnly: true }; });
          refreshList();
          rerender();
        }),
      ]);
  }

  if (entry.inspectionOnly) {
    return card('Bild nur zum Anschauen',
      'Die Kinder können hineinzoomen, aber es gibt nichts zu finden. Passend, ' +
      'wenn der Fall über die anderen Werkzeuge gelöst wird.',
      [button('Doch Zonen anlegen', 'btn', () => {
        edit(() => { d.hotspots[postId] = { errorCount: 0, hotspots: [] }; });
        refreshList();
        rerender();
      })]);
  }

  /* --- Bildfläche --- */
  const stage = el('div', 'stage');
  const image = el('img');
  image.src = imageUrl(post?.media);
  image.alt = '';
  image.draggable = false;
  stage.append(image);

  const drawZones = () => {
    for (const old of stage.querySelectorAll('.zone')) old.remove();
    (entry.hotspots || []).forEach((zone, index) => {
      const node = el('div', index === selectedZone ? 'zone sel' : 'zone');
      node.style.left = `${zone.x}%`;
      node.style.top = `${zone.y}%`;
      node.style.width = `${zone.w}%`;
      node.style.height = `${zone.h}%`;
      node.append(el('b', null, String(index + 1)));
      stage.append(node);
    });
  };

  /* Aufziehen einer neuen Zone */
  let start = null;
  let ghost = null;

  const relative = event => {
    const box = stage.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100)),
    };
  };

  stage.addEventListener('pointerdown', event => {
    start = relative(event);
    ghost = el('div', 'zone sel');
    stage.append(ghost);
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener('pointermove', event => {
    if (!start || !ghost) return;
    const now = relative(event);
    ghost.style.left = `${Math.min(start.x, now.x)}%`;
    ghost.style.top = `${Math.min(start.y, now.y)}%`;
    ghost.style.width = `${Math.abs(now.x - start.x)}%`;
    ghost.style.height = `${Math.abs(now.y - start.y)}%`;
  });

  stage.addEventListener('pointerup', event => {
    if (!start) return;
    const now = relative(event);
    const zone = {
      x: Math.round(Math.min(start.x, now.x)),
      y: Math.round(Math.min(start.y, now.y)),
      w: Math.round(Math.abs(now.x - start.x)),
      h: Math.round(Math.abs(now.y - start.y)),
    };
    ghost?.remove();
    ghost = null;
    start = null;

    if (zone.w < 3 || zone.h < 3) { drawZones(); return; }   // versehentlicher Klick

    edit(() => {
      entry.hotspots = entry.hotspots || [];
      entry.hotspots.push({ ...zone, hint: '' });
      entry.errorCount = entry.hotspots.length;
    });
    selectedZone = entry.hotspots.length - 1;
    refreshList();
    rerender();
    toast('Zone angelegt — jetzt den Hinweistext schreiben');
  });

  drawZones();

  /* --- Liste der Zonen --- */
  const zoneList = el('div');
  const drawZoneList = () => {
    clear(zoneList);
    if (!entry.hotspots?.length) {
      zoneList.append(el('p', 'hint', 'Noch keine Zone. Zieh oben ein Rechteck über die verräterische Stelle.'));
      return;
    }
    entry.hotspots.forEach((zone, index) => {
      const item = el('div', 'item');
      if (index === selectedZone) item.style.borderColor = 'var(--spur)';

      item.append(el('div', 'item-top', [
        el('span', 'n', `Zone ${index + 1}`),
        button('Auswählen', 'btn small', () => { selectedZone = index; drawZones(); drawZoneList(); }),
        button('Löschen', 'btn small danger', () => {
          edit(() => {
            entry.hotspots.splice(index, 1);
            entry.errorCount = entry.hotspots.length;
          });
          selectedZone = 0;
          refreshList();
          rerender();
        }),
      ]));

      const numbers = el('div', 'grid2');
      for (const [key, label] of [['x', 'Links %'], ['y', 'Oben %'], ['w', 'Breite %'], ['h', 'Höhe %']]) {
        const box = field(label, zone, key, { type: 'number' });
        box.querySelector('input').addEventListener('input', () => {
          requestAnimationFrame(drawZones);
        });
        numbers.append(box);
      }
      item.append(numbers);
      item.append(field('Hinweis beim Treffer', zone, 'hint', { multiline: true, rows: 3 }));
      zoneList.append(item);
    });
  };
  drawZoneList();

  wrap.append(card('Bild', 'Rechteck aufziehen legt eine neue Zone an.', [stage]));
  wrap.append(card('Zonen', null, [
    zoneList,
    el('div', 'row', [
      button('Alle Zonen entfernen', 'btn small danger', () => {
        edit(() => { entry.hotspots = []; entry.errorCount = 0; });
        refreshList();
        rerender();
      }),
      button('Auf „nur ansehen" umstellen', 'btn small', () => {
        edit(() => { d.hotspots[postId] = { inspectionOnly: true }; });
        refreshList();
        rerender();
      }),
    ]),
  ]));

  function rerender() {
    const root = wrap.closest('.work');
    if (root) renderHotspots(root);
  }

  return wrap;
}
