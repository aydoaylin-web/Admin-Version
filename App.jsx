import { logCase } from './stats.js';
import StatsPanel from './StatsPanel.jsx';
import HotspotImage from "./components/HotspotImage";
import translations, { LANGUAGES } from "./data/translations";
import IMAGE_HOTSPOTS from "./data/imageHotspots";
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadContentPack } from './content';
import {
  Bell, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Heart, Home,
  Maximize2, MessageCircle, MoreHorizontal, Plus, RefreshCw, Send,
  ShieldCheck, Sparkles, UserRound, X, ZoomIn, ZoomOut, Globe2, ScanSearch, HelpCircle, Info, Search,
  BadgeCheck, ScanLine, TriangleAlert
} from 'lucide-react';
import SourceCheckPanel from "./components/SourceCheckPanel";
import ProfileCheckPanel from "./components/ProfileCheckPanel";
import OriginCheckPanel from "./components/OriginCheckPanel";
import { matchReason } from "./data/conceptMatcher";
const STORAGE_KEY = 'deepfake-defender-react-state-v6';
const TARGET_SCORE = 20;
const MAX_TIPS = 5;
const ANALYSIS_TOOLS = [
  { id: "image", label: "Bildanalyse", icon: ScanSearch },
  { id: "source", label: "Quellenprüfung", icon: Globe2 },
  { id: "profile", label: "Profilprüfung", icon: UserRound },
  { id: "origin", label: "Bildherkunft", icon: Search },
];
const TASK_META = {
  news: { label: "Newskarte", notificationTitle: "Neuer gemeldeter Beitrag", notificationText: "Ein möglicherweise manipulierter Beitrag wurde zur Prüfung gemeldet." },
  liveCheck: { label: "Live-Check", notificationTitle: "Dringende Live-Prüfung", notificationText: "Ein viraler Beitrag muss schnell untersucht werden." },
  perspective: { label: "Perspektivwechsel", notificationTitle: "Wirkungsanalyse erforderlich", notificationText: "Untersuche die mögliche Absicht hinter dem Beitrag." },
  realityDefense: { label: "Reality Defense", notificationTitle: "Schutzstrategie erforderlich", notificationText: "Entwickle eine Regel zum Schutz vor ähnlichen Fällen." },
};
function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } }
function shuffle(items) { const copy = [...items]; for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
function imagePath(path) { return `${import.meta.env.BASE_URL}${String(path || "").replace(/^\//, "")}`; }
function playNotificationSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime); gain.gain.setValueAtTime(0.15, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4); osc.start(); osc.stop(ctx.currentTime + 0.4); } catch { /* Audio nicht verfügbar */ } }

function createUuid() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    "id-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2)
  );
}


export default function App() {
  const saved = loadState();
  const irisAudioRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const [irisListening, setIrisListening] = useState(false);
  const [irisSpeaking, setIrisSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const feedHelpAudioRef = useRef(null);
  const feedHelpRecognitionRef = useRef(null);
  const [feedHelpListening, setFeedHelpListening] = useState(false);
  const [feedHelpSpeaking, setFeedHelpSpeaking] = useState(false);
  const [feedHelpError, setFeedHelpError] = useState("");
  const [posts,setPosts]=useState([]); const [tasks,setTasks]=useState([]); const [profiles,setProfiles]=useState([]); const [dataStories,setDataStories]=useState([]); const [guides,setGuides]=useState([]); const [contentSettings,setContentSettings]=useState({}); const [contentManifest,setContentManifest]=useState(null); const [loading,setLoading]=useState(true); const [loadingError,setLoadingError]=useState('');
  const [lang, setLang] = useState(saved.lang || 'de');
  const t = (key) => (translations[lang]?.[key]) ?? translations.de[key] ?? key;
  const [activeTab,setActiveTab]=useState('feed'); const [feedMode,setFeedMode]=useState('forYou'); const [visibleCount,setVisibleCount]=useState(5);
  const [activeTask,setActiveTask]=useState(null); const [activePost,setActivePost]=useState(null); const [selectedAnswers,setSelectedAnswers]=useState([]); const [reason,setReason]=useState(''); const [feedback,setFeedback]=useState(null);
  const [taskPhase,setTaskPhase]=useState('inspect'); const [usedTools,setUsedTools]=useState([]); const [openTool,setOpenTool]=useState(null); const [verdict,setVerdict]=useState(''); const [taskOrigin,setTaskOrigin]=useState('push');
  const [score,setScore]=useState(saved.score??0); const [completed,setCompleted]=useState(saved.completed||[]); const [caseResults,setCaseResults]=useState(saved.caseResults||[]); const [agencyRules,setAgencyRules]=useState(saved.agencyRules||[]);
  const [liked,setLiked]=useState(saved.liked||[]); const [savedPosts,setSavedPosts]=useState(saved.savedPosts||[]); const [commentLikes,setCommentLikes]=useState(saved.commentLikes||[]); const [customComments,setCustomComments]=useState(saved.customComments||{});
  const [seconds,setSeconds]=useState(180);
  const [intro,setIntro]=useState(saved.introSeen!==true);
  const [demoStep,setDemoStep]=useState(-1);
  const [showHintNote, setShowHintNote] = useState(false);
  const [showResume,setShowResume]=useState(saved.introSeen===true && (((saved.completed?.length)||0)>0 || (saved.score??0)!==0 || ((saved.caseResults?.length)||0)>0));
  const [simulationConfirmed,setSimulationConfirmed]=useState(false);
  const [selectedPost,setSelectedPost]=useState(null);
  const [commentsPost,setCommentsPost]=useState(null);  const [activeNotification,setActiveNotification]=useState(null); const [notifiedTasks,setNotifiedTasks]=useState([]); const [notificationHistory,setNotificationHistory]=useState(saved.notificationHistory||[]); const [unreadNotificationCount,setUnreadNotificationCount]=useState(saved.unreadNotificationCount||0); const [confidence,setConfidence]=useState(3); const [evaluating,setEvaluating]=useState(false);
  const [researchEvents,setResearchEvents]=useState(saved.researchEvents||[]); const [sessionId]=useState(saved.sessionId||createUuid()); const [participantCode,setParticipantCode]=useState(saved.participantCode||`P-${createUuid().slice(0,6).toUpperCase()}`); const [aiStatus,setAiStatus]=useState({api:'checking',ollama:false});
  const [zoom,setZoom]=useState(1); const [heartBurst,setHeartBurst]=useState(null); const [storyPulse,setStoryPulse]=useState(0); const [commentDraft,setCommentDraft]=useState('');
  const [runOrder,setRunOrder]=useState(saved.runOrder||[]); const [runId,setRunId]=useState(saved.runId||createUuid()); const [runSummary,setRunSummary]=useState(null); const [tipsRemaining,setTipsRemaining]=useState(saved.tipsRemaining??MAX_TIPS); const [revealedHints,setRevealedHints]=useState([]);
  const notificationTimeout=useRef(null); const loaderRef=useRef(null); const taskStartedAt=useRef(null);

  const taskMap=useMemo(()=>Object.fromEntries(tasks.map(t=>[t.id,t])),[tasks]);
  const feedPosts=useMemo(()=>feedMode==='following'?posts.filter((_,i)=>i%2===0):posts,[posts,feedMode]);
  const visiblePosts=feedPosts.slice(0,visibleCount);
  const nextMissionId=useMemo(()=>runOrder.find(id=>!completed.includes(id))||null,[runOrder,completed]);
  const totalMissionCount=tasks.length;
  const progressPercent=totalMissionCount?Math.min(100,Math.round((completed.length/totalMissionCount)*100)):0;
  const profileMap=useMemo(()=>Object.fromEntries(profiles.map(profile=>[profile.id,profile])),[profiles]);
  const stories=useMemo(()=>[...dataStories].sort((a,b)=>(a.priority??99)-(b.priority??99)).map((story,index)=>{const profile=profileMap[story.profileId]||{};return {name:story.label||profile.displayName||profile.username||'Story',letter:index===0?<Plus size={20}/>:String(profile.displayName||profile.username||'?').slice(0,2).toUpperCase(),className:profile.accent||'blue',status:story.status||'new'};}),[dataStories,profileMap]);
  const taskMeta=contentSettings.taskTypes||TASK_META;
  const targetScore=Number(contentSettings.targetScore)||TARGET_SCORE;



  
  useEffect(()=>{ setLoading(true); loadContentPack().then(pack=>{
    const {posts:p,tasks:t,profiles:profileData,stories:storyData,guides:guideData,settings,manifest}=pack;
    const followed=new Set(t.map(task=>task.followUpTaskId).filter(Boolean));
    const pushTaskIds=new Set(p.map(post=>post.taskId).filter(Boolean));
    const primary=t.filter(task=>pushTaskIds.has(task.id)&&!followed.has(task.id)).map(task=>task.id);
    const postsWithSavedComments=p.map(post=>({...post,comments:[...(post.comments||[]),...(saved.customComments?.[post.id]||[])]}));setPosts(settings.randomizeFeed===false?postsWithSavedComments:shuffle(postsWithSavedComments));setTasks(t);setProfiles(profileData);setDataStories(storyData);setGuides(guideData);setContentSettings(settings);setContentManifest(manifest);setRunOrder(current=>current.length?current:(settings.randomizePrimaryMissions===false?primary:shuffle(primary)));setLoading(false);
  }).catch(e=>{setLoadingError(e.message);setLoading(false);}); },[]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        score,
        completed,
        caseResults,
        agencyRules,
        liked,
        savedPosts,
        commentLikes,
        customComments,
        introSeen: !intro,
        lang,
        researchEvents,
        sessionId,
        participantCode,
        runOrder,
        runId,
        tipsRemaining,
      })
    );
  }, [
    score,
    completed,
    caseResults,
    agencyRules,
    liked,
    savedPosts,
    commentLikes,
    customComments,
    intro,
    lang,
    researchEvents,
    sessionId,
    participantCode,
    runOrder,
    runId,
    tipsRemaining,
  ]);
  
  useEffect(() => {
    return () => {
      try {
        speechRecognitionRef.current?.stop();
      } catch {
        // Spracherkennung war bereits beendet.
      }

      try {
        feedHelpRecognitionRef.current?.stop();
      } catch {
        // Feed-Hilfe-Spracherkennung war bereits beendet.
      }

      if (irisAudioRef.current) {
        irisAudioRef.current.pause();
      }

      if (feedHelpAudioRef.current) {
        feedHelpAudioRef.current.pause();
      }
    };
  }, []);

  useEffect(()=>{ fetch('/api/health').then(r=>r.json()).then(setAiStatus).catch(()=>setAiStatus({api:'offline',ollama:false})); },[]);
  useEffect(()=>{ if(!saved.sessionId) logResearchEvent('session_started',{participantCode,runId,userAgent:navigator.userAgent,viewport:`${window.innerWidth}x${window.innerHeight}`}); },[]);
  useEffect(()=>{ if(!activeTask||feedback)return; setSeconds(activeTask.timeLimit||240); const id=setInterval(()=>setSeconds(v=>Math.max(0,v-1)),1000); return()=>clearInterval(id); },[activeTask,feedback]);
  useEffect(()=>{ if(seconds===0&&activeTask&&!feedback)submitTask(true); },[seconds]);
  useEffect(()=>{ const blocked=selectedPost||activeTask||intro||commentsPost||showResume; document.body.style.overflow=blocked?'hidden':''; return()=>{document.body.style.overflow='';}; },[selectedPost,activeTask,intro,commentsPost,showResume]);
  useEffect(()=>{ const id=setInterval(()=>setStoryPulse(v=>v+1),2600); return()=>clearInterval(id); },[]);
  useEffect(()=>{ const onKey=(e)=>{if(e.key==='Escape'){setSelectedPost(null);setCommentsPost(null);if(activeTask)setActiveTask(null);} if(selectedPost&&e.key==='ArrowRight')navigatePost(1); if(selectedPost&&e.key==='ArrowLeft')navigatePost(-1);}; window.addEventListener('keydown',onKey); return()=>window.removeEventListener('keydown',onKey); });

  useEffect(()=>{
    if(activeTab!=='feed'||!posts.length||!tasks.length||intro)return;
    const observer=new IntersectionObserver(entries=>{const hit=entries.find(e=>e.isIntersecting&&e.intersectionRatio>=.55);if(!hit||activeNotification||activeTask)return;const taskId=hit.target.dataset.taskId;if(!taskId||completed.includes(taskId)||notifiedTasks.includes(taskId))return;if(nextMissionId&&taskId!==nextMissionId)return;clearTimeout(notificationTimeout.current);notificationTimeout.current=setTimeout(()=>{const task=tasks.find(t=>t.id===taskId);const post=posts.find(p=>p.id===hit.target.dataset.postId);if(task&&post){const notification={id:`${task.id}-${Date.now()}`,taskId:task.id,postId:post.id,type:task.type,title:t('pushTitle_'+task.type),text:t('pushText_'+task.type),username:post.username,caption:post.caption,media:post.media,time:new Date().toLocaleTimeString(lang==='de'?'de-DE':'en-GB',{hour:'2-digit',minute:'2-digit'})};setActiveNotification({task,post});setNotificationHistory(items=>[notification,...items.filter(item=>item.taskId!==task.id)].slice(0,20));setUnreadNotificationCount(count=>count+1);setNotifiedTasks(items=>[...new Set([...items,taskId])]);}},700);},{threshold:[.55]});
    document.querySelectorAll('[data-task-id]').forEach(el=>observer.observe(el)); return()=>{observer.disconnect();clearTimeout(notificationTimeout.current);};
  },[activeTab,posts,tasks,intro,activeNotification,activeTask,completed,notifiedTasks,nextMissionId]);

  useEffect(() => {
    if (activeTab !== 'feed' || intro || !posts.length || !tasks.length) return;
    let timeoutId;
    const scheduleNext = () => {
      const delay = 12000 + Math.random() * 13000;
      timeoutId = setTimeout(() => {
        if (!activeNotification && !activeTask) {
          const candidateId = runOrder.find(id => !completed.includes(id) && !notifiedTasks.includes(id));
          if (candidateId) {
            const task = tasks.find(t => t.id === candidateId);
            const post = posts.find(p => p.id === task?.postId);
            if (task && post) {
              setActiveNotification({ task, post });
              setUnreadNotificationCount(count => count + 1);
              playNotificationSound();
              setNotifiedTasks(items => [...new Set([...items, candidateId])]);
              logResearchEvent('push_notification_shown', { taskId: task.id, postId: post.id, trigger: 'timer' });
            }
          }
        }
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [activeTab, intro, posts, tasks, runOrder, completed, notifiedTasks, activeNotification, activeTask]);

  useEffect(()=>{ if(!loaderRef.current)return; const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting)setVisibleCount(v=>Math.min(posts.length,v+3));},{rootMargin:'300px'}); observer.observe(loaderRef.current); return()=>observer.disconnect(); },[posts.length]);

  useEffect(()=>{
      const onReturn=()=>{
        if(document.visibilityState!=='visible')return;
        if(activeTask||intro||selectedPost||commentsPost)return;
        if(hasSavedProgress())setShowResume(true);
      };
      document.addEventListener('visibilitychange',onReturn);
      window.addEventListener('focus',onReturn);
      return()=>{document.removeEventListener('visibilitychange',onReturn);window.removeEventListener('focus',onReturn);};
    },[activeTask,intro,selectedPost,commentsPost]);




  
  function startIrisAudio() {
    const audio = irisAudioRef.current;

    if (!audio) {
      setSpeechError(lang === 'de'
        ? 'Die Iris-Audiodatei wurde nicht gefunden.'
        : 'The Iris audio file could not be found.');
      return;
    }

    audio.currentTime = 0;
    setSpeechError('');

    const playPromise = audio.play();

    if (playPromise) {
      playPromise.catch(error => {
        console.error('Iris-Audio konnte nicht gestartet werden:', error);
        setIrisSpeaking(false);
        setSpeechError(lang === 'de'
          ? 'Das Audio wurde vom Browser blockiert. Tippe erneut auf „Sprachsteuerung aktivieren“.'
          : 'The browser blocked the audio. Tap “Enable voice control” again.');
      });
    }
  }

  function activateIrisListening() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(lang === 'de'
        ? 'Dieser Browser unterstützt die Spracherkennung nicht.'
        : 'This browser does not support speech recognition.');
      return;
    }

    if (irisListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'de' ? 'de-DE' : 'en-GB';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIrisListening(true);
      setSpeechError('');
    };

    recognition.onresult = event => {
      const lastResult = event.results[event.results.length - 1];
      const spokenText = lastResult[0].transcript.toLowerCase().trim();

      console.log('Erkannt:', spokenText);

      const wakeWordDetected =
        spokenText.includes('hallo iris') ||
        spokenText.includes('hello iris') ||
        spokenText.includes('halo iris');

      if (wakeWordDetected) {
        recognition.stop();
        startIrisAudio();
      }
    };

    recognition.onerror = event => {
      console.error('Fehler bei der Spracherkennung:', event.error);
      setIrisListening(false);

      const message = event.error === 'not-allowed'
        ? (lang === 'de'
          ? 'Bitte erlaube den Mikrofonzugriff.'
          : 'Please allow microphone access.')
        : event.error === 'no-speech'
          ? (lang === 'de'
            ? 'Es wurde keine Sprache erkannt. Versuche es erneut.'
            : 'No speech was detected. Please try again.')
          : (lang === 'de'
            ? 'Die Spracherkennung konnte nicht gestartet werden.'
            : 'Speech recognition could not be started.');

      setSpeechError(message);
    };

    recognition.onend = () => {
      setIrisListening(false);
    };

    speechRecognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error('Spracherkennung konnte nicht gestartet werden:', error);
      setIrisListening(false);
    }
  }

  function stopIrisListening() {
    try {
      speechRecognitionRef.current?.stop();
    } catch {
      // Spracherkennung war bereits beendet.
    }

    setIrisListening(false);
  }

  function stopIrisAudio() {
    const audio = irisAudioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIrisSpeaking(false);
  }

  function startFeedHelpAudio() {
    const audio = feedHelpAudioRef.current;
    if (!audio) {
      setFeedHelpError(lang === 'de'
        ? 'Die Hilfe-Audiodatei wurde nicht gefunden.'
        : 'The help audio file could not be found.');
      return;
    }
    setFeedHelpError('');
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(error => {
        console.error('Feed-Hilfe-Audio konnte nicht gestartet werden:', error);
        setFeedHelpSpeaking(false);
        setFeedHelpError(lang === 'de'
          ? 'Das Audio wurde vom Browser blockiert. Tippe erneut auf „Iris Hilfe“.'
          : 'The browser blocked the audio. Tap “Iris help” again.');
      });
    }
  }

  function activateFeedHelpListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedHelpError(lang === 'de'
        ? 'Dieser Browser unterstützt keine Spracherkennung.'
        : 'This browser does not support speech recognition.');
      return;
    }
    if (feedHelpListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'de' ? 'de-DE' : 'en-GB';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => { setFeedHelpListening(true); setFeedHelpError(''); };

    recognition.onresult = event => {
      const spokenText = Array.from(event.results)
        .map(r => r[0]?.transcript || '')
        .join(' ')
        .toLowerCase();
      const triggered =
        spokenText.includes('iris hilfe') ||
        spokenText.includes('iris help') ||
        spokenText.includes('iris hilf');
      if (triggered) {
        recognition.stop();
        startFeedHelpAudio();
      }
    };

    recognition.onerror = () => {
      setFeedHelpListening(false);
      setFeedHelpError(lang === 'de'
        ? 'Die Spracherkennung konnte nicht gestartet werden.'
        : 'Speech recognition could not be started.');
    };

    recognition.onend = () => { setFeedHelpListening(false); };

    feedHelpRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setFeedHelpListening(false);
    }
  }

  function stopFeedHelpListening() {
    try { feedHelpRecognitionRef.current?.stop(); } catch { /* egal */ }
    setFeedHelpListening(false);
  }

  function logResearchEvent(type,payload={}){setResearchEvents(events=>[...events,{id:createUuid(),sessionId,participantCode,runId,type,timestamp:new Date().toISOString(),...payload}]);}
  function clearResearchData(){if(!window.confirm('Delete all locally stored research events for this session?'))return;setResearchEvents([]);}
  function normalizeAnswer(v=''){return String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();}
  function localRuleEvaluation(task,text){const n=normalizeAnswer(text);const words=new Set(n.split(' ').filter(Boolean));const w=(task.acceptedWords||[]).find(c=>{const x=normalizeAnswer(c);return x.includes(' ')?n.includes(x):words.has(x);});const p=(task.acceptedPhrases||[]).find(c=>n.includes(normalizeAnswer(c)));return w||p?{status:'accepted',accepted:true,feedback:'',mode:w?'accepted-word':'accepted-phrase',matchedCriterion:w||p}:null;}
  async function evaluateWrittenReason(task,text){const local=localRuleEvaluation(task,text);if(local)return local;const r=await fetch('/api/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId:task.id,instruction:task.instruction,answer:text,acceptedWords:task.acceptedWords||[],acceptedPhrases:task.acceptedPhrases||[],referenceAnswers:task.referenceAnswers||[],rubric:task.rubric||[]})});if(!r.ok)throw new Error('Semantic evaluation is currently unavailable.');return r.json();}
  function downloadFile(filename,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
  function exportResearchJson(){downloadFile(`deepfake-defender-${participantCode}-${sessionId}.json`,JSON.stringify({schemaVersion:'1.0',exportedAt:new Date().toISOString(),participantCode,sessionId,runId,contentPack:{name:contentManifest?.name,version:contentManifest?.version},score,completed,caseResults,agencyRules,researchEvents},null,2),'application/json');}
  function exportResearchCsv(){const h=['timestamp','participantCode','sessionId','runId','type','taskId','postId','correct','points','confidence','responseTimeMs','timeRemaining','evaluationMode','reason'];const rows=researchEvents.map(e=>h.map(k=>JSON.stringify(e[k]??'')).join(','));downloadFile(`deepfake-defender-${participantCode}-${sessionId}.csv`,[h.join(','),...rows].join('\n'),'text/csv;charset=utf-8');}

  const completedNewsRounds=caseResults.filter(result=>result.type==='news').length;
  const freeHintRounds=completedNewsRounds<3;
  const hintMode=freeHintRounds?'free':tipsRemaining>0?'limited':'empty';
  const hintButtonLabel=freeHintRounds
    ? `💡 ${t('hintShowFree')}`
    : tipsRemaining>0
      ? `💡 ${t('hintUse')} (${tipsRemaining}/${MAX_TIPS})`
      : t('hintNoneLeft');

  function useHint(toolId){
    if(revealedHints.includes(toolId)){setRevealedHints(items=>items.filter(id=>id!==toolId));return;}
    if(hintMode==='empty')return;
    if(!freeHintRounds)setTipsRemaining(value=>Math.max(0,value-1));
    setRevealedHints(items=>[...items,toolId]);
    logResearchEvent('hint_used',{taskId:activeTask?.id,postId:activePost?.id,toolId,free:freeHintRounds,tipsRemainingAfter:freeHintRounds?tipsRemaining:Math.max(0,tipsRemaining-1)});
  }

  function openTask(taskId,postOverride=null,origin='push'){const task=taskMap[taskId];if(!task||completed.includes(taskId))return;const post=postOverride||posts.find(p=>p.id===task.postId)||null;setActiveNotification(null);if(origin==='push')setUnreadNotificationCount(count=>Math.max(0,count-1));setActiveTask(task);setActivePost(post);setSelectedAnswers([]);setReason('');setConfidence(3);setFeedback(null);setTaskPhase(task.type==='news'?'inspect':'answer');setUsedTools([]);setOpenTool(null);setRevealedHints([]);setShowHintNote(false);setVerdict('');setTaskOrigin(origin);taskStartedAt.current=Date.now();logResearchEvent('task_opened',{taskId:task.id,postId:post?.id||task.postId,origin});}
  function useAnalysisTool(toolId){ if(!activeTask)return; setOpenTool(current=>current===toolId?null:toolId); if(!usedTools.includes(toolId)){setUsedTools(items=>[...items,toolId]);logResearchEvent('analysis_tool_used',{taskId:activeTask.id,postId:activePost?.id,toolId,order:usedTools.length+1});} }
  function toggleAnswer(id){if(!activeTask)return;setSelectedAnswers(cur=>activeTask.answerMode==='multipleChoice'?(cur.includes(id)?cur.filter(x=>x!==id):[...cur,id]):[id]);if(feedback?.validation)setFeedback(null);}
  function isCorrectAnswer(task,answers){const correct=task.correctAnswers||[];if(task.answerMode==='multipleChoice'){const required=task.minimumCorrectSelections||correct.length;return answers.filter(a=>correct.includes(a)).length>=required&&answers.every(a=>correct.includes(a));}return answers.some(a=>correct.includes(a));}
  async function submitTask(expired=false){if(!activeTask||feedback||evaluating)return;const open=activeTask.answerMode==='openAnalysis';if(!expired&&activeTask.type==='news'&&!verdict){setFeedback({validation:true,text:t('valChooseVerdict')});return;}if(!expired&&!open&&!selectedAnswers.length){setFeedback({validation:true,text:t('valSelectAnswer')});return;}if(!expired&&(open||activeTask.answerMode==='singleChoiceWithReason')&&reason.trim().length<(activeTask.minimumReasonLength||0)){setFeedback({validation:true,text:t('valTypeClue')});return;}const isNews=activeTask.type==='news'&&!!activeTask.correctVerdict;const reasonEval=(isNews&&reason.trim())?matchReason(activePost?.id||activeTask.postId,reason):null;const verdictCorrect=!isNews||verdict===activeTask.correctVerdict;let correct,delta,point1=0,point2=0;if(isNews){point1=(!expired&&verdictCorrect)?1:0;point2=(!expired&&reasonEval&&reasonEval.matched)?1:0;delta=point1+point2;correct=!expired&&verdictCorrect;}else{const reasoningCorrect=isCorrectAnswer(activeTask,selectedAnswers);correct=!expired&&verdictCorrect&&reasoningCorrect;delta=correct?activeTask.pointsCorrect:activeTask.pointsWrong;}setScore(v=>v+delta);setCompleted(items=>[...new Set([...items,activeTask.id])]);const responseTimeMs=taskStartedAt.current?Date.now()-taskStartedAt.current:null;setCaseResults(items=>[...items.filter(i=>i.taskId!==activeTask.id),{taskId:activeTask.id,postId:activeTask.postId,title:activeTask.title,type:activeTask.type,correct,delta,answers:selectedAnswers,verdict,analysisTools:usedTools,reason,confidence,responseTimeMs,verdictCorrect,reasonMatched:point2===1,matchedConceptId:reasonEval?.conceptId||null,point1,point2}]);if(correct&&activeTask.type==='realityDefense'){const rule=activeTask.ruleToSaveFromAnswer?reason.trim():activeTask.ruleToSave;if(rule)setAgencyRules(items=>[...new Set([...items,rule])]);}logResearchEvent('task_submitted',{taskId:activeTask.id,postId:activeTask.postId,origin:taskOrigin,correct,points:delta,answers:selectedAnswers.join('|'),verdict,correctVerdict:activeTask.correctVerdict||'',analysisTools:usedTools.join('|'),reason,confidence,responseTimeMs,timeRemaining:seconds,verdictCorrect,reasonMatched:point2===1,matchedConceptId:reasonEval?.conceptId||'',matchedVia:reasonEval?.via||'',reasonHadSlangOnly:reasonEval?.hadSlangOnly||false,point1,point2});
    const projectedCompleted=[...new Set([...completed,activeTask.id])];
    const projectedScore=score+delta;
    if(projectedScore>=targetScore||projectedScore<=-10||projectedCompleted.length>=tasks.length){setRunSummary({score:projectedScore,correct:caseResults.filter(item=>item.correct).length+(correct?1:0),total:projectedCompleted.length,targetReached:projectedScore>=targetScore,lost:projectedScore<=-10});}
    const VL={echt:t('verdictEcht'),manipuliert:t('verdictManipuliert'),suspekt:t('verdictSuspekt')};const actualReason=reasonEval&&reasonEval.feedback?(reasonEval.feedback[lang]||reasonEval.feedback.de):(verdictCorrect?activeTask.feedbackCorrect:activeTask.feedbackWrong);setFeedback({correct,delta,point1,point2,verdictCorrect,reasonMatched:point2===1,correctVerdictLabel:VL[activeTask.correctVerdict]||activeTask.correctVerdict,yourReason:reason.trim(),actualReason,expired});setEvaluating(false);}
  function closeTask(){const next=feedback?.correct?activeTask?.followUpTaskId:null;const post=activePost;setActiveTask(null);setActivePost(null);setFeedback(null);setTaskPhase('inspect');setUsedTools([]);setOpenTool(null);setRevealedHints([]);setShowHintNote(false);setVerdict('');if(next&&!completed.includes(next))setTimeout(()=>openTask(next,post),300);}
  function toggle(list,setter,id){setter(list.includes(id)?list.filter(x=>x!==id):[...list,id]);}
  function startNewRun(){
    const followed=new Set(tasks.map(task=>task.followUpTaskId).filter(Boolean));
    const pushTaskIds=new Set(posts.map(post=>post.taskId).filter(Boolean));
    const primary=tasks.filter(task=>pushTaskIds.has(task.id)&&!followed.has(task.id)).map(task=>task.id);
    const newRunId=createUuid();
    setPosts(items=>shuffle(items));setRunOrder(shuffle(primary));setRunId(newRunId);setVisibleCount(5);setNotifiedTasks([]);setActiveNotification(null);
    setScore(0);setCompleted([]);setCaseResults([]);setAgencyRules([]);setTipsRemaining(MAX_TIPS);setRevealedHints([]);setUnreadNotificationCount(0);setNotificationHistory([]);setRunSummary(null);setActiveTab('feed');
    logResearchEvent('new_run_started',{runId:newRunId,previousCompletedTasks:completed.length,previousScore:score});window.scrollTo({top:0,behavior:'smooth'});
  }
  function addComment(){
    const text=commentDraft.trim();
    if(!commentsPost||!text)return;
    const postId=commentsPost.id;
    const newComment={id:createUuid(),username:'agency_team',text,time:'now'};
    setCustomComments(current=>({...current,[postId]:[...(current[postId]||[]),newComment]}));
    setPosts(items=>items.map(post=>post.id===postId?{...post,comments:[...(post.comments||[]),newComment]}:post));
    setCommentsPost(current=>current?.id===postId?{...current,comments:[...(current.comments||[]),newComment]}:current);
    setSelectedPost(current=>current?.id===postId?{...current,comments:[...(current.comments||[]),newComment]}:current);
    setCommentDraft('');
    logResearchEvent('comment_added',{postId,commentLength:text.length});
  }
  function openComments(postOrId){
    const post = typeof postOrId === 'object' && postOrId
      ? postOrId
      : posts.find(item => item.id === postOrId);

    if (!post) return;

    setCommentsPost({
      ...post,
      comments: Array.isArray(post.comments) ? post.comments : [],
    });
    setCommentDraft('');
  }
  function refreshFeed(){setLoading(true);setTimeout(()=>{setPosts(items=>shuffle(items));setVisibleCount(5);setLoading(false);},650);}
  function likePost(postId){if(!liked.includes(postId)){setLiked([...liked,postId]);setHeartBurst(postId);setTimeout(()=>setHeartBurst(null),800);}else setLiked(liked.filter(x=>x!==postId));}
  function navigatePost(direction){if(!selectedPost)return;const i=posts.findIndex(p=>p.id===selectedPost.id);setSelectedPost(posts[(i+direction+posts.length)%posts.length]);setZoom(1);}
  async function sharePost(post){const text=`${post.username}: ${post.caption}`;try{if(navigator.share)await navigator.share({title:'AiGram post',text});else{await navigator.clipboard.writeText(text);alert('Post copied to clipboard.');}}catch{/* user cancelled */}}
  function openPost(post){setSelectedPost(post);setZoom(1);logResearchEvent('post_opened',{postId:post.id});}
  function reopenIntro(){
  setSimulationConfirmed(false);
  setDemoStep(-1);
  setIntro(true);
}

function reopenDemo(){
  setDemoStep(1);
  setIntro(true);
}
  function getAccountActivityComments(post){
    if(!post)return [];
    return (post.accountActivity||[]).slice(0,4);
  }
  function openNotificationItem(item){
    const task=taskMap[item.taskId];
    const post=posts.find(entry=>entry.id===item.postId);
    if(task&&post&&!completed.includes(task.id))openTask(task.id,post,'push');
    else if(post)openPost(post);
  }
  const demoPost=posts[0]||null;
  const speechRecognitionSupported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return <div className="page"><div className="phone-shell">
    <header className="app-header"><div className="wordmark"><span>Ai</span>Gram</div><div className="header-actions"><button type="button" onClick={reopenIntro} aria-label="Intro & Demo"><HelpCircle size={22}/></button><div className="lang-switch">{LANGUAGES.map(l => (<button key={l.code} className={lang === l.code ? 'active' : ''} onClick={() => setLang(l.code)}>{l.label}</button>))}</div><button aria-label="Activity"><Heart size={22}/></button><button aria-label="Messages"><Send size={22}/></button></div></header>
    {activeTab==='feed'&&<div className="mission-progress"><div><span>{t('missionProgress')}</span><strong>{completed.length}/{totalMissionCount}</strong></div><div className="mission-track"><span style={{width:`${progressPercent}%`}}></span></div><small>{nextMissionId?`${t('nextCase')}: ${taskMeta[taskMap[nextMissionId]?.type]?.label||t('agencyReview')}`:t('allCasesReviewed')} · {t('target')} {targetScore} {t('pointsWord')}</small></div>}
    {activeNotification&&<div className="agency-toast" role="status"><button className="toast-main" onClick={()=>openTask(activeNotification.task.id,activeNotification.post,'push')}><span className="toast-icon"><ShieldCheck size={22}/></span><span><strong>{t('pushTitle_'+activeNotification.task.type)}</strong><small>{t('pushText_'+activeNotification.task.type)}</small></span></button><button className="toast-close" onClick={()=>setActiveNotification(null)} aria-label="Dismiss"><X size={18}/></button></div>}

    {activeTab==='feed'&&<><div className="feed-tabs"><button className={feedMode==='forYou'?'active':''} onClick={()=>setFeedMode('forYou')}>{t('forYou')}</button><button className={feedMode==='following'?'active':''} onClick={()=>setFeedMode('following')}>{t('following')}</button></div>
      <section className="stories" aria-label="Stories">{stories.map((s,i)=><div className={`story ${storyPulse%stories.length===i?'story-active':''}`} key={s.name}><div className={`story-ring ${s.className}`}><div>{s.letter}</div><span className={`story-status ${s.status}`}></span></div><span>{s.name}</span></div>)}</section>
      <div className="feed-toolbar"><span>{t('latestPosts')}</span><button onClick={refreshFeed}><RefreshCw size={16}/> {t('refresh')}</button></div>
      <main className="feed">{loading&&[0,1,2].map(i=><div className="post skeleton" key={i}><div className="skeleton-head"/><div className="skeleton-media"/><div className="skeleton-lines"/></div>)}{loadingError&&<div className="load-error">{loadingError}</div>}{!loading&&visiblePosts.map(post=><article className="post" key={post.id} data-post-id={post.id} data-task-id={post.taskId||undefined}>
        <div className="post-head"><button className="avatar" aria-label={`${post.username} profile`}>{post.username.slice(0,1).toUpperCase()}</button><div className="post-user"><strong>{post.username}</strong><span>{post.location}</span></div><button className="icon-plain" aria-label="More options"><MoreHorizontal size={22}/></button></div>
        <button className="post-image-button" onClick={()=>openPost(post)} onDoubleClick={()=>likePost(post.id)} aria-label="Open post"><img className="post-image" src={imagePath(post.media)} alt={post.imageAlt}/><span className="expand-hint"><Maximize2 size={18}/> {t('open')}</span>{heartBurst===post.id&&<span className="heart-burst"><Heart size={82} fill="white"/></span>}</button>
        <div className="post-actions"><button onClick={()=>likePost(post.id)} className={liked.includes(post.id)?'is-liked':''} aria-label="Like"><Heart size={25} fill={liked.includes(post.id)?'currentColor':'none'}/></button><button onClick={()=>openComments(post.id)} aria-label="Comments"><MessageCircle size={24}/></button><button onClick={()=>sharePost(post)} aria-label="Share"><Send size={24}/></button><button className="push-right" onClick={()=>toggle(savedPosts,setSavedPosts,post.id)} aria-label="Save"><Bookmark size={24} fill={savedPosts.includes(post.id)?'currentColor':'none'}/></button></div>
        <div className="post-copy"><strong>{(post.likes+(liked.includes(post.id)?1:0)).toLocaleString('en-US')} {t('likesWord')}</strong><p><b>{post.username}</b> {post.caption}</p><button className="comment-link" onClick={()=>openComments(post.id)}>{t('viewAll')} {(post.comments||[]).length} {t('commentsWord')}</button><span className="post-time">{post.time}</span></div>
        {post.reviewTaskId&&!completed.includes(post.reviewTaskId)&&<div className="feed-review-strip"><div><ShieldCheck size={18}/><span><strong>{t('checkThisPost')}</strong><small>{t('checkThisPostText')}</small></span></div><button onClick={()=>openTask(post.reviewTaskId,post,'feed')}>{t('review')}</button></div>}
        {post.reviewTaskId&&completed.includes(post.reviewTaskId)&&<div className="completed-strip"><CheckCircle2 size={17}/> {t('feedReviewCompleted')}</div>}
        {!post.reviewTaskId&&post.taskId&&completed.includes(post.taskId)&&<div className="completed-strip"><CheckCircle2 size={17}/> {t('agencyReviewCompleted')}</div>}
      </article>)}<div ref={loaderRef} className="infinite-loader">{visibleCount<feedPosts.length?t('loadingMore'):t('allCaughtUp')}</div></main></>}

    {activeTab==='cases'&&<main className="dashboard-screen"><div className="screen-heading"><span>{t('agencyDatabase')}</span><h2>{t('reviewedCases')}</h2></div>{!caseResults.length?<div className="empty-state"><ShieldCheck size={44}/><h3>{t('noCasesYet')}</h3><p>{t('reviewedWillAppear')}</p></div>:<div className="case-list">{[...caseResults].reverse().map(r=><article className="case-card" key={r.taskId}><div><small>{taskMeta[r.type]?.label||r.type}</small><h3>{r.title}</h3></div><span className={r.correct?'case-good':'case-bad'}>{r.delta>0?'+':''}{r.delta}</span><p className="case-answer">{r.reason||t('noWrittenResponse')}</p></article>)}</div>}</main>}
    {activeTab==='agency'&&<main className="dashboard-screen"><div className="screen-heading"><span>{t('agencyCenter')}</span><h2>{t('digitalCredibility')}</h2></div><section className="notification-center"><h3><Bell size={19}/> Pushnachrichten</h3>{!notificationHistory.length?<p>Noch keine Pushnachrichten.</p>:<div className="notification-list">{notificationHistory.map(item=><button type="button" key={item.id} onClick={()=>openNotificationItem(item)}><img src={imagePath(item.media)} alt=""/><span><strong>{item.title}</strong><small>@{item.username} · {item.time}</small><p>{item.text}</p><em>{item.caption}</em></span></button>)}</div>}</section><div className="agency-stats"><div><strong>{score}</strong><span>{t('credibilityPoints')}</span></div><div><strong>{completed.length}</strong><span>{t('completedTasks')}</span></div></div><section className="rules-panel"><h3>{t('realityDefenseRules')}</h3>{!agencyRules.length?<p>{t('noRulesYet')}</p>:agencyRules.map(rule=><div className="rule" key={rule}><ShieldCheck size={18}/>{rule}</div>)}</section><section className="research-panel"><h3>{t('contentPack')}</h3><p><strong>{contentManifest?.name||contentSettings.contentPackName||'Deepfake Defender'}</strong> · {t('version')} {contentManifest?.version||contentSettings.contentPackVersion||'1.0.0'}</p><div className="content-pack-stats"><span>{posts.length} {t('postsWord')}</span><span>{tasks.length} {t('tasksWord')}</span><span>{profiles.length} {t('profilesWord')}</span><span>{guides.length} {t('guidesWord')}</span></div><small>{t('validatedAuto')}</small></section><section className="research-panel"><h3>{t('researchMode')}</h3><p>{t('researchText')}</p><div className="research-meta-grid"><div><span>{t('participantCode')}</span><strong>{participantCode}</strong></div><div><span>{t('loggedEvents')}</span><strong>{researchEvents.length}</strong></div><div><span>{t('evaluationApi')}</span><strong className={aiStatus.api==='ok'?'status-ok':'status-warn'}>{aiStatus.api==='ok'?t('online'):t('offline')}</strong></div><div><span>{t('localAi')}</span><strong className={aiStatus.ollama?'status-ok':'status-warn'}>{aiStatus.ollama?t('ready'):t('optional')}</strong></div></div><div className="research-actions"><button onClick={exportResearchJson}>{t('exportJson')}</button><button onClick={exportResearchCsv}>{t('exportCsv')}</button><button className="danger-lite" onClick={clearResearchData}>{t('deleteLocalData')}</button></div><small>{t('sessionIdLabel')}: {sessionId}</small></section><button className="secondary-action" onClick={startNewRun}><Sparkles size={18}/> {t('startNewRun')}</button></main>}
    {activeTab==='profile'&&<main className="dashboard-screen profile-screen"><div className="profile-cover"></div><div className="profile-avatar">A</div><h2>{t('agencyTeam')}</h2><p>@digital_credibility_unit</p><div className="profile-bio">{t('profileBio')}</div><div className="profile-metrics"><div><strong>{score}</strong><span>{t('pointsWord2')}</span></div><div><strong>{completed.length}</strong><span>{t('casesWord')}</span></div><div><strong>{agencyRules.length}</strong><span>{t('rulesWord')}</span></div></div><div className="profile-help-actions"><button className="secondary-action" onClick={reopenIntro}>Intro erneut ansehen</button><button className="secondary-action" onClick={reopenDemo}>Demo erneut ansehen</button></div><div className="profile-grid">{posts.slice(0,6).map(p=><button key={p.id} onClick={()=>openPost(p)}><img src={imagePath(p.media)} alt=""/></button>)}</div></main>}

    <nav className="bottom-nav"><button className={activeTab==='feed'?'active':''} onClick={()=>setActiveTab('feed')}><Home/><span>{t('feed')}</span></button><button className={activeTab==='cases'?'active':''} onClick={()=>setActiveTab('cases')}><ShieldCheck/><span>{t('cases')}</span></button><button className={activeTab==='agency'?'active':''} onClick={()=>{setActiveTab('agency');setUnreadNotificationCount(0);}} aria-label="Pushnachrichten öffnen"><span className="nav-icon-wrap"><Bell/>{unreadNotificationCount>0&&<span className="notification-badge">{unreadNotificationCount>99?'99+':unreadNotificationCount}</span>}</span><span>{t('agency')}</span></button><button className={activeTab==='profile'?'active':''} onClick={()=>setActiveTab('profile')}><UserRound/><span>{t('profile')}</span></button></nav><div className="score-chip"><ShieldCheck size={17}/><span>{score}</span></div>
  </div>
{intro&&
  <div className="modal-backdrop">
    <section className="intro-card demo-card">

      {demoStep===-1&&<>
        <div className="intro-shield">
          <ShieldCheck size={42}/>
        </div>

        <span className="eyebrow">
          {lang==='de' ? 'Vor dem Start' : 'Before you begin'}
        </span>

        <h1>
          {lang==='de'
            ? 'Sprache wählen'
            : 'Choose your language'}
        </h1>

        <div className="lang-switch intro-language-switch">
          {LANGUAGES.map(language=>(
            <button
              type="button"
              key={language.code}
              className={lang===language.code?'active':''}
              onClick={()=>setLang(language.code)}
            >
              {language.label}
            </button>
          ))}
        </div>

        <div className="simulation-notice">
          <Info size={24}/>

          <div>
            <h2>
              {lang==='de'
                ? 'Hinweis zur Simulation'
                : 'Simulation notice'}
            </h2>

            <p>
              {lang==='de'
                ? 'Diese Anwendung ist eine Simulation. Alle dargestellten Profile, Beiträge, Kommentare und Situationen sind fiktiv und wurden ausschließlich für Lern- und Forschungszwecke erstellt.'
                : 'This application is a simulation. All profiles, posts, comments and situations shown are fictional and were created exclusively for learning and research purposes.'}
            </p>

            <p>
              {lang==='de'
                ? 'Einige Inhalte können bewusst manipulierte oder irreführende Informationen darstellen. Sie dienen dazu, den kritischen Umgang mit digitalen Inhalten zu üben.'
                : 'Some content may intentionally contain manipulated or misleading information. It is included to practise the critical evaluation of digital content.'}
            </p>
          </div>
        </div>

        <label className="simulation-confirmation">
          <input
            type="checkbox"
            checked={simulationConfirmed}
            onChange={event=>setSimulationConfirmed(event.target.checked)}
          />

          <span>
            {lang==='de'
              ? 'Ich habe verstanden, dass es sich um eine Simulation mit fiktiven Inhalten handelt.'
              : 'I understand that this is a simulation containing fictional content.'}
          </span>
        </label>

        <button
          type="button"
          disabled={!simulationConfirmed}
          onClick={()=>setDemoStep(0)}
        >
          {lang==='de' ? 'Weiter' : 'Continue'}
        </button>
      </>}

      {demoStep===0&&<>
        <div className="intro-shield">
          <ShieldCheck size={42}/>
        </div>

        <span className="eyebrow">
          {t('introEyebrow')}
        </span>

        <h1>
          {t('introTitle')}
        </h1>

        <p>
          {t('introBody')}
        </p>

        <div className="intro-audio-wrap">
          <audio
            ref={irisAudioRef}
            src={imagePath(`assets/intro_${lang}.mp3`)}
            preload="auto"
            playsInline
            key={lang}
            onPlay={() => setIrisSpeaking(true)}
            onPause={() => setIrisSpeaking(false)}
            onEnded={() => setIrisSpeaking(false)}
          />

          <button
            type="button"
            onClick={speechRecognitionSupported ? (irisListening ? stopIrisListening : activateIrisListening) : startIrisAudio}
          >
            {speechRecognitionSupported
              ? (irisListening
                  ? (lang === 'de' ? 'Iris hört zu …' : 'Iris is listening …')
                  : (lang === 'de' ? '🎙️Iris wecken' : '🎙️Wake Iris'))
              : (lang === 'de' ? '🔊 Begrüßung' : '🔊 Greeting')}
          </button>

          {irisSpeaking && (
            <button type="button" className="demo-skip" onClick={stopIrisAudio}>
              {lang === 'de' ? 'Iris stoppen' : 'Stop Iris'}
            </button>
          )}

          {speechError && <p role="alert">{speechError}</p>}
        </div>

        <div className="mission-rules">
          <strong>{t('introWinRule')}</strong>
          <strong>{t('introLoseRule')}</strong>
        </div>

        <button
          type="button"
          onClick={()=>setDemoStep(1)}
        >
          {t('startDemo')}
        </button>

        <button
          type="button"
          className="demo-skip"
          onClick={()=>setIntro(false)}
        >
          {t('skipDemo')}
        </button>
      </>}

      {demoStep===1&&<>
        <span className="eyebrow">
          Demo 1 {t('demoOf')} 5
        </span>

        <h2>
          {t('tool_image')}
        </h2>

        {demoPost&&
          <article className="demo-real-post">
            <div>
              <b>@{demoPost.username}</b>
              <small>{demoPost.time}</small>
            </div>

            <img
              src={imagePath(demoPost.media)}
              alt={demoPost.imageAlt}
            />

            <p>
              <b>{demoPost.username}</b> {demoPost.caption}
            </p>
          </article>
        }

        <div className="demo-tool-preview">
          <ScanSearch/>

          <div>
            <strong>{t('demo1Title')}</strong>
            <p>{t('demo1Body')}</p>
          </div>
        </div>

        <div className="demo-actions">
          <button
            type="button"
            className="demo-skip"
            onClick={()=>setIntro(false)}
          >
            {t('skipWord')}
          </button>

          <button
            type="button"
            onClick={()=>setDemoStep(2)}
          >
            {t('continueWord')}
          </button>
        </div>
      </>}

      {demoStep===2&&<>
        <span className="eyebrow">
          Demo 2 {t('demoOf')} 5
        </span>

        <h2>
          {t('tool_source')}
        </h2>

        <div className="demo-tool-preview">
          <Globe2/>

          <div>
            <strong>{t('demo2Title')}</strong>
            <p>{t('demo2Body')}</p>
          </div>
        </div>

        <div className="demo-link-example">
          <small>{t('demo2Eyebrow')}</small>
          <b>blitz-news.example/hitzefrei</b>
          <span>{t('demo2Example')}</span>
        </div>

        <div className="demo-actions">
          <button
            type="button"
            className="demo-skip"
            onClick={()=>setIntro(false)}
          >
            {t('skipWord')}
          </button>

          <button
            type="button"
            onClick={()=>setDemoStep(3)}
          >
            {t('continueWord')}
          </button>
        </div>
      </>}

      {demoStep===3&&<>
        <span className="eyebrow">
          Demo 3 {t('demoOf')} 5
        </span>

        <h2>
          {t('tool_profile')}
        </h2>

        <div className="demo-tool-preview">
          <UserRound/>

          <div>
            <strong>{t('whyImportant')}</strong>
            <p>{t('demo3Body1')}</p>
            <p>{t('demo3Body2')}</p>
          </div>
        </div>

        <div className="demo-profile-example">
          <b>@news_update24</b>
          <span>{t('demo3ProfileAge')}</span>
          <span>{t('demo3ProfileResp')}</span>
        </div>

        <div className="demo-actions">
          <button
            type="button"
            className="demo-skip"
            onClick={()=>setIntro(false)}
          >
            {t('skipWord')}
          </button>

          <button
            type="button"
            onClick={()=>setDemoStep(4)}
          >
            {t('continueWord')}
          </button>
        </div>
      </>}

      {demoStep===4&&<>
        <span className="eyebrow">
          Demo 4 {t('demoOf')} 5
        </span>

        <h2>
          {t('tool_activities')}
        </h2>

        <div className="demo-tool-preview">
          <RefreshCw/>

          <div>
            <strong>{t('demo4Title')}</strong>
            <p>{t('demo4Body')}</p>
          </div>
        </div>

        <div className="demo-comments-example">
          <p>
            <b>@news_update24</b> {t('profileActivities')}
          </p>

          <p>
            {t('demo4Check')}
          </p>
        </div>

        <div className="demo-actions">
          <button
            type="button"
            className="demo-skip"
            onClick={()=>setIntro(false)}
          >
            {t('skipWord')}
          </button>

          <button
            type="button"
            onClick={()=>setDemoStep(5)}
          >
            {t('continueWord')}
          </button>
        </div>
      </>}

      {demoStep===5&&<>
        <span className="eyebrow">
          Demo 5 {t('demoOf')} 5
        </span>

        <h2>
          {t('demo5Title')}
        </h2>

        <div className="demo-tool-preview">
          <ShieldCheck/>

          <div>
            <strong>{t('demo5Sub')}</strong>
            <p>{t('demo5Body')}</p>
          </div>
        </div>

        <div className="mission-rules">
          <strong>{t('demo5WinRule')}</strong>
          <strong>{t('demo5LoseRule')}</strong>
        </div>

        <button
          type="button"
          onClick={()=>setIntro(false)}
        >
          {t('startMission')}
        </button>

        <button
          type="button"
          className="demo-back"
          onClick={()=>setDemoStep(4)}
        >
          {t('backWord')}
        </button>
      </>}

    </section>
  </div>
}

  {showResume&&!intro&&<div className="modal-backdrop">
    <section className="intro-card resume-card">
      <div className="intro-shield"><ShieldCheck size={42}/></div>
      <span className="eyebrow">{lang==='de'?'Willkommen zurück':'Welcome back'}</span>
      <h1>{lang==='de'?'Weiterspielen?':'Continue playing?'}</h1>
      <p>{lang==='de'
        ? 'Es gibt einen gespeicherten Spielstand. Du kannst dort weitermachen, wo du aufgehört hast, oder eine neue Mission starten.'
        : 'You have a saved game. You can pick up where you left off, or start a new mission.'}</p>
      <div className="resume-stats">
        <div><strong>{saved.score??0}</strong><span>{lang==='de'?'Punkte':'Points'}</span></div>
        <div><strong>{(saved.completed?.length)||0}</strong><span>{lang==='de'?'Fälle':'Cases'}</span></div>
      </div>
      <button
        type="button"
        className="primary"
        onClick={()=>{setShowResume(false);setActiveTab('feed');logResearchEvent('run_resumed',{completedTasks:(saved.completed?.length)||0,score:saved.score??0});}}
      >
        {lang==='de'?'Weiterspielen':'Continue'}
      </button>
      <button
        type="button"
        className="secondary-action resume-restart"
        onClick={()=>{
          const ok=window.confirm(lang==='de'
            ? 'Neue Mission starten? Dein gespeicherter Fortschritt geht dabei verloren.'
            : 'Start a new mission? Your saved progress will be lost.');
          if(!ok)return;
          startNewRun();
          setShowResume(false);
        }}
      >
        <Sparkles size={18}/> {lang==='de'?'Neu starten':'Start new'}
      </button>
    </section>
  </div>}

  {selectedPost&&<div className="modal-backdrop post-modal-backdrop" onClick={()=>setSelectedPost(null)}><section className="post-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelectedPost(null)} aria-label="Close"><X/></button><button className="modal-nav modal-prev" onClick={()=>navigatePost(-1)} aria-label="Previous"><ChevronLeft/></button><button className="modal-nav modal-next" onClick={()=>navigatePost(1)} aria-label="Next"><ChevronRight/></button><div className="post-modal-media"><img style={{transform:`scale(${zoom})`}} src={imagePath(selectedPost.media)} alt={selectedPost.imageAlt}/><div className="zoom-controls"><button onClick={()=>setZoom(z=>Math.max(1,z-.25))}><ZoomOut/></button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.min(3,z+.25))}><ZoomIn/></button></div></div><div className="post-modal-info"><div className="post-head"><div className="avatar">{selectedPost.username.slice(0,1).toUpperCase()}</div><div className="post-user"><strong>{selectedPost.username}</strong><span>{selectedPost.location}</span></div></div><div className="modal-caption"><b>{selectedPost.username}</b> {selectedPost.caption}</div><div className="modal-comments">{(selectedPost.comments||[]).map((c,i)=><p key={`${c?.username||'comment'}-${i}`}><b>{c?.username||t('unknownUser')}</b> {c?.text||''}</p>)}</div></div></section></div>}

  {commentsPost&&<div className="modal-backdrop comments-backdrop" onClick={()=>setCommentsPost(null)}><section className="comments-sheet" onClick={e=>e.stopPropagation()}><div className="sheet-handle"></div><header><h2>{t('comments')}</h2><button onClick={()=>setCommentsPost(null)}><X/></button></header><div className="comments-list">{(commentsPost.comments||[]).map((c,i)=>{const id=`${commentsPost.id||'post'}-${i}`;const username=String(c?.username||t('unknownUser')||'User');return <article className="comment-row" key={c?.id||id}><div className="comment-avatar">{username.slice(0,1).toUpperCase()}</div><p><b>{username}</b> {c?.text||''}<small>{i+1}m · {t('reply')}</small></p><button type="button" className={commentLikes.includes(id)?'is-liked':''} onClick={()=>toggle(commentLikes,setCommentLikes,id)}><Heart size={16} fill={commentLikes.includes(id)?'currentColor':'none'}/></button></article>})}</div><div className="comment-input"><div className="comment-avatar">A</div><input value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addComment();}} placeholder={t('addComment')}/><button disabled={!commentDraft.trim()} onClick={addComment}>{t('post')}</button></div></section></div>}

  {runSummary&&<div className="modal-backdrop"><section className="run-summary-card"><div className="intro-shield"><ShieldCheck size={42}/></div><span className="eyebrow">{t('runComplete')}</span><h2>{runSummary.targetReached?'Mission gewonnen':runSummary.lost?'Mission verloren':t('missionReviewed')}</h2><p>{runSummary.targetReached?'Du hast 20 Glaubwürdigkeitspunkte erreicht.':runSummary.lost?'Dein Punktestand ist auf −10 gefallen. Starte eine neue Mission und prüfe die Hinweise genauer.':<>Du hast {runSummary.total} Fälle mit <strong>{runSummary.score} Glaubwürdigkeitspunkten</strong> bearbeitet.</>}</p><div className="run-summary-stats"><div><strong>{runSummary.correct}</strong><span>{t('correct')}</span></div><div><strong>{runSummary.total-runSummary.correct}</strong><span>{t('needsReview')}</span></div><div><strong>{runSummary.score}</strong><span>{t('pointsWord2')}</span></div></div><button className="primary" onClick={()=>{setRunSummary(null);setActiveTab('agency');}}>{t('viewAgencyResults')}</button><button className="secondary-action" onClick={startNewRun}>{t('startAnotherRun')}</button></section></div>}

  {activeTask&&<div className="modal-backdrop task-backdrop"><section className={`task-sheet task-${activeTask.type}`}><div className="task-top"><button onClick={()=>setActiveTask(null)}><ChevronLeft/></button><div><span className="eyebrow">{taskOrigin==='feed'?t('feedReview'):taskMeta[activeTask.type]?.label||activeTask.type}</span><h2>{activeTask.title}</h2></div><div className="timer">{seconds}s</div></div>{activePost&&activeTask.type==='news'?<article className="post task-feed-post"><div className="post-head"><button className="avatar" aria-label={`${activePost.username} profile`}>{activePost.username.slice(0,1).toUpperCase()}</button><div className="post-user"><strong>{activePost.username}</strong><span>{activePost.location}</span></div><button className="icon-plain" aria-label="More options"><MoreHorizontal size={22}/></button></div><button className="post-image-button" onClick={()=>openPost(activePost)} onDoubleClick={()=>likePost(activePost.id)} aria-label="Open post"><img className="post-image" src={imagePath(activePost.media)} alt={activePost.imageAlt}/><span className="expand-hint"><Maximize2 size={18}/> {t('open')}</span>{heartBurst===activePost.id&&<span className="heart-burst"><Heart size={82} fill="white"/></span>}</button><div className="post-actions"><button onClick={()=>likePost(activePost.id)} className={liked.includes(activePost.id)?'is-liked':''} aria-label="Like"><Heart size={25} fill={liked.includes(activePost.id)?'currentColor':'none'}/></button><button onClick={()=>openComments(activePost)} aria-label="Comments"><MessageCircle size={24}/></button><button onClick={()=>sharePost(activePost)} aria-label="Share"><Send size={24}/></button><button className="push-right" onClick={()=>toggle(savedPosts,setSavedPosts,activePost.id)} aria-label="Save"><Bookmark size={24} fill={savedPosts.includes(activePost.id)?'currentColor':'none'}/></button></div><div className="post-copy"><strong>{(activePost.likes+(liked.includes(activePost.id)?1:0)).toLocaleString('en-US')} {t('likesWord')}</strong><p><b>{activePost.username}</b> {activePost.caption}</p><button className="comment-link" onClick={()=>openComments(activePost)}>{t('viewAll')} {(activePost.comments||[]).length} {t('commentsWord')}</button><span className="post-time">{activePost.time}</span></div></article>:<>{activePost&&<button className="task-image-button" onClick={()=>openPost(activePost)}><img src={imagePath(activePost.media)} alt={activePost.imageAlt}/><span><Maximize2 size={16}/> {t('enlargeEvidence')}</span></button>}{activePost&&<div className="task-post-caption"><b>{activePost.username}</b> {activePost.caption}</div>}</>}
    {activeTask.type==='news' ? <>
      <div className="feed-help-row">
        <button
          type="button"
          className="feed-help-icon-button"
          onClick={() => setShowHintNote(v => !v)}
          aria-expanded={showHintNote}
          aria-label={lang === 'de' ? 'Informationen zu den Tipps' : 'Information about hints'}
          title={lang === 'de' ? 'Informationen zu den Tipps' : 'Information about hints'}
        >
          <span className="help-button-emoji" aria-hidden="true">ℹ️</span>
          <span>{lang === 'de' ? 'Info' : 'Info'}</span>
        </button>
        <div className="feed-help-wrap">
          <audio
            ref={feedHelpAudioRef}
            src={imagePath(`assets/hilfe_${lang}.mp3`)}
            preload="auto"
            playsInline
            key={`feedhelp-${lang}`}
            onPlay={() => setFeedHelpSpeaking(true)}
            onPause={() => setFeedHelpSpeaking(false)}
            onEnded={() => setFeedHelpSpeaking(false)}
          />
          <button
            type="button"
            className={`feed-help-icon-button ${feedHelpListening ? 'is-listening' : ''}`}
            onClick={speechRecognitionSupported ? (feedHelpListening ? stopFeedHelpListening : activateFeedHelpListening) : startFeedHelpAudio}
            aria-label={lang === 'de' ? 'Iris Hilfe' : 'Iris help'}
            title={lang === 'de' ? 'Iris Hilfe' : 'Iris help'}
          >
            <span className="help-button-emoji" aria-hidden="true">❓</span>
            <span>{lang === 'de' ? 'Hilfe' : 'Help'}</span>
          </button>
          {feedHelpSpeaking && (
            <button
              type="button"
              className="demo-skip"
              onClick={() => { const a = feedHelpAudioRef.current; if (a) { a.pause(); a.currentTime = 0; } setFeedHelpSpeaking(false); }}
            >
              {lang === 'de' ? 'Iris stoppen' : 'Stop Iris'}
            </button>
          )}
        </div>
      </div>
        {showHintNote && (
          <p className="hint-info-note">
            {lang === 'de'
              ? 'Beachte: Bei den ersten drei Überprüfungen kannst du die Tipps unbegrenzt nutzen. Danach stehen dir für das gesamte restliche Spiel nur noch fünf Tipps zur Verfügung.'
              : 'Please note: During the first three reviews, you can use hints without limitation. After that, only five hints are available for the entire remainder of the game.'}
          </p>
        )}
        {feedHelpError && <p role="alert" className="feed-help-error">{feedHelpError}</p>}
<div className="analysis-tools">
  {ANALYSIS_TOOLS.map((tool) => {
    const Icon = tool.icon;
    const used = usedTools.includes(tool.id);
    const open = openTool === tool.id;
    const sourceAvailable = activePost?.sourceCheck?.available;
    return (
      <div className={`analysis-tool-card ${used ? "used" : ""} ${open ? "open" : ""}`} key={tool.id}>
        <button type="button" className="analysis-tool-toggle" onClick={() => useAnalysisTool(tool.id)}>
          <span className="analysis-tool-title"><Icon size={19} />{t(`tool_${tool.id}`)}{tool.id==='source'&&!sourceAvailable&&<small className="tool-availability">kein Link</small>}{used && <CheckCircle2 size={18} />}</span>
          <span className="accordion-symbol">{open?'−':'+'}</span>
        </button>
        {open && <div className="analysis-tool-content">
          {tool.id === "source" ? <SourceCheckPanel data={activePost?.sourceCheck} hintMode={hintMode} hintRevealed={revealedHints.includes('source')} onUseHint={()=>useHint('source')} hintButtonLabel={hintButtonLabel} t={t} />
          : tool.id === "image" ? <HotspotImage src={imagePath(activePost.media)} alt={activePost.imageAlt} config={IMAGE_HOTSPOTS[activePost?.id] || { inspectionOnly:true }} hintMode={hintMode} hintRevealed={revealedHints.includes('image')} onUseHint={()=>useHint('image')} hintButtonLabel={hintButtonLabel} t={t} />
          : tool.id === "profile" ? <ProfileCheckPanel profile={profileMap[activePost?.profileId]} hintMode={hintMode} hintRevealed={revealedHints.includes('profile')} onUseHint={()=>useHint('profile')} hintButtonLabel={hintButtonLabel} t={t} />
          : tool.id === "origin" ? <OriginCheckPanel data={activePost?.imageOriginCheck} hintMode={hintMode} hintRevealed={revealedHints.includes('origin')} onUseHint={()=>useHint('origin')} hintButtonLabel={hintButtonLabel} t={t} />
          : <small>{t('noInfoCheck')}</small>}
        </div>}
      </div>
    );
  })}
</div>
      <p className="verdict-question"><strong>{lang==='de' ? 'Was ist dein Urteil? Ist dieser Feed echt, suspekt oder manipuliert?' : "What's your verdict? Is this feed real, suspicious or manipulated?"}</strong></p>
      <div className="verdict-options">
        <button
          type="button"
          className={verdict==='echt'?'selected':''}
          aria-pressed={verdict==='echt'}
          onClick={()=>{setVerdict('echt');if(feedback?.validation)setFeedback(null);}}
        >
          <BadgeCheck className="verdict-asset" aria-hidden="true"/>
          <span>{t('verdictEcht')}</span>
        </button>
        <button
          type="button"
          className={verdict==='manipuliert'?'selected':''}
          aria-pressed={verdict==='manipuliert'}
          onClick={()=>{setVerdict('manipuliert');if(feedback?.validation)setFeedback(null);}}
        >
          <ScanLine className="verdict-asset" aria-hidden="true"/>
          <span>{t('verdictManipuliert')}</span>
        </button>
        <button
          type="button"
          className={verdict==='suspekt'?'selected':''}
          aria-pressed={verdict==='suspekt'}
          onClick={()=>{setVerdict('suspekt');if(feedback?.validation)setFeedback(null);}}
        >
          <TriangleAlert className="verdict-asset" aria-hidden="true"/>
          <span>{t('verdictSuspekt')}</span>
        </button>
      </div>
      <div className="analysis-input-block"><label htmlFor="analysis-answer">{t('yourJustification')}</label><textarea id="analysis-answer" value={reason} onChange={e=>{setReason(e.target.value);if(feedback?.validation)setFeedback(null);}} placeholder={activeTask.answerPrompt||t('explainEvidence')}/></div>
      {!feedback&&<div className="confidence-control"><label>{t('confidenceRating')} <strong>{confidence}/5</strong></label><input type="range" min="1" max="5" value={confidence} onChange={e=>setConfidence(Number(e.target.value))}/></div>}
      {feedback&&<div className={`feedback ${feedback.validation?'warning':feedback.correct?'correct':'wrong'}`}>{feedback.validation?<p>{feedback.text}</p>:<><strong>{feedback.delta>0?'+':''}{feedback.delta} {t('pointsWord3')}</strong><div className="feedback-scoreline"><span className={feedback.verdictCorrect?'ok':'no'}>{feedback.verdictCorrect?'✓':'✗'} {t('verdictWord')}</span><span className={feedback.reasonMatched?'ok':'no'}>{feedback.reasonMatched?'✓':'✗'} {t('reasonWord')}</span></div>{feedback.expired&&<p>{t('timeUp')}</p>}{!feedback.verdictCorrect&&!feedback.expired&&<p>{t('correctAssessmentWas')} {feedback.correctVerdictLabel}.</p>}{feedback.yourReason&&<div className="reason-compare"><div><b>{t('yourReasonLabel')}</b><p>{feedback.yourReason}</p></div><div><b>{t('actualReasonLabel')}</b><p>{feedback.actualReason}</p></div></div>}</>}</div>}
      {!feedback||feedback.validation?<button className="primary" disabled={evaluating} onClick={()=>submitTask(false)}>{evaluating?t('evaluating'):t('checkAnswer')}</button>:<button className="primary" onClick={closeTask}>{t('continueWord')}</button>}
    </> : <>
      <p className="instruction">{activeTask.instruction}</p>{activeTask.answerMode!=='openAnalysis'&&<div className="options">{(activeTask.options||[]).map(o=>{const selected=selectedAnswers.includes(o.id);return <label className={selected?'selected':''} key={o.id}><input type={activeTask.answerMode==='multipleChoice'?'checkbox':'radio'} name="answer" checked={selected} onChange={()=>toggleAnswer(o.id)}/><span>{o.text}</span></label>})}</div>}{(activeTask.answerMode==='openAnalysis'||activeTask.answerMode==='singleChoiceWithReason')&&<div className="analysis-input-block"><label htmlFor="analysis-answer">{t('yourAnalysis')}</label><textarea id="analysis-answer" value={reason} onChange={e=>{setReason(e.target.value);if(feedback?.validation)setFeedback(null);}} placeholder={activeTask.answerPrompt||activeTask.reasonPrompt||t('typeAnalysis')}/>{activeTask.answerMode==='openAnalysis'&&<small>{t('shortAnswerHint')}</small>}</div>}{!feedback&&<div className="confidence-control"><label>{t('confidenceRating')} <strong>{confidence}/5</strong></label><input type="range" min="1" max="5" value={confidence} onChange={e=>setConfidence(Number(e.target.value))}/></div>}{feedback&&<div className={`feedback ${feedback.validation?'warning':feedback.correct?'correct':'wrong'}`}>{feedback.validation?<p>{feedback.text}</p>:<><strong>{feedback.delta>0?'+':''}{feedback.delta} {t('pointsWord3')}</strong><div className="feedback-scoreline"><span className={feedback.verdictCorrect?'ok':'no'}>{feedback.verdictCorrect?'✓':'✗'} {t('verdictWord')}</span><span className={feedback.reasonMatched?'ok':'no'}>{feedback.reasonMatched?'✓':'✗'} {t('reasonWord')}</span></div>{feedback.expired&&<p>{t('timeUp')}</p>}{!feedback.verdictCorrect&&!feedback.expired&&<p>{t('correctAssessmentWas')} {feedback.correctVerdictLabel}.</p>}{feedback.yourReason&&<div className="reason-compare"><div><b>{t('yourReasonLabel')}</b><p>{feedback.yourReason}</p></div><div><b>{t('actualReasonLabel')}</b><p>{feedback.actualReason}</p></div></div>}</>}</div>}{!feedback||feedback.validation?<button className="primary" disabled={evaluating} onClick={()=>submitTask(false)}>{evaluating?t('evaluating'):t('checkAnswer')}</button>:<button className="primary" onClick={closeTask}>{t('continueWord')}</button>}
    </>}</section></div>}
  </div>;
}
