# Deepfake Defender React

> Diese Version enthält den React-Adminbereich unter `#/admin`. Siehe `ADMIN-README.md`.

# Deepfake Defender React

## Start the app

```powershell
npm install
npm run dev
```

`npm run dev` starts both the Vite frontend and the local evaluation API. Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Open-answer evaluation

The app no longer requires answer choices for the analysis tasks. Students may enter one relevant word, a phrase, or a short sentence.

Evaluation uses three stages:

1. Transparent accepted-word and accepted-phrase rules from `public/tasks.json`.
2. Local semantic similarity with Ollama embeddings.
3. A local Ollama LLM only for unclear answers.

The app still works without Ollama. In that case, clear word and phrase matches are accepted, while unclear answers ask the student to be more specific instead of immediately deducting points.

## Optional free local AI with Ollama

Install Ollama separately, then run these commands once:

```powershell
ollama pull nomic-embed-text
ollama pull llama3.2:3b
```

Keep Ollama running while the app is open. No paid API key is required.

Optional environment variables:

```text
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_LLM_MODEL=llama3.2:3b
EMBEDDING_ACCEPT_THRESHOLD=0.72
EMBEDDING_REJECT_THRESHOLD=0.48
```

## Scoring

The points and deductions are read directly from each task in `public/tasks.json` through `pointsCorrect` and `pointsWrong`. Completed tasks cannot award points twice.


## Milestone 2 – Complete Game Mechanics

- Randomized mission order for every new run
- News Card, Live Check, Perspective Shift, and Reality Defense workflows
- Open analysis answers with local rules and optional semantic evaluation
- Exact task-specific point awards and deductions from `tasks.json`
- Follow-up task chains
- No duplicate scoring for completed tasks
- Mission progress and 20-point target
- Case archive with recorded student answers
- Reality Defense rule archive
- End-of-run summary and replay with a new randomized order
