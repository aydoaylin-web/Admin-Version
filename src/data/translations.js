// Übersetzungen der festen Oberflächen-Texte.
// Neue Sprache = einen weiteren Block ergänzen (z. B. fr: {...}) und in LANGUAGES eintragen.

export const LANGUAGES = [
  { code: 'de', label: 'DE' },
  { code: 'en', label: 'EN' },
];

const translations = {
  de: {
    // Navigation
    feed: 'Feed', cases: 'Fälle', agency: 'Agentur', profile: 'Profil',
    
    // Intro
    introEyebrow: 'Digitale Glaubwürdigkeits-Agentur',
    introTitle: 'Willkommen bei AiGram 👋',
    introText: 'Um deine Mission zu starten musst du Iris wecken. Sag dafür laut ins Mikrofon: "Hallo Iris".',
    startMission: 'Mission starten',
    
    // Intro / Demo
    startDemo: 'Kurze Demo starten', skipDemo: 'Demo überspringen', skipWord: 'Überspringen', backWord: 'Zurück', demoOf: 'von',
    introBody: 'Um deine Mission zu erfahren musst du Iris wecken. Sag dafür laut ins Mikrofon: "Hallo Iris".',
    introWinRule: '🏆 Sieg bei 20 Punkten', introLoseRule: '❌ Niederlage bei −10 Punkten',
    demo1Title: 'Guck dir diesen echten App-Post an', demo1Body: 'Vergrößere das Bild. Nutze den Zoom und untersuche, ob Gesichter, Hände, Schrift, Licht oder Hintergründe natürlich wirken.',
    demo2Title: 'Nur bei Posts mit Link', demo2Body: 'Öffne die verlinkte Seite und vergleiche ihren Inhalt mit der Aussage im Post. Manche Seiten sind offiziell, andere unseriös oder der Post übertreibt den Originaltext.', demo2Eyebrow: 'SEHT SELBST', demo2Example: 'Post: „Ab morgen überall hitzefrei!“ – im Artikel steht: nur für eine einzige Schule.',
    demo3Body1: 'Ein verifiziertes Profil bedeutet, dass es geprüft wurde. Dies bedeutet aber nicht automatisch, dass der Beitrag echt ist.', demo3Body2: 'Vergleiche die Profilinformationen deshalb immer mit den anderen Hinweisen.', demo3ProfileAge: 'Profil angelegt: vor 3 Tagen', demo3ProfileResp: 'Verantwortliche Person: nicht erkennbar',
    demo4Title: 'Beiträge des Profils ansehen', demo4Body: 'Sieh dir die sichtbaren Beiträge dieses Profils an und vergleiche sie mit dem aktuellen Beitrag.', demo4Check: 'Prüfe, ob Thema und Darstellung zusammenpassen.',
    demo5Title: 'Entscheiden und handeln', demo5Sub: 'Entwickle deine eigene Strategie', demo5Body: 'In diesem Beispiel ist das Profil zwar verifiziert und eine Quelle ist angegeben. Die Quelle ist jedoch nicht seriös. Vergleiche deshalb immer mehrere Hinweise. In den ersten drei Runden kannst du die Tipps kostenlos nutzen. Danach stehen dir für das gesamte restliche Spiel nur noch fünf Tipps zur Verfügung. Setze sie sorgfältig ein, denn falsche Entscheidungen kosten Punkte.', demo5WinRule: '20 Punkte = gewonnen', demo5LoseRule: '−10 Punkte = verloren',
    
    // Mission-Fortschritt
    missionProgress: 'Missionsfortschritt',
    nextCase: 'Nächster Fall', agencyReview: 'Agentur-Prüfung',
    allCasesReviewed: 'Alle Fälle geprüft', target: 'Ziel', pointsWord: 'Punkte',
    agencyNotification: 'Agentur-Meldung',
    
    // Feed
    forYou: 'Für dich', following: 'Abonniert',
    latestPosts: 'Neueste Beiträge', refresh: 'Aktualisieren',
    open: 'Öffnen', viewAll: 'Alle', commentsWord: 'Kommentare', likesWord: 'Gefällt-mir',
    checkThisPost: 'Diesen Beitrag prüfen',
    checkThisPostText: 'Du entscheidest, ob er vertrauenswürdig oder verdächtig ist.',
    review: 'Prüfen',
    feedReviewCompleted: 'Feed-Prüfung abgeschlossen',
    agencyReviewCompleted: 'Agentur-Prüfung abgeschlossen',
    loadingMore: 'Weitere Beiträge werden geladen…', allCaughtUp: 'Du bist auf dem neuesten Stand',
    
    // Fälle-Tab
    agencyDatabase: 'Agentur-Datenbank', reviewedCases: 'Geprüfte Fälle',
    noCasesYet: 'Noch keine Fälle', reviewedWillAppear: 'Geprüfte Beiträge erscheinen hier.',
    noWrittenResponse: 'Keine schriftliche Antwort erfasst.',
    
    // Agentur-Tab
    agencyCenter: 'Agentur-Zentrale', digitalCredibility: 'Digitale Glaubwürdigkeit',
    credibilityPoints: 'Glaubwürdigkeitspunkte', completedTasks: 'Abgeschlossene Aufgaben',
    realityDefenseRules: 'Reality-Defense-Regeln', noRulesYet: 'Es wurden noch keine Schutzregeln erstellt.',
    contentPack: 'Inhaltspaket', version: 'Version',
    postsWord: 'Beiträge', tasksWord: 'Aufgaben', profilesWord: 'Profile', guidesWord: 'Leitfäden',
    validatedAuto: 'Wird beim Start automatisch geprüft.',
    researchMode: 'Forschungsmodus',
    researchText: 'Anonyme Interaktionsdaten werden lokal auf diesem Gerät gespeichert, bis du sie exportierst oder löschst.',
    participantCode: 'Teilnehmer-Code', loggedEvents: 'Erfasste Ereignisse',
    evaluationApi: 'Auswertungs-API', online: 'Online', offline: 'Offline',
    localAi: 'Lokale KI', ready: 'Bereit', optional: 'Optional',
    exportJson: 'JSON exportieren', exportCsv: 'CSV exportieren', deleteLocalData: 'Lokale Daten löschen',
    sessionIdLabel: 'Sitzungs-ID', startNewRun: 'Neuen zufälligen Durchlauf starten',
    
    // Profil-Tab
    agencyTeam: 'Agentur-Team', profileBio: 'Überwacht die Informationsintegrität auf AiGram.',
    pointsWord2: 'Punkte', casesWord: 'Fälle', rulesWord: 'Regeln',
    
    // Kommentare
    comments: 'Kommentare', addComment: 'Kommentar hinzufügen…', post: 'Senden', reply: 'Antworten',
    
    // Run-Zusammenfassung
    runComplete: 'Durchlauf abgeschlossen', missionAccomplished: 'Agentur-Mission erfüllt',
    missionReviewed: 'Mission geprüft',
    youFinished: 'Du hast alle', casesWith: 'Fälle abgeschlossen mit',
    credibilityPointsLower: 'Glaubwürdigkeitspunkten', correct: 'Richtig', needsReview: 'Zu prüfen',
    viewAgencyResults: 'Agentur-Ergebnisse ansehen', startAnotherRun: 'Weiteren zufälligen Durchlauf starten',
    
    // Aufgabe
    // openInvestigation: 'Untersuchung öffnen',
    // chooseYourChecks: 'Wähle deine Prüfungen',
    // allChecksAvailable: 'Alle Analyse-Optionen stehen bereit. Nutze jede Prüfung, die du für sinnvoll hältst, oder entscheide, ohne jedes Werkzeug zu öffnen.',
    // yourAssessment: 'Deine Einschätzung',
    feedReview: 'Feed-Prüfung', 
    trustworthy: 'Vertrauenswürdig', suspicious: 'Verdächtig',
    verdictEcht: 'Echt', verdictManipuliert: 'Manipuliert', verdictSuspekt: 'Suspekt – weitere Recherche notwendig', correctAssessmentWas: 'Richtige Einschätzung wäre gewesen:', guessHint: 'Richtige Einschätzung – aber unbelegt. Öffne das passende Prüfwerkzeug und benenne den konkreten Hinweis.', sharpenReason: 'Tipp: Benenne den konkreten Hinweis noch genauer.', luckyGuess: 'Geraten', timeUp: 'Zeit abgelaufen.', pushTitle_news: 'Neuer gemeldeter Beitrag', pushText_news: 'Ein möglicherweise manipulierter Beitrag wurde zur Prüfung gemeldet.', pushTitle_liveCheck: 'Dringende Live-Prüfung', pushText_liveCheck: 'Ein viraler Beitrag muss schnell untersucht werden.', pushTitle_perspective: 'Wirkungsanalyse erforderlich', pushText_perspective: 'Untersuche die mögliche Absicht hinter dem Beitrag.', pushTitle_realityDefense: 'Schutzstrategie erforderlich', pushText_realityDefense: 'Entwickle eine Regel zum Schutz vor ähnlichen Fällen.',
    yourJustification: 'Deine Begründung', explainEvidence: 'Erkläre die Belege für deine Entscheidung.',
    shortAnswerHint: 'Ein passendes Wort, ein Ausdruck oder ein kurzer Satz reichen aus.',
    confidenceRating: 'Sicherheit', notCorrect: 'Nicht richtig', pointsWord3: 'Punkte',
    checkAnswer: 'Antwort prüfen', evaluating: 'Wird ausgewertet…', continueWord: 'Weiter',
    yourAnalysis: 'Deine Analyse', typeAnalysis: 'Gib deine Analyse ein',
    enlargeEvidence: 'Beweis vergrößern',
    noInfoCheck: 'Für diese Prüfung liegen keine weiteren Informationen vor.',
    
    // Werkzeug-Namen
    tool_image: 'Bildanalyse', tool_source: 'Quellenprüfung', tool_profile: 'Profilprüfung', tool_activities: 'Aktivitäten',
    previousActivities: 'Bisherige Aktivitäten', profileActivities: 'Beiträge dieses Profils', currentPost: 'Aktueller Beitrag', noPreviousActivities: 'Keine früheren Beiträge dieses Profils verfügbar.', tip: 'Tipp', whyImportant: 'Warum ist das wichtig?', collapseTip: 'Tipp zuklappen', activitiesHintQuestion: 'Passen die bisherigen Beiträge des Profils zum aktuellen Beitrag?', activitiesHintWhy: 'Die bisherigen Aktivitäten zeigen, welche Themen und Inhalte das Profil normalerweise veröffentlicht. Vergleiche sie deshalb mit dem aktuellen Beitrag.',
    
    // Analyse-Werkzeuge: Tipps
    hintShowFree: 'Tipp anzeigen', hintUse: 'Tipp einsetzen', hintLeft: 'übrig', hintNoneLeft: 'Keine Tipps mehr verfügbar', hintShowDefault: 'Tipp anzeigen',
    hintStatusFree: 'Die Tipps sind in den ersten drei Runden kostenlos.',
    hintStatusLeftPrefix: 'Noch', hintStatusLeftSuffix: 'von 5 Tipps verfügbar.', hintStatusEmpty: 'Alle 5 Tipps wurden eingesetzt.',
    hintInfoNote: 'Beachte. Bei den ersten drei Überprüfungen kannst du die Tipps unbegrenzt nutzen. Danach stehen dir für das gesamte restliche Spiel nur noch sechs Tipps zur Verfügung.',
    verdictQuestion: 'Was ist dein Urteil?',

    
    // Bildanalyse
    zoomOut: 'Verkleinern', zoomIn: 'Vergrößern', resetView: 'Zurücksetzen', zoomHelp: 'Doppeltippen oder doppelklicken zum Zoomen. Im vergrößerten Bild kannst du es mit Maus oder Finger verschieben.', coordHelper: 'Koordinaten-Helfer aktiv.',
    imgAnomaliesFound: 'Auffälligkeiten gefunden.', imgMiss: 'Dort wurde keine hinterlegte Auffälligkeit gefunden. Schau dir einen anderen Bereich an oder nutze den Tipp.', imgTipQ: 'Wirken Gesichter, Hände, Schrift, Licht oder Hintergründe natürlich?', imgTipWhy1: 'Ein manipuliertes Bild kann kleine visuelle Auffälligkeiten enthalten. Wenn einzelne Bereiche unnatürlich oder fehlerhaft aussehen, solltest du den Beitrag genauer prüfen.', imgTipWhy2: 'Ein unauffälliges Bild bedeutet jedoch nicht automatisch, dass der Beitrag echt ist.', imgShowResult: 'Auswertung anzeigen', imgAllFound: 'Alle Auffälligkeiten gefunden', imgResultTitle: 'Auswertung der Bildprüfung', imgFoundLabel: 'Gefunden:', imgMissedLabel: 'Übersehen:',
    
    // Quellenprüfung
    srcTipQ: 'Ist erkennbar, wer für den Inhalt dieser Quelle verantwortlich ist?', srcTipWhy: 'Eine angegebene Quelle ist nicht automatisch seriös. Prüfe, wer verantwortlich ist, ob es ein offizielles Medium ist und ob der Inhalt der Seite wirklich zur Aussage im Post passt.', srcNoneTitle: 'Keine verlinkte Seite', srcNoneBody: 'Dieser Post enthält keinen Link. Das ist bei privaten Accounts normal, bei News-Accounts aber auffälliger.', srcEyebrow: 'QUELLENPRÜFUNG', srcLess: 'Weniger anzeigen', srcPreview: 'Seite kurz ansehen', srcPostType: 'Beitrag', srcResponsible: 'Verantwortlich', srcPublished: 'Veröffentlicht',
    
    // Profilprüfung
    profTipQ: 'Ist das Profil verifiziert?', profNone: 'Für dieses Profil sind keine weiteren Angaben verfügbar.', profUnreachable: 'Profil nicht erreichbar', profPartial: 'Ältere Profildaten sind nur teilweise verfügbar.', profPosts: 'Beiträge', profFollowers: 'Follower', profFollowing: 'Folgt', profType: 'Profiltyp', profCreated: 'Profil angelegt', profVisibility: 'Sichtbarkeit', profVerification: 'Verifizierung',
    
    // Aktivitäten
    actRecentComments: 'Letzte Kommentare von', actHistoryExplainer: 'Diese Historie zeigt die letzten vier Kommentare, die der Account selbst unter anderen Beiträgen geschrieben hat.', actNoHistory: 'Für diesen Account ist noch keine Kommentarhistorie vorhanden.',
    
    // Gemeinsame Fallback-Werte
    notIdentifiable: 'Nicht erkennbar', notProvided: 'Nicht angegeben', notVisible: 'Nicht sichtbar',
    
    // Validierung
    
    // Bildherkunft / Lens + 2-Punkte-Feedback,     
    //Das beweist aber nicht, dass der Beitrag nciht echt ist.',
    tool_origin: 'Bildherkunft',
    originEyebrow: 'BILDHERKUNFT', originIntro: 'Online Bildsuche: Wo ist dieses Bild schon einmal aufgetaucht?',
    originHitsLabel: 'Frühere Fundstellen', originNoneTitle: 'Keine früheren Fundstellen',
    originNoneBody: 'Die Online Bildsuche findet dieses Bild sonst nirgends.', 
    
    lensTipQ: 'Gab es das Bild schon von früher – und passt das dann überhaupt zu dem, was hier behauptet wird?',
    lensTipWhy1: 'Ein echtes Bild kann von ganz woanders kommen. Wenn es von einem anderen Ereignis oder aus einem anderen Jahr ist, beweist es diese Story hier nicht.',
    lensTipWhy2: 'Findet die Suche nichts, heißt das trotzdem nicht, dass der Beitrag nicht echt ist.',
    verdictWord: 'Einschätzung', reasonWord: 'Begründung', yourReasonLabel: 'Dein Grund', actualReasonLabel: 'Der eigentliche Grund',
    valChooseVerdict: 'Was ist deine Einschätzung?: Echt, Manipuliert oder Suspekt.',
    valSelectAnswer: 'Wähle mindestens eine Antwort.',
    valTypeClue: 'Bitte nenne den Hinweis, die Wirkung oder die Regel, die du erkannt hast.',
    evalMoreSpecific: 'Bitte formuliere deine Antwort etwas genauer und benenne den Hinweis, die Wirkung oder die Regel.',
  },
  en: {
    feed: 'Feed', cases: 'Cases', agency: 'Agency', profile: 'Profile',
    introEyebrow: 'Digital Credibility Agency',
    introTitle: 'Welcome to AiGram 👋',
    introBody: 'To get to know your mission, you must wake up Iris. Say therefore loud in your microphone  "Hello Iris".',
    startMission: 'Start Mission',
    startDemo: 'Start quick demo', skipDemo: 'Skip demo', skipWord: 'Skip', backWord: 'Back', demoOf: 'of',
    introText: 'To get started, listen to the short introduction by tapping the playbutton ▶️.',
    introWinRule: '🏆 Win at 20 points', introLoseRule: '❌ Loss at −10 points',
    demo1Title: 'Look at this real in-app post', demo1Body: 'Enlarge the image. Use the zoom and check whether faces, hands, text, lighting or backgrounds look natural.',
    demo2Title: 'Only for posts with a link', demo2Body: 'Open the linked page and compare its content with the claim in the post. Some pages are official, others dubious, or the post exaggerates the original text.', demo2Eyebrow: 'SEE FOR YOURSELF', demo2Example: 'Post: “From tomorrow, school’s out everywhere!” – the article says: only for a single school.',
    demo3Body1: 'A verified profile means it has been checked. But that does not automatically mean the post is real.', demo3Body2: 'So always compare the profile information with the other clues.', demo3ProfileAge: 'Profile created: 3 days ago', demo3ProfileResp: 'Responsible person: not identifiable',
    demo4Title: 'View the profile’s posts', demo4Body: 'Look at this profile’s visible posts and compare them with the current post.', demo4Check: 'Check whether the topic and presentation match.',
    demo5Title: 'Decide and act', demo5Sub: 'Develop your own strategy', demo5Body: 'In this example the profile is verified and a source is given. However, the source is not reputable. So always compare several clues. In the first three rounds you can use the tips for free. After that, only five tips are available for the rest of the game. Use them carefully, because wrong decisions cost points.', demo5WinRule: '20 points = win', demo5LoseRule: '−10 points = loss',
    missionProgress: 'Mission progress',
    nextCase: 'Next case', agencyReview: 'Agency review',
    allCasesReviewed: 'All cases reviewed', target: 'Target', pointsWord: 'points',
    agencyNotification: 'Agency notification',
    forYou: 'For You', following: 'Following',
    latestPosts: 'Latest posts', refresh: 'Refresh',
    open: 'Open', viewAll: 'View all', commentsWord: 'comments', likesWord: 'likes',
    checkThisPost: 'Check this post',
    checkThisPostText: 'You decide whether it is trustworthy or suspicious.',
    review: 'Review',
    feedReviewCompleted: 'Feed review completed',
    agencyReviewCompleted: 'Agency review completed',
    loadingMore: 'Loading more posts…', allCaughtUp: 'You are all caught up',
    agencyDatabase: 'Agency Database', reviewedCases: 'Reviewed Cases',
    noCasesYet: 'No cases yet', reviewedWillAppear: 'Reviewed posts will appear here.',
    noWrittenResponse: 'No written response recorded.',
    agencyCenter: 'Agency Center', digitalCredibility: 'Digital Credibility',
    credibilityPoints: 'Credibility Points', completedTasks: 'Completed Tasks',
    realityDefenseRules: 'Reality Defense Rules', noRulesYet: 'No defense rules have been created yet.',
    contentPack: 'Content Pack', version: 'Version',
    postsWord: 'posts', tasksWord: 'tasks', profilesWord: 'profiles', guidesWord: 'guides',
    validatedAuto: 'Validated automatically when the app starts.',
    researchMode: 'Research Mode',
    researchText: 'Anonymous interaction data are stored locally on this device until you export or delete them.',
    participantCode: 'Participant code', loggedEvents: 'Logged events',
    evaluationApi: 'Evaluation API', online: 'Online', offline: 'Offline',
    localAi: 'Local AI', ready: 'Ready', optional: 'Optional',
    exportJson: 'Export JSON', exportCsv: 'Export CSV', deleteLocalData: 'Delete local data',
    sessionIdLabel: 'Session ID', startNewRun: 'Start a new randomized run',
    agencyTeam: 'Agency Team', profileBio: 'Monitoring information integrity across AiGram.',
    pointsWord2: 'Points', casesWord: 'Cases', rulesWord: 'Rules',
    comments: 'Comments', addComment: 'Add a comment…', post: 'Post', reply: 'Reply',
    runComplete: 'Run complete', missionAccomplished: 'Agency mission accomplished',
    missionReviewed: 'Mission reviewed',
    youFinished: 'You finished all', casesWith: 'cases with',
    credibilityPointsLower: 'credibility points', correct: 'Correct', needsReview: 'Needs review',
    viewAgencyResults: 'View agency results', startAnotherRun: 'Start another randomized run',
    feedReview: 'Feed review', openInvestigation: 'Open investigation',
    chooseYourChecks: 'Choose your own checks', allChecksAvailable: 'All analysis options are available. Use any check you consider useful, or make your decision without opening every tool.',
    yourAssessment: 'Your assessment', decideAndJustify: 'Decide and justify',
    trustworthy: 'Trustworthy', suspicious: 'Suspicious',
    verdictEcht: 'Real', verdictManipuliert: 'Manipulated', verdictIrrefuehrend: 'Misleading', correctAssessmentWas: 'The correct assessment would have been:', guessHint: 'Correct call – but unsupported. Open the right check tool and name the concrete clue.', sharpenReason: 'Tip: name the concrete clue more precisely.', luckyGuess: 'Guessed', timeUp: 'Time is up.', pushTitle_news: 'New reported post', pushText_news: 'A possibly manipulated post has been reported for review.', pushTitle_liveCheck: 'Urgent live check', pushText_liveCheck: 'A viral post needs to be checked quickly.', pushTitle_perspective: 'Impact analysis required', pushText_perspective: 'Investigate the possible intent behind the post.', pushTitle_realityDefense: 'Protection strategy required', pushText_realityDefense: 'Create a rule to guard against similar cases.',
    yourJustification: 'Your justification', explainEvidence: 'Explain the evidence behind your decision.',
    shortAnswerHint: 'A relevant word, phrase, or short sentence can be enough.',
    confidenceRating: 'Confidence rating', notCorrect: 'Not correct', pointsWord3: 'points',
    checkAnswer: 'Check Answer', evaluating: 'Evaluating…', continueWord: 'Continue',
    yourAnalysis: 'Your analysis', typeAnalysis: 'Type your analysis',
    enlargeEvidence: 'Enlarge evidence',
    noInfoCheck: 'No additional information is available for this check.',
    tool_image: 'Image analysis', tool_source: 'Source check', tool_profile: 'Profile check', tool_activities: 'Activities',
    previousActivities: 'Previous activities', profileActivities: 'Posts from this profile', currentPost: 'Current post', noPreviousActivities: 'No earlier posts from this profile are available.', tip: 'Tip', whyImportant: 'Why is this important?', collapseTip: 'Collapse tip', activitiesHintQuestion: 'Do the profile’s earlier posts fit the current post?', activitiesHintWhy: 'Previous activities show which topics and content the profile normally publishes. Compare them with the current post.',
    hintShowFree: 'Show free tip', hintUse: 'Use tip', hintLeft: 'left', hintNoneLeft: 'No tips left', hintShowDefault: 'Show tip',
    hintStatusFree: 'Tips are free in the first three rounds.', hintStatusLeftPrefix: '', hintStatusLeftSuffix: 'of 5 tips remaining.', hintStatusEmpty: 'All 5 tips have been used.',
    hintInfoNote: 'Note: for the first three reviews you can use the tips without limit. After that, only six tips are available for the rest of the game.',
    verdictQuestion: 'What is your verdict?',
    zoomOut: 'Zoom out', zoomIn: 'Zoom in', resetView: 'Reset', zoomHelp: 'Double-tap or double-click to zoom. In the enlarged image you can move it with mouse or finger.', coordHelper: 'Coordinate helper active.',
    imgAnomaliesFound: 'anomalies found.', imgMiss: 'No stored anomaly was found there. Look at a different area or use the tip.', imgTipQ: 'Do faces, hands, text, lighting or backgrounds look natural?', imgTipWhy1: 'A manipulated image can contain small visual anomalies. If individual areas look unnatural or faulty, you should examine the post more closely.', imgTipWhy2: 'However, an inconspicuous image does not automatically mean the post is real.', imgShowResult: 'Show evaluation', imgAllFound: 'All anomalies found', imgResultTitle: 'Image check evaluation', imgFoundLabel: 'Found:', imgMissedLabel: 'Missed:',
    srcTipQ: 'Is it clear who is responsible for the content of this source?', srcTipWhy: 'A cited source is not automatically trustworthy. Check who is responsible and whether the page content really matches the claim in the post.', srcNoneTitle: 'No linked page', srcNoneBody: 'This post contains no link. That is normal for private accounts, but more suspicious for news accounts.', srcEyebrow: 'SOURCE CHECK', srcLess: 'Show less', srcPreview: 'Quick look at the page', srcPostType: 'Post', srcResponsible: 'Responsible', srcPublished: 'Published',
    profTipQ: 'Is the profile verified?', profNone: 'No further details are available for this profile.', profUnreachable: 'Profile not reachable', profPartial: 'Older profile data is only partly available.', profPosts: 'Posts', profFollowers: 'Followers', profFollowing: 'Following', profType: 'Profile type', profCreated: 'Profile created', profVisibility: 'Visibility', profVerification: 'Verification',
    actRecentComments: 'Recent comments from', actHistoryExplainer: 'This history shows the last four comments the account itself wrote under other posts.', actNoHistory: 'No comment history is available for this account yet.',
    notIdentifiable: 'Not identifiable', notProvided: 'Not provided', notVisible: 'Not visible',
    tool_origin: 'Image origin',
    originEyebrow: 'IMAGE ORIGIN', originIntro: 'Reverse search: where has this image appeared before?',
    originHitsLabel: 'Earlier matches', originNoneTitle: 'No earlier matches',
    originNoneBody: 'The reverse search finds this image nowhere else. But that does not prove the post is real.',
    lensTipQ: 'Has this image shown up before — and does that even match what the post claims?',
    lensTipWhy1: 'A real image can be from somewhere totally different. If it is from another event or another year, it does not prove this story.',
    lensTipWhy2: 'And if the search finds nothing, that still does not mean the post is real.',
    verdictWord: 'Assessment', reasonWord: 'Reasoning', yourReasonLabel: 'Your reason', actualReasonLabel: 'The actual reason',
    valChooseVerdict: 'Choose an assessment: Real, Manipulated or Suspicious.',
    valSelectAnswer: 'Select at least one answer.',
    valTypeClue: 'Please type the clue, effect, or rule you identified.',
    verdictSuspekt: 'Suspicious – needs further research',
    evalMoreSpecific: 'Please make your answer more specific by naming the clue, effect, or rule.',
  },
};

export default translations;
