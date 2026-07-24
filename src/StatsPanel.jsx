import { useMemo, useState } from 'react';
import {
  loadCaseLog,
  clearCaseLog,
  buildStats,
  TRUTH_LABELS,
} from './stats.js';

/**
 * Auswertung der bisher geprüften Feeds.
 * Optional aufrufbar (z. B. aus dem Agentur-Tab), zeigt nur, was schon gespielt wurde.
 *
 * Props:
 *   lang    – 'de' | 'en'
 *   onClose – optional, blendet einen Zurück-Button ein
 */
export default function StatsPanel({ lang = 'de', onClose }) {
  const [entries, setEntries] = useState(() => loadCaseLog());
  const [askDelete, setAskDelete] = useState(false);
  const stats = useMemo(() => buildStats(entries), [entries]);

  const t = (de, en) => (lang === 'en' ? en : de);

  if (stats.total === 0) {
    return (
      <section className="stats-panel">
        <h2 className="stats-title">{t('Deine Auswertung', 'Your results')}</h2>
        <p className="stats-empty">
          {t(
            'Prüfe einen Feed, dann erscheint hier deine Auswertung.',
            'Check a feed and your results will appear here.'
          )}
        </p>
        {onClose && (
          <button type="button" className="stats-back" onClick={onClose}>
            {t('Zurück', 'Back')}
          </button>
        )}
      </section>
    );
  }

  const tendencyText = {
    early: t(
      'Prüfe noch ein paar Feeds — dann wird deine Tendenz sichtbar.',
      'Check a few more feeds and your tendency will show up.'
    ),
    balanced: t(
      'Du bist gut in der Mitte: du glaubst nicht alles, hältst aber auch nicht alles für gefälscht.',
      'You are nicely balanced: not too trusting, not too suspicious.'
    ),
    suspicious: t(
      `Du bist eher misstrauisch: ${stats.tooSuspicious} echte Beiträge hast du für manipuliert oder irreführend gehalten. Echt sein darf auch etwas.`,
      `You lean suspicious: you judged ${stats.tooSuspicious} real posts as manipulated or misleading.`
    ),
    trusting: t(
      `Du vertraust schnell: ${stats.tooTrusting} manipulierte oder irreführende Beiträge hast du für echt gehalten. Schau öfter in die Werkzeuge.`,
      `You trust quickly: you judged ${stats.tooTrusting} manipulated or misleading posts as real.`
    ),
  }[stats.tendency];

  return (
    <section className="stats-panel">
      <h2 className="stats-title">{t('Deine Auswertung', 'Your results')}</h2>
      <p className="stats-sub">
        {t(
          `${stats.total} geprüfte Feeds — nur auf diesem Gerät gespeichert.`,
          `${stats.total} feeds checked — stored on this device only.`
        )}
      </p>

      {/* Urteile */}
      <article className="stats-card">
        <h3 className="stats-card-title">{t('Deine Urteile', 'Your verdicts')}</h3>
        <SplitBar
          rightLabel={t('richtig', 'correct')}
          wrongLabel={t('falsch gelesen', 'misread')}
          right={stats.verdictRight}
          wrong={stats.verdictWrong}
        />
      </article>

      {/* Begründungen */}
      <article className="stats-card">
        <h3 className="stats-card-title">{t('Deine Begründungen', 'Your reasons')}</h3>
        <SplitBar
          rightLabel={t('getroffen', 'on point')}
          wrongLabel={t('daneben', 'off')}
          right={stats.reasonRight}
          wrong={stats.reasonWrong}
        />
      </article>

      {/* Tendenz */}
      <article className="stats-card">
        <h3 className="stats-card-title">{t('Deine Tendenz', 'Your tendency')}</h3>
        <p className="stats-tendency">{tendencyText}</p>
        <ul className="stats-rows">
          {Object.entries(stats.byTruth).map(([key, row]) =>
            row.total === 0 ? null : (
              <li key={key} className="stats-row">
                <span className="stats-row-label">{TRUTH_LABELS[key][lang] ?? TRUTH_LABELS[key].de}</span>
                <MiniBar right={row.right} total={row.total} />
                <span className="stats-row-count">
                  {t(`${row.right} von ${row.total}`, `${row.right} of ${row.total}`)}
                </span>
              </li>
            )
          )}
        </ul>
      </article>

      {/* Sicherheit */}
      <article className="stats-card">
        <h3 className="stats-card-title">
          {t('Wie sicher warst du?', 'How sure were you?')}
        </h3>
        <ul className="stats-rows">
          {stats.byConfidence.map((level) =>
            level.total === 0 ? null : (
              <li key={level.value} className="stats-row">
                <span className="stats-row-label">{level[lang] ?? level.de}</span>
                <MiniBar right={level.right} total={level.total} />
                <span className="stats-row-count">
                  {t(`${level.right} von ${level.total} richtig`, `${level.right} of ${level.total} correct`)}
                </span>
              </li>
            )
          )}
        </ul>
        <p className="stats-note">
          {t(
            'Sicher sein heißt nicht richtig liegen — vergleiche die Zeilen.',
            'Being sure is not the same as being right — compare the rows.'
          )}
        </p>
      </article>

      {/* Werkzeuge */}
      {stats.withTools.total > 0 && stats.withoutTools.total > 0 && (
        <article className="stats-card">
          <h3 className="stats-card-title">{t('Mit und ohne Werkzeuge', 'With and without tools')}</h3>
          <ul className="stats-rows">
            <li className="stats-row">
              <span className="stats-row-label">{t('Nachgeprüft', 'Checked')}</span>
              <MiniBar right={stats.withTools.right} total={stats.withTools.total} />
              <span className="stats-row-count">
                {t(`${stats.withTools.right} von ${stats.withTools.total}`, `${stats.withTools.right} of ${stats.withTools.total}`)}
              </span>
            </li>
            <li className="stats-row">
              <span className="stats-row-label">{t('Aus dem Bauch', 'Gut feeling')}</span>
              <MiniBar right={stats.withoutTools.right} total={stats.withoutTools.total} />
              <span className="stats-row-count">
                {t(`${stats.withoutTools.right} von ${stats.withoutTools.total}`, `${stats.withoutTools.right} of ${stats.withoutTools.total}`)}
              </span>
            </li>
          </ul>
        </article>
      )}

      {/* Löschen */}
      <div className="stats-actions">
        {!askDelete ? (
          <button type="button" className="stats-delete" onClick={() => setAskDelete(true)}>
            {t('Auswertung löschen', 'Delete results')}
          </button>
        ) : (
          <div className="stats-confirm">
            <p className="stats-confirm-text">
              {t(
                'Alle Ergebnisse auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen.',
                'Delete all results on this device? This cannot be undone.'
              )}
            </p>
            <div className="stats-confirm-buttons">
              <button
                type="button"
                className="stats-delete"
                onClick={() => {
                  setEntries(clearCaseLog());
                  setAskDelete(false);
                }}
              >
                {t('Ja, löschen', 'Yes, delete')}
              </button>
              <button type="button" className="stats-back" onClick={() => setAskDelete(false)}>
                {t('Abbrechen', 'Cancel')}
              </button>
            </div>
          </div>
        )}
        {onClose && (
          <button type="button" className="stats-back" onClick={onClose}>
            {t('Zurück', 'Back')}
          </button>
        )}
      </div>
    </section>
  );
}

function SplitBar({ right, wrong, rightLabel, wrongLabel }) {
  const total = right + wrong || 1;
  return (
    <div className="stats-split">
      <div className="stats-split-track">
        <div className="stats-split-right" style={{ flexGrow: right || 0.001 }} />
        <div className="stats-split-wrong" style={{ flexGrow: wrong || 0.001 }} />
      </div>
      <div className="stats-split-legend">
        <span><i className="dot dot-right" />{right} {rightLabel}</span>
        <span><i className="dot dot-wrong" />{wrong} {wrongLabel}</span>
      </div>
      <span className="sr-only">{`${right}/${total}`}</span>
    </div>
  );
}

function MiniBar({ right, total }) {
  const pct = total ? Math.round((right / total) * 100) : 0;
  return (
    <span className="stats-mini" role="img" aria-label={`${right}/${total}`}>
      <span className="stats-mini-fill" style={{ width: `${pct}%` }} />
    </span>
  );
}
