const fs = require('fs');

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';
const STT_MODEL = process.env.ELEVENLABS_STT_MODEL || 'scribe_v2';
const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2';

function apiKey() {
  return process.env.ELEVENLABS_API_KEY || '';
}

// Transcribe an audio file (mp3 path) to text using ElevenLabs Scribe.
// languageCode: pass an ISO-639-3 code to pin the language, or leave empty
// for auto-detection (lets an English-speaking tester speak freely).
async function transcribe(audioPath, languageCode) {
  const form = new FormData();
  form.append('model_id', STT_MODEL);
  if (languageCode) form.append('language_code', languageCode);
  form.append(
    'file',
    new Blob([fs.readFileSync(audioPath)], { type: 'audio/mpeg' }),
    'input.mp3'
  );

  const res = await fetch(`${ELEVENLABS_API_URL}/v1/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey() },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs STT failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.text || '').trim();
}

// Turn text into speech (mp3 buffer) with ElevenLabs.
async function speak(text, voiceId) {
  const res = await fetch(`${ELEVENLABS_API_URL}/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey(),
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: TTS_MODEL,
      voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.3 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function isConfigured() {
  return Boolean(apiKey());
}

module.exports = { transcribe, speak, isConfigured };