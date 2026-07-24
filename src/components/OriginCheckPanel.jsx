import { Search, Clock, HelpCircle } from 'lucide-react';

function Hint({ mode, revealed, onUse, buttonLabel, t = (x) => x }) {
  if (!revealed) return <button type="button" className="analysis-tip-toggle" disabled={mode==='empty'} onClick={onUse} aria-label={t('tip')} title={buttonLabel}><HelpCircle size={18}/></button>;
  return <div className="analysis-tip"><strong><HelpCircle size={16}/> {t('tip')}</strong><p>{t('lensTipQ')}</p><b>{t('whyImportant')}</b><p>{t('lensTipWhy1')}</p><p>{t('lensTipWhy2')}</p><button type="button" className="analysis-tip-collapse" onClick={onUse}>{t('collapseTip')}</button></div>;
}

export default function OriginCheckPanel({ data, hintMode = 'free', hintRevealed = false, onUseHint, hintButtonLabel = 'Tipp anzeigen', t = (x) => x }) {
  const hits = (data && Array.isArray(data.hits)) ? data.hits : [];
  return <div className="origin-check">
    <div className="origin-search-bar"><Search size={16}/><span>{t('originEyebrow')}</span></div>
    <p className="origin-intro">{t('originIntro')}</p>
    {hits.length ? (
      <div className="origin-hits">
        <small className="origin-hits-label">{t('originHitsLabel')}</small>
        {hits.map((hit, i) => (
          <div className="origin-hit" key={i}>
            <Clock size={15}/>
            <div><b>{hit.date}</b><span>{hit.title}</span><small>{hit.source}</small></div>
          </div>
        ))}
      </div>
    ) : (
      <div className="origin-empty"><Search size={18}/><div><strong>{t('originNoneTitle')}</strong><p>{t('originNoneBody')}</p></div></div>
    )}
    <Hint mode={hintMode} revealed={hintRevealed} onUse={onUseHint} buttonLabel={hintButtonLabel} t={t}/>
  </div>;
}
