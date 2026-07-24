/**
 * Zweisprachige Inhalte auf eine Sprache herunterbrechen.
 *
 * Texte in content/ dürfen entweder ein einfacher String sein
 *   "caption": "Schaut euch das an!"
 * oder ein Sprachobjekt
 *   "caption": { "de": "Schaut euch das an!", "en": "Look at this!" }
 *
 * Fehlt die gewünschte Sprache, wird Deutsch genommen. Ein Feld kann also
 * nach und nach übersetzt werden, ohne dass etwas kaputtgeht.
 *
 * Neue Sprache hinzufügen: in translations.js ergänzen, hier ist nichts zu tun –
 * es reicht, in den Inhaltsdateien einen weiteren Schlüssel zu setzen,
 * z. B. { "de": "...", "en": "...", "fr": "..." }.
 */
const LANG_KEYS = ['de', 'en', 'fr', 'tr', 'ar'];

function isLangObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (!keys.length) return false;
  return keys.every(key => LANG_KEYS.includes(key));
}

export function localizeContent(value, lang = 'de') {
  if (Array.isArray(value)) return value.map(item => localizeContent(item, lang));
  if (isLangObject(value)) return value[lang] ?? value.de ?? value[Object.keys(value)[0]] ?? '';
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, entry] of Object.entries(value)) out[key] = localizeContent(entry, lang);
    return out;
  }
  return value;
}

function joinBase(path) {
  return `${import.meta.env.BASE_URL}${String(path || '').replace(/^\//, '')}`;
}

async function fetchJson(path, label) {
  const response = await fetch(joinBase(path), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${label} could not be loaded (${response.status}).`);
  }
  return response.json();
}

function assertUnique(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (!item?.id) throw new Error(`${label} contains an entry without an id.`);
    if (seen.has(item.id)) throw new Error(`${label} contains duplicate id: ${item.id}`);
    seen.add(item.id);
  }
}

export function validateContentPack(pack) {
  const { posts, tasks, profiles, stories, guides } = pack;
  if (!Array.isArray(posts) || !Array.isArray(tasks)) {
    throw new Error('The content pack must contain posts and tasks arrays.');
  }
  assertUnique(posts, 'posts');
  assertUnique(tasks, 'tasks');
  assertUnique(profiles, 'profiles');
  assertUnique(stories, 'stories');
  assertUnique(guides, 'guides');

  const postIds = new Set(posts.map(item => item.id));
  const taskIds = new Set(tasks.map(item => item.id));
  const profileIds = new Set(profiles.map(item => item.id));

  for (const post of posts) {
    if (!post.username || !post.media) {
      throw new Error(`Post ${post.id} needs username and media.`);
    }
    if (post.taskId && !taskIds.has(post.taskId)) {
      throw new Error(`Post ${post.id} references missing task ${post.taskId}.`);
    }
    if (post.reviewTaskId && !taskIds.has(post.reviewTaskId)) {
      throw new Error(`Post ${post.id} references missing review task ${post.reviewTaskId}.`);
    }
    if (post.profileId && !profileIds.has(post.profileId)) {
      throw new Error(`Post ${post.id} references missing profile ${post.profileId}.`);
    }
  }

  for (const task of tasks) {
    if (!postIds.has(task.postId)) {
      throw new Error(`Task ${task.id} references missing post ${task.postId}.`);
    }
    if (!['news', 'liveCheck', 'perspective', 'realityDefense'].includes(task.type)) {
      throw new Error(`Task ${task.id} has unsupported type ${task.type}.`);
    }
    if (task.followUpTaskId && !taskIds.has(task.followUpTaskId)) {
      throw new Error(`Task ${task.id} references missing follow-up ${task.followUpTaskId}.`);
    }
    if (!Number.isFinite(Number(task.pointsCorrect)) || !Number.isFinite(Number(task.pointsWrong))) {
      throw new Error(`Task ${task.id} needs numeric point values.`);
    }
    if (task.type === 'news' && !['echt', 'manipuliert', 'suspekt'].includes(task.correctVerdict)) {
      throw new Error(`News task ${task.id} needs correctVerdict set to echt, manipuliert or suspekt.`);
    }
  }

  for (const story of stories) {
    if (story.profileId && !profileIds.has(story.profileId)) {
      throw new Error(`Story ${story.id} references missing profile ${story.profileId}.`);
    }
  }

  return true;
}

export async function loadContentPack(contentOverride = null) {
  let override = contentOverride;
  if (!override) {
    try {
      const preview = new URLSearchParams(window.location.search).get('adminPreview');
      if (preview === '1') {
        const saved = localStorage.getItem('dd-react-admin-draft-v1');
        if (saved) override = JSON.parse(saved);
      }
    } catch {
      // Vorschau ist optional. Bei ungueltigem lokalen Entwurf normal laden.
    }
  }

  if (override) {
    const manifest = await fetchJson('content/manifest.json', 'content manifest');
    const pack = {
      manifest,
      settings: override.settings || {},
      profiles: (override.profiles || []).filter(item => item.enabled !== false),
      stories: (override.stories || []).filter(item => item.enabled !== false),
      posts: (override.posts || []).filter(item => item.enabled !== false),
      tasks: (override.tasks || []).filter(item => item.enabled !== false),
      guides: (override.guides || []).filter(item => item.enabled !== false)
    };
    validateContentPack(localizeContent(pack, 'de'));
    return pack;
  }

  const manifest = await fetchJson('content/manifest.json', 'content manifest');
  if (!manifest?.files) throw new Error('The content manifest does not define files.');

  const [settings, profiles, stories, posts, tasks, guides] = await Promise.all([
    fetchJson(manifest.files.settings, 'settings'),
    fetchJson(manifest.files.profiles, 'profiles'),
    fetchJson(manifest.files.stories, 'stories'),
    fetchJson(manifest.files.posts, 'posts'),
    fetchJson(manifest.files.tasks, 'tasks'),
    fetchJson(manifest.files.guides, 'guides')
  ]);

  const pack = {
    manifest,
    settings,
    profiles: profiles.filter(item => item.enabled !== false),
    stories: stories.filter(item => item.enabled !== false),
    posts: posts.filter(item => item.enabled !== false),
    tasks: tasks.filter(item => item.enabled !== false),
    guides: guides.filter(item => item.enabled !== false)
  };

  validateContentPack(localizeContent(pack, 'de'));
  return pack;
}
