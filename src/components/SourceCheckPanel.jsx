import { AlertTriangle, CalendarDays, ChevronDown, ExternalLink, HelpCircle, LockKeyhole, UserRound } from 'lucide-react';
import { useState } from 'react';

function Hint({ mode, revealed, onUse, buttonLabel, t = (x) => x }) {
  if (!revealed) return <button type="button" className="analysis-tip-toggle" disabled={mode==='empty'} onClick={onUse} aria-label={t('tip')} title={buttonLabel}><HelpCircle size={18}/></button>;
  return <div className="analysis-tip"><strong><HelpCircle size={16}/> {t('tip')}</strong><p>{t('srcTipQ')}</p><b>{t('whyImportant')}</b><p>{t('srcTipWhy')}</p><button type="button" className="analysis-tip-collapse" onClick={onUse}>{t('collapseTip')}</button></div>;
}

export default function SourceCheckPanel({ data, hintMode = 'free', hintRevealed = false, onUseHint, hintButtonLabel = 'Tipp anzeigen', t = (x) => x }) {
  const [pageOpen,setPageOpen]=useState(false);
  if (!data?.available) return <div className="source-unavailable"><AlertTriangle size={18}/><div><strong>{t('srcNoneTitle')}</strong><p>{t('srcNoneBody')}</p><Hint mode={hintMode} revealed={hintRevealed} onUse={onUseHint} buttonLabel={hintButtonLabel} t={t}/></div></div>;
  const tone = ['warning','mixed'].includes(data.status) ? 'warning' : data.status === 'ad' ? 'ad' : 'good';
  return <div className={`source-browser ${tone}`}>
    <div className="source-browser-bar"><button aria-label={t('backWord')}>‹</button><div><LockKeyhole size={13}/><span>{data.domain}</span></div></div>
    <div className="source-browser-body">
      <div className="source-page-title"><ExternalLink size={19}/><div><small>{t('srcEyebrow')}</small><strong>{data.title}</strong><span>{data.url}</span></div></div>
      <button type="button" className="source-open-page" onClick={()=>setPageOpen(v=>!v)}><ChevronDown size={17}/>{pageOpen?t('srcLess'):t('srcPreview')}</button>
      {pageOpen&&<article className="linked-page-preview"><span className="linked-page-kicker">{data.pageType||t('srcPostType')}</span><h3>{data.articleHeadline||data.title}</h3>{(data.keyFacts||[]).slice(0,3).map((fact,i)=><p key={i}>• {fact}</p>)}</article>}
      <div className="source-facts compact">{data.author&&<div><UserRound size={17}/><span>{t('srcResponsible')}</span><strong>{data.author}</strong></div>}<div><CalendarDays size={17}/><span>{t('srcPublished')}</span><strong>{data.published||t('notProvided')}</strong></div></div>
      <Hint mode={hintMode} revealed={hintRevealed} onUse={onUseHint} buttonLabel={hintButtonLabel} t={t}/>
    </div>
  </div>;
}
