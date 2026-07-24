import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  LockKeyhole,
  UserRound,
} from 'lucide-react';

import { useState } from 'react';

function Hint({
  mode,
  revealed,
  onUse,
  buttonLabel,
  data,
  t = (x) => x,
}) {
  const hintTitle =
    data?.hintTitle ||
    t('tip');

  const hintQuestion =
    data?.hintQuestion ||
    t('srcTipQ');

  const hintImportanceTitle =
    data?.hintImportanceTitle ||
    t('whyImportant');

  const hintText =
    data?.hintText ||
    t('srcTipWhy');

  const collapseLabel =
    data?.collapseLabel ||
    t('collapseTip');

  if (!revealed) {
    return (
      <button
        type="button"
        className="analysis-tip-toggle"
        disabled={mode === 'empty'}
        onClick={onUse}
        aria-label={hintTitle}
        title={data?.hintButtonLabel || buttonLabel}
      >
        <HelpCircle size={18} />
      </button>
    );
  }

  return (
    <div className="analysis-tip">
      <strong>
        <HelpCircle size={16} />
        {hintTitle}
      </strong>

      {hintQuestion && <p>{hintQuestion}</p>}

      {hintImportanceTitle && (
        <b>{hintImportanceTitle}</b>
      )}

      {hintText && <p>{hintText}</p>}

      <button
        type="button"
        className="analysis-tip-collapse"
        onClick={onUse}
      >
        {collapseLabel}
      </button>
    </div>
  );
}

export default function SourceCheckPanel({
  data,
  hintMode = 'free',
  hintRevealed = false,
  onUseHint,
  hintButtonLabel = 'Tipp anzeigen',
  t = (x) => x,
}) {
  const [pageOpen, setPageOpen] = useState(false);

  const sourceData = data || {};
  const available = sourceData.available !== false;

  const unavailableTitle =
    sourceData.unavailableTitle ||
    t('srcNoneTitle') ||
    'Quellenprüfung nicht verfügbar';

  const unavailableMessage =
    sourceData.unavailableMessage ||
    t('srcNoneBody') ||
    'Für diesen Beitrag ist keine überprüfbare Quelle verfügbar.';

  if (!available) {
    return (
      <div className="source-unavailable">
        <AlertTriangle size={18} />

        <div>
          <strong>{unavailableTitle}</strong>

          <p>{unavailableMessage}</p>

          {sourceData.hintAvailable !== false && (
            <Hint
              mode={hintMode}
              revealed={hintRevealed}
              onUse={onUseHint}
              buttonLabel={hintButtonLabel}
              data={sourceData}
              t={t}
            />
          )}
        </div>
      </div>
    );
  }

  const tone =
    ['warning', 'mixed'].includes(sourceData.status)
      ? 'warning'
      : sourceData.status === 'ad'
        ? 'ad'
        : 'good';

  const domain =
    sourceData.domain ||
    t('notProvided');

  const title =
    sourceData.title ||
    t('notProvided');

  const url =
    sourceData.url ||
    '';

  const pageType =
    sourceData.pageType ||
    t('srcPostType');

  const articleHeadline =
    sourceData.articleHeadline ||
    title;

  const keyFacts =
    Array.isArray(sourceData.keyFacts)
      ? sourceData.keyFacts
      : [];

  const author =
    sourceData.author ||
    '';

  const published =
    sourceData.published ||
    t('notProvided');

  const sourceEyebrow =
    sourceData.eyebrow ||
    t('srcEyebrow');

  const previewLabel =
    sourceData.previewLabel ||
    t('srcPreview');

  const lessLabel =
    sourceData.lessLabel ||
    t('srcLess');

  const responsibleLabel =
    sourceData.authorLabel ||
    t('srcResponsible');

  const publishedLabel =
    sourceData.publishedLabel ||
    t('srcPublished');

  return (
    <div className={`source-browser ${tone}`}>
      <div className="source-browser-bar">
        <button
          type="button"
          aria-label={
            sourceData.backLabel ||
            t('backWord')
          }
        >
          ‹
        </button>

        <div>
          <LockKeyhole size={13} />
          <span>{domain}</span>
        </div>
      </div>

      <div className="source-browser-body">
        <div className="source-page-title">
          <ExternalLink size={19} />

          <div>
            {sourceEyebrow && (
              <small>{sourceEyebrow}</small>
            )}

            <strong>{title}</strong>

            {url && <span>{url}</span>}
          </div>
        </div>

        <button
          type="button"
          className="source-open-page"
          onClick={() => setPageOpen((value) => !value)}
        >
          <ChevronDown size={17} />

          {pageOpen
            ? lessLabel
            : previewLabel}
        </button>

        {pageOpen && (
          <article className="linked-page-preview">
            {pageType && (
              <span className="linked-page-kicker">
                {pageType}
              </span>
            )}

            {articleHeadline && (
              <h3>{articleHeadline}</h3>
            )}

            {keyFacts
              .slice(0, sourceData.maxFacts ?? 3)
              .map((fact, index) => (
                <p key={index}>
                  • {fact}
                </p>
              ))}
          </article>
        )}

        <div className="source-facts compact">
          {author && (
            <div>
              <UserRound size={17} />
              <span>{responsibleLabel}</span>
              <strong>{author}</strong>
            </div>
          )}

          <div>
            <CalendarDays size={17} />
            <span>{publishedLabel}</span>
            <strong>{published}</strong>
          </div>
        </div>

        {sourceData.hintAvailable !== false && (
          <Hint
            mode={hintMode}
            revealed={hintRevealed}
            onUse={onUseHint}
            buttonLabel={hintButtonLabel}
            data={sourceData}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
