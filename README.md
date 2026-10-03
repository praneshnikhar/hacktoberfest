# Habla Conmigo — a patient voice language tutor, built for a friend

**Hacktoberfest 2026 — Weekend Challenge: Build for a Friend**

A friend is learning a new language. They're embarrassed to practice with real people, apps feel robotic, and tutors cost money. This is a voice conversation partner that lives on their own laptop — powered by an **open-weight model running locally** (Ollama) with **ElevenLabs** giving it a voice.

- 🗣️ Speak into the mic → it hears you, replies out loud, and keeps a real conversation going
- 🧠 No cloud AI: the tutor brain is an open-weight model (Gemma 3 / Llama 3.2) running via Ollama
- 🎯 Tailored to the learner: target language, level, and reason are all config in `.env`
- 💰 Costs nothing to run — your words and your data never leave your machine (except the voice services you opt into)

## How it works

```
Browser mic → webm → ffmpeg → mp3
                                  │
                          ElevenLabs Scribe (STT)
                                  │
                            transcript
                                  │
                    Ollama: Gemma 3 / Llama 3.2 (local, open-weight)
                                  │
                              reply text
                                  │
                     ElevenLabs TTS (multilingual voice)
                                  │
                          audio back to browser
```

Conversation memory lives in-process (last 8 exchanges), so the tutor follows topics across turns.

## Run it

Requirements: Node 20+, [Ollama](https://ollama.com), ffmpeg.

```bash
git clone <your-repo-url>
cd BuildForFriend
npm install
cp .env.example .env        # then edit .env
ollama pull gemma3:4b       # or llama3.2:3b — any chat model works
npm start                   # → http://localhost:3000
```

`.env` options (all optional except the API key if you want voice):

| Variable | Default | Meaning |
|---|---|---|
| `ELEVENLABS_API_KEY` | — | ElevenLabs key (free Creator tier). Without it, the app runs in text mode. |
| `ELEVENLABS_VOICE_ID` | Rachel | Voice used for the tutor. |
| `TARGET_LANGUAGE` | Spanish | Language the friend is learning (display name). |
| `TARGET_LANGUAGE_CODE` | spa | ISO-639-3 code for STT. |
| `LEARNER_LEVEL` | beginner | beginner / intermediate / advanced. |
| `LEARNER_NAME` | my friend | Used in the system prompt. |
| `LEARNER_REASON` | … | Why they're learning — the tutor tailors to it. |
| `TUTOR_PERSONA` | warm, patient… | Personality instructions. |
| `OLLAMA_MODEL` | gemma3:4b | Any model you've pulled. |
| `PORT` | 3000 | Server port. |

## Deploy on Render

The web UI and API can be hosted on Render (free tier) while the model stays local — or point `OLLAMA_URL` at a hosted Ollama instance. Deploy:

1. Push this repo to GitHub
2. Render → New → Web Service → pick the repo
3. Build command: `npm install`, Start command: `npm start`
4. Add the `ELEVENLABS_API_KEY` env var in Render's dashboard
5. Note: `OLLAMA_URL` must point at a reachable Ollama host (e.g., a GPU Droplet, or run the model locally and use the app from `localhost`)

## Why open innovation matters here

- **The tutor brain is a local open-weight model.** A closed API would send every spoken sentence of a nervous language learner to a third-party server, and would bill per message. Here the conversation runs entirely on the friend's own hardware — free, private, offline-capable.
- **Swap any model.** Because it's Ollama, we can swap Gemma for Llama for Qwen in one line — no provider lock-in. A closed model can't be swapped or fine-tuned.
- **The voice layer is optional.** Everything except voice is 100% local; the app degrades gracefully to text mode if the voice key is removed. Open + local first, closed + cloud only where it adds real value.

## Categories entered

- **ElevenLabs** — open-source agent given a voice: Scribe STT + multilingual TTS drive the conversation loop
- **Gemma** — Gemma 3 (open-weight) runs locally as the tutor brain via Ollama
- **Render** — deployable via the included `render.yaml` / one-click web service

## License

MIT