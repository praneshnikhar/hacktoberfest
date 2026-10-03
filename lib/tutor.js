const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';

const LANGUAGE = process.env.TARGET_LANGUAGE || 'Spanish';
const LEARNER_LEVEL = process.env.LEARNER_LEVEL || 'beginner';
const LEARNER_NAME = process.env.LEARNER_NAME || 'my friend';
const LEARNER_REASON = process.env.LEARNER_REASON || 'conversations with a partner\'s family';
const TUTOR_PERSONA = process.env.TUTOR_PERSONA || 'warm, patient, encouraging — like a good friend who happens to be a great teacher';
const MAX_HISTORY_TURNS = 8;

const SYSTEM_PROMPT = `You are ${LEARNER_NAME}'s private ${LANGUAGE} tutor. Persona: ${TUTOR_PERSONA}.

Your student is learning ${LANGUAGE} at a ${LEARNER_LEVEL} level because ${LEARNER_REASON}.

Rules:
- ALWAYS reply in ${LANGUAGE}, unless the student is completely stuck — then you may give a one-line hint in English.
- If the student speaks English (or mixes English in), still reply in ${LANGUAGE}, but you may switch to English for up to one short sentence when they ask for help or say they are stuck.
- Keep replies SHORT: 1-3 sentences. You are a conversation partner, not a lecture.
- After every reply, ask one simple follow-up question to keep the conversation going.
- If the student makes a mistake, gently correct it by repeating the corrected sentence once, then continue the conversation naturally.
- Use simple vocabulary and short sentences appropriate for a ${LEARNER_LEVEL} learner.
- Never give a full grammar lesson. One correction at a time.
- Stay in character: you are practicing a real conversation with them.`;

function buildMessages(history) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const turn of history) {
    messages.push({ role: 'user', content: turn.user });
    messages.push({ role: 'assistant', content: turn.assistant });
  }
  return messages;
}

// Ask the local open-weight model to reply to the student's latest message.
async function getTutorReply(history, userText) {
  const messages = buildMessages(history);
  messages.push({ role: 'user', content: userText });
  let res;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages, stream: false }),
    });
  } catch {
    throw new Error(
      "This hosted demo can't reach the local model. Run it on your own laptop (npm start) for the full voice experience — the tutor brain lives in your machine."
    );
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.message?.content || '').trim();
}

// Per-session conversation memory, capped at the last MAX_HISTORY_TURNS exchanges.
const sessions = new Map();

function pushTurn(sessionId, user, assistant) {
  let history = sessions.get(sessionId) || [];
  history.push({ user, assistant });
  if (history.length > MAX_HISTORY_TURNS) {
    history = history.slice(history.length - MAX_HISTORY_TURNS);
  }
  sessions.set(sessionId, history);
  return history;
}

function getHistory(sessionId) {
  return sessions.get(sessionId) || [];
}

module.exports = { getTutorReply, pushTurn, getHistory, MODEL };