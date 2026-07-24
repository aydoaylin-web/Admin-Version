import {
  BadgeCheck,
  CalendarDays,
  Eye,
  HelpCircle,
  LockKeyhole,
  UserRound,
} from 'lucide-react';

function Hint({
  mode,
  revealed,
  onUse,
  buttonLabel,
  data,
  t = (x) => x,
}) {
  const hintTitle = data?.hintTitle || t('tip');
  const hintQuestion = data?.hintQuestion || t('profTipQ');
  const hintImportanceTitle = data?.hintImportanceTitle || t('whyImportant');
  const hintText1 = data?.hintText1 || t('demo3Body1');
  const hintText2 = data?.hintText2 || t('demo3Body2');
  const collapseLabel = data?.collapseLabel || t('collapseTip');

  if (!revealed) {
    return (
      <button
        type="button"
        className="analysis-tip-toggle"
        disabled={mode === 'empty'}
        onClick={onUse}
        aria-label={hintTitle}
        title={buttonLabel}
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

      <p>{hintQuestion}</p>

      <b>{hintImportanceTitle}</b>

      {hintText1 && <p>{hintText1}</p>}
      {hintText2 && <p>{hintText2}</p>}

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

export default function ProfileCheckPanel({
  profile,
  hintMode = 'free',
  hintRevealed = false,
  onUseHint,
  hintButtonLabel = 'Tipp anzeigen',
  t = (x) => x,
}) {
  const data = profile?.profileCheck || {};

  const available = data.available !== false;

  const title = data.title || t('tool_profile');

  const unavailableTitle =
    data.unavailableTitle ||
    t('profUnavailableTitle') ||
    'Profilprüfung nicht verfügbar';

  const unavailableMessage =
    data.unavailableMessage ||
    t('profUnavailableMessage') ||
    'Die Profilprüfung steht für diesen Beitrag nicht zur Verfügung.';

  if (!available) {
    return (
      <div className="profile-check-panel profile-check-unavailable">
        <div className="analysis-unavailable">
          <LockKeyhole size={24} />

          <div>
            <strong>{unavailableTitle}</strong>
            <p>{unavailableMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  const inaccessible =
    data.visibility === 'Profil nicht erreichbar' ||
    data.inaccessible === true;

  const displayName =
    data.displayName ||
    profile?.displayName ||
    profile?.username ||
    '?';

  const username =
    data.username ||
    profile?.username ||
    '';

  const avatarText =
    data.avatarText ||
    String(displayName).slice(0, 1).toUpperCase();

  const verified =
    data.verified ??
    profile?.verified ??
    false;

  const bio =
    data.bio ??
    profile?.bio ??
    '';

  const posts =
    data.posts ??
    '–';

  const followers =
    data.followers ??
    profile?.followers ??
    '–';

  const following =
    data.following ??
    profile?.following ??
    '–';

  const accountType =
    data.accountType ||
    t('notProvided');

  const created =
    data.created ||
    t('notVisible');

  const visibility =
    data.visibility ||
    t('notVisible');

  const verification =
    data.verification ||
    t('notVisible');

  return (
    <div className="profile-check-panel">
      {title && (
        <div className="analysis-panel-title">
          <UserRound size={18} />
          <strong>{title}</strong>
        </div>
      )}

      <div className="profile-check-head">
        <div className="profile-check-avatar">
          {avatarText}
        </div>

        <div>
          <strong>{displayName}</strong>

          {username && (
            <span>@{username}</span>
          )}
        </div>

        {verified && <BadgeCheck size={20} />}
      </div>

      {inaccessible ? (
        <div className="profile-locked">
          <LockKeyhole size={22} />

          <div>
            <strong>
              {data.lockedTitle || t('profUnreachable')}
            </strong>

            <p>
              {data.lockedMessage || t('profPartial')}
            </p>
          </div>
        </div>
      ) : (
        bio && (
          <p className="profile-check-bio">
            {bio}
          </p>
        )
      )}

      <div className="profile-check-stats">
        <div>
          <strong>{posts}</strong>
          <span>{data.postsLabel || t('profPosts')}</span>
        </div>

        <div>
          <strong>{followers}</strong>
          <span>{data.followersLabel || t('profFollowers')}</span>
        </div>

        <div>
          <strong>{following}</strong>
          <span>{data.followingLabel || t('profFollowing')}</span>
        </div>
      </div>

      <div className="profile-check-details profile-check-details-visible">
        <div>
          <UserRound size={17} />
          <span>{data.accountTypeLabel || t('profType')}</span>
          <strong>{accountType}</strong>
        </div>

        <div>
          <CalendarDays size={17} />
          <span>{data.createdLabel || t('profCreated')}</span>
          <strong>{created}</strong>
        </div>

        <div>
          <Eye size={17} />
          <span>{data.visibilityLabel || t('profVisibility')}</span>
          <strong>{visibility}</strong>
        </div>

        <div>
          <BadgeCheck size={17} />
          <span>{data.verificationLabel || t('profVerification')}</span>
          <strong>{verification}</strong>
        </div>
      </div>

      {data.hintAvailable !== false && (
        <Hint
          mode={hintMode}
          revealed={hintRevealed}
          onUse={onUseHint}
          buttonLabel={
            data.hintButtonLabel ||
            hintButtonLabel
          }
          data={data}
          t={t}
        />
      )}
    </div>
  );
}
