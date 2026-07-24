import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Crosshair, Eye, HelpCircle, RotateCcw, Search, ZoomIn, ZoomOut } from 'lucide-react';

export default function HotspotImage({ src, alt, config, onFound, helper = false, hintMode = 'free', hintRevealed = false, onUseHint, hintButtonLabel = 'Tipp anzeigen', t = (x) => x }) {
  const hotspots = config?.hotspots || [];
  const inspectionOnly = config?.inspectionOnly || hotspots.length === 0;
  const total = config?.errorCount ?? hotspots.length;
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const [found, setFound] = useState([]);
  const [miss, setMiss] = useState(null);
  const [probe, setProbe] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [checked, setChecked] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [tipLevel, setTipLevel] = useState(0);

  const clampPan = (next, nextZoom = zoom) => {
    const viewport = viewportRef.current;
    if (!viewport || nextZoom <= 1) return { x: 0, y: 0 };
    const maxX = viewport.clientWidth * (nextZoom - 1);
    const maxY = viewport.clientHeight * (nextZoom - 1);
    return { x: Math.min(0, Math.max(-maxX, next.x)), y: Math.min(0, Math.max(-maxY, next.y)) };
  };

  function setZoomAt(nextZoom, clientX, clientY) {
    const z = Math.min(3, Math.max(1, Number(nextZoom.toFixed(2))));
    const viewport = viewportRef.current;
    if (!viewport) return setZoom(z);
    const rect = viewport.getBoundingClientRect();
    const x = clientX == null ? rect.width / 2 : clientX - rect.left;
    const y = clientY == null ? rect.height / 2 : clientY - rect.top;
    const ratio = z / zoom;
    const nextPan = { x: x - (x - pan.x) * ratio, y: y - (y - pan.y) * ratio };
    setZoom(z);
    setPan(clampPan(nextPan, z));
  }

  function inspectPoint(clientX, clientY) {
    if (inspectionOnly || revealed || dragging) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const px = ((clientX - rect.left - pan.x) / zoom / rect.width) * 100;
    const py = ((clientY - rect.top - pan.y) / zoom / rect.height) * 100;
    if (helper) { setProbe({ x: Math.round(px), y: Math.round(py) }); return; }
    const hitIndex = hotspots.findIndex((h, i) => !found.includes(i) && px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h);
    if (hitIndex !== -1) {
      const next = [...found, hitIndex];
      setFound(next); setMiss(null); onFound?.(next.length, total);
    } else {
      const alreadyFound = found.some(i => { const h = hotspots[i]; return px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h; });
      if (!alreadyFound) { setMiss({ x: px, y: py }); setTimeout(() => setMiss(null), 850); }
    }
  }

  function pointerDown(e) {
    if (zoom <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function pointerMove(e) {
    const d = dragRef.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) { d.moved = true; setDragging(true); }
    setPan(clampPan({ x: d.panX + dx, y: d.panY + dy }));
  }
  function pointerUp(e) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d?.moved) inspectPoint(e.clientX, e.clientY);
    setTimeout(() => setDragging(false), 0);
  }
  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); }

  const allFound = !inspectionOnly && found.length >= total;
  const missing = hotspots.map((_, i) => i).filter(i => !found.includes(i));
  const checks = ['Schrift und Logos', 'Hände und Gesichter', 'Licht und Schatten', 'Passt das Bild zur Aussage?'];
  const tips = config?.tips || ['Schau zuerst auf Stellen, die KI oft schwer korrekt darstellt.', 'Zoome in Hände, Gesichter, Schrift und unnatürliche Übergänge hinein.'];
  const toggleCheck = item => setChecked(items => items.includes(item) ? items.filter(x => x !== item) : [...items, item]);
  const showSummary = !inspectionOnly && !helper && (allFound || revealed);

  return <div className="hotspot-wrap">
    <div ref={viewportRef} className={`hotspot-viewport ${zoom > 1 ? 'is-zoomed' : ''} ${dragging ? 'is-dragging' : ''}`}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>{dragRef.current=null;setDragging(false);}}
      onDoubleClick={e=>setZoomAt(zoom >= 2 ? 1 : Math.min(3, zoom + .75), e.clientX, e.clientY)}>
      <div className={`hotspot-stage ${inspectionOnly ? 'inspection-only' : ''}`} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }}>
        <img src={src} alt={alt} draggable={false} />
        {found.map(i => { const h = hotspots[i]; return <span key={`f${i}`} className="hotspot-found" style={{ left:`${h.x}%`, top:`${h.y}%`, width:`${h.w}%`, height:`${h.h}%` }} />; })}
        {revealed && missing.map(i => { const h = hotspots[i]; return <span key={`m${i}`} className="hotspot-missed" style={{ left:`${h.x}%`, top:`${h.y}%`, width:`${h.w}%`, height:`${h.h}%` }} />; })}
        {miss && <span className="hotspot-miss" style={{ left:`${miss.x}%`, top:`${miss.y}%` }} />}
        {helper && probe && <span className="hotspot-probe" style={{ left:`${probe.x}%`, top:`${probe.y}%` }}><Crosshair size={16}/> x:{probe.x} y:{probe.y}</span>}
      </div>
    </div>
    <div className="image-inspection-controls">
      <button type="button" onClick={()=>setZoomAt(zoom-.25)} disabled={zoom<=1}><ZoomOut size={16}/><span>{t('zoomOut')}</span></button>
      <strong>{Math.round(zoom*100)}%</strong>
      <button type="button" onClick={()=>setZoomAt(zoom+.25)} disabled={zoom>=3}><ZoomIn size={16}/><span>{t('zoomIn')}</span></button>
      <button type="button" onClick={resetView} disabled={zoom===1&&pan.x===0&&pan.y===0}><RotateCcw size={16}/><span>{t('resetView')}</span></button>
    </div>
    <p className="zoom-help">{t('zoomHelp')}</p>

    {helper ? <div className="hotspot-status helper"><Crosshair size={16}/> {t('coordHelper')}</div>
    : <>
      {!inspectionOnly && !showSummary && <div className="hotspot-status"><span>{found.length} {t('demoOf')} {total} {t('imgAnomaliesFound')}</span>{miss&&<small className="hotspot-neutral-miss">{t('imgMiss')}</small>}</div>}
      {hintRevealed ? <div className="analysis-tip"><strong><HelpCircle size={16}/> {t('tip')}</strong><p>{t('imgTipQ')}</p><b>{t('whyImportant')}</b><p>{t('imgTipWhy1')}</p><p>{t('imgTipWhy2')}</p><button type="button" className="analysis-tip-collapse" onClick={onUseHint}>{t('collapseTip')}</button></div> : <button type="button" className="analysis-tip-button" disabled={hintMode==='empty'} onClick={onUseHint}><HelpCircle size={16}/>{hintButtonLabel}</button>}
      {!inspectionOnly && showSummary && <div className="hotspot-summary"><strong>{allFound ? <><CheckCircle2 size={17}/> {t('imgAllFound')}</> : <><AlertCircle size={17}/> {t('imgResultTitle')}</>}</strong>{found.length>0&&<div className="hotspot-summary-block ok"><span>{t('imgFoundLabel')}</span><ul>{found.map(i=><li key={i}>{hotspots[i].hint}</li>)}</ul></div>}{revealed&&missing.length>0&&<div className="hotspot-summary-block missed"><span>{t('imgMissedLabel')}</span><ul>{missing.map(i=><li key={i}>{hotspots[i].hint}</li>)}</ul></div>}</div>}
    </>}
  </div>;
}
