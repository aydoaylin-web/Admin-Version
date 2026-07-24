import express from 'express';

const app = express();
app.use(express.json({ limit: '100kb' }));

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
const LLM_MODEL = process.env.OLLAMA_LLM_MODEL || 'llama3.2:3b';
const ACCEPT_THRESHOLD = Number(process.env.EMBEDDING_ACCEPT_THRESHOLD || 0.72);
const REJECT_THRESHOLD = Number(process.env.EMBEDDING_REJECT_THRESHOLD || 0.48);

function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ruleEvaluation(answer, acceptedWords = [], acceptedPhrases = []) {
  const normalizedAnswer = normalize(answer);
  const words = new Set(normalizedAnswer.split(' ').filter(Boolean));
  const wordMatch = acceptedWords.find((candidate) => {
    const normalizedCandidate = normalize(candidate);
    return normalizedCandidate.includes(' ')
      ? normalizedAnswer.includes(normalizedCandidate)
      : words.has(normalizedCandidate);
  });
  const phraseMatch = acceptedPhrases.find((candidate) => normalizedAnswer.includes(normalize(candidate)));

  if (wordMatch || phraseMatch) {
    return {
      status: 'accepted',
      accepted: true,
      mode: wordMatch ? 'accepted-word' : 'accepted-phrase',
      confidence: 1,
      matchedCriterion: wordMatch || phraseMatch,
      feedback: 'Your answer identifies a relevant aspect of the post.',
    };
  }
  return null;
}

function cosineSimilarity(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) return 0;
  let dot = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;
  for (let index = 0; index < first.length; index += 1) {
    dot += first[index] * second[index];
    firstMagnitude += first[index] ** 2;
    secondMagnitude += second[index] ** 2;
  }
  if (!firstMagnitude || !secondMagnitude) return 0;
  return dot / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude));
}

async function ollamaEmbedding(text) {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
  });
  if (!response.ok) throw new Error(`Ollama embeddings unavailable: ${response.status}`);
  const data = await response.json();
  return data.embedding;
}

async function embeddingEvaluation(answer, referenceAnswers = []) {
  if (!referenceAnswers.length) return null;
  const [answerVector, ...referenceVectors] = await Promise.all([
    ollamaEmbedding(answer),
    ...referenceAnswers.map((reference) => ollamaEmbedding(reference)),
  ]);
  const similarities = referenceVectors.map((vector, index) => ({
    reference: referenceAnswers[index],
    similarity: cosineSimilarity(answerVector, vector),
  }));
  const best = similarities.sort((a, b) => b.similarity - a.similarity)[0];
  if (!best) return null;

  if (best.similarity >= ACCEPT_THRESHOLD) {
    return {
      status: 'accepted',
      accepted: true,
      mode: 'embedding',
      confidence: best.similarity,
      matchedCriterion: best.reference,
      feedback: 'Your answer is semantically consistent with a valid analysis.',
    };
  }
  if (best.similarity <= REJECT_THRESHOLD) {
    return {
      status: 'rejected',
      accepted: false,
      mode: 'embedding',
      confidence: 1 - best.similarity,
      matchedCriterion: null,
      feedback: 'Your answer does not yet identify the relevant manipulation clue or intended effect.',
    };
  }
  return { status: 'unclear', accepted: null, mode: 'embedding', confidence: best.similarity };
}

async function llmEvaluation({ instruction, answer, rubric, referenceAnswers }) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      stream: false,
      format: 'json',
      messages: [
        {
          role: 'system',
          content: 'You assess an anonymous school student answer. Use only the supplied task, rubric, and reference answers. Accept a single relevant word, phrase, or sentence. Do not require grammar or spelling perfection. Return JSON only with status (accepted, rejected, or review), accepted (true, false, or null), feedback (one short constructive sentence), and matchedCriteria (array of strings).',
        },
        {
          role: 'user',
          content: JSON.stringify({ instruction, answer, rubric, referenceAnswers }),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Ollama LLM unavailable: ${response.status}`);
  const data = await response.json();
  const parsed = JSON.parse(data.message?.content || '{}');
  return {
    status: parsed.status || (parsed.accepted === true ? 'accepted' : parsed.accepted === false ? 'rejected' : 'review'),
    accepted: typeof parsed.accepted === 'boolean' ? parsed.accepted : null,
    feedback: parsed.feedback || 'Please make your analysis slightly more specific.',
    matchedCriteria: Array.isArray(parsed.matchedCriteria) ? parsed.matchedCriteria : [],
    mode: 'local-llm',
    confidence: parsed.accepted === null ? 0.5 : 0.8,
  };
}

app.post('/api/evaluate', async (req, res) => {
  const {
    instruction,
    answer,
    acceptedWords = [],
    acceptedPhrases = [],
    referenceAnswers = [],
    rubric = [],
  } = req.body || {};

  if (!instruction || typeof answer !== 'string' || !answer.trim()) {
    return res.status(400).json({ error: 'Invalid evaluation request.' });
  }

  const ruleResult = ruleEvaluation(answer, acceptedWords, acceptedPhrases);
  if (ruleResult) return res.json(ruleResult);

  try {
    const embeddingResult = await embeddingEvaluation(answer, referenceAnswers);
    if (embeddingResult?.status === 'accepted' || embeddingResult?.status === 'rejected') {
      return res.json(embeddingResult);
    }

    const llmResult = await llmEvaluation({ instruction, answer, rubric, referenceAnswers });
    return res.json(llmResult);
  } catch (error) {
    console.warn('Semantic evaluation unavailable, using review fallback:', error.message);
    return res.json({
      status: 'review',
      accepted: null,
      mode: 'rule-fallback',
      confidence: 0,
      feedback: 'Please make your answer more specific by naming the clue, effect, or rule.',
      matchedCriteria: [],
    });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    res.json({ api: 'ok', ollama: response.ok, embeddingModel: EMBEDDING_MODEL, llmModel: LLM_MODEL });
  } catch {
    res.json({ api: 'ok', ollama: false, embeddingModel: EMBEDDING_MODEL, llmModel: LLM_MODEL });
  }
});

app.listen(3001, () => {
  console.log('Evaluation API running at http://localhost:3001');
  console.log(`Optional local AI: Ollama at ${OLLAMA_URL}`);
});
