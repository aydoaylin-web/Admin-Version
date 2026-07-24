import { BadgeCheck, CalendarDays, Eye, HelpCircle, LockKeyhole, UserRound } from 'lucide-react';

function Hint({ mode, revealed, onUse, buttonLabel, t = (x) => x }) {
  if (!revealed) return <button type="button" className="analysis-tip-toggle" disabled={mode==='empty'} onClick={onUse} aria-label={t('tip')} title={buttonLabel}><HelpCircle size={18}/></button>;
  return <div className="analysis-tip"><strong><HelpCircle size={16}/> {t('tip')}</strong><p>{t('profTipQ')}</p><b>{t('whyImportant')}</b><p>{t('demo3Body1')}</p><p>{t('demo3Body2')}</p><button type="button" className="analysis-tip-collapse" onClick={onUse}>{t('collapseTip')}</button></div>;
}

export default function ProfileCheckPanel({ profile, hintMode = 'free', hintRevealed = false, onUseHint, hintButtonLabel = 'Tipp anzeigen', t = (x) => x }) {
  const d=profile?.profileCheck;
  if(!d) return <div className="profile-check-panel"><p>{t('profNone')}</p><Hint mode={hintMode} revealed={hintRevealed} onUse={onUseHint} buttonLabel={hintButtonLabel} t={t}/></div>;
  const inaccessible=d.visibility==='Profil nicht erreichbar';
  return <div className="profile-check-panel">
    <div className="profile-check-head"><div className="profile-check-avatar">{String(profile.displayName||profile.username||'?').slice(0,1).toUpperCase()}</div><div><strong>{profile.displayName}</strong><span>@{profile.username}</span></div>{profile.verified&&<BadgeCheck size={20}/>}</div>
    {inaccessible?<div className="profile-locked"><LockKeyhole size={22}/><div><strong>{t('profUnreachable')}</strong><p>{t('profPartial')}</p></div></div>:<p className="profile-check-bio">{d.bio||profile.bio}</p>}
    <div className="profile-check-stats"><div><strong>{d.posts??'–'}</strong><span>{t('profPosts')}</span></div><div><strong>{d.followers??profile.followers??'–'}</strong><span>{t('profFollowers')}</span></div><div><strong>{profile.following??'–'}</strong><span>{t('profFollowing')}</span></div></div>
    <div className="profile-check-details profile-check-details-visible"><div><UserRound size={17}/><span>{t('profType')}</span><strong>{d.accountType||t('notProvided')}</strong></div><div><CalendarDays size={17}/><span>{t('profCreated')}</span><strong>{d.created||t('notVisible')}</strong></div><div><Eye size={17}/><span>{t('profVisibility')}</span><strong>{d.visibility||t('notVisible')}</strong></div><div><BadgeCheck size={17}/><span>{t('profVerification')}</span><strong>{d.verification||t('notVisible')}</strong></div></div>
    <Hint mode={hintMode} revealed={hintRevealed} onUse={onUseHint} buttonLabel={hintButtonLabel} t={t}/>
  </div>;
}
