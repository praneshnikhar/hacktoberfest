require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const elevenlabs = require('./lib/elevenlabs');
const tutor = require('./lib/tutor');

const execFileAsync = promisify(execFile);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const app = express();
app.use(express.json());
app.use(express.static('public'));

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const TARGET_LANGUAGE_CODE = process.env.TARGET_LANGUAGE_CODE || 'spa';

// Convert an audio buffer (webm from the browser) to mp3 for ElevenLabs.
async function toMp3(buffer) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'habla-'));
  const inputPath = path.join(tmp, 'input.webm');
  const outputPath = path.join(tmp, 'output.mp3');
  fs.writeFileSync(inputPath, buffer);
  await execFileAsync('ffmpeg', ['-y', '-i', inputPath, '-ar', '44100', '-b:a', '96k', outputPath]);
  return outputPath;
}

// POST /api/chat — accepts either audio (multipart 'audio') or plain text (JSON {text}).
// Returns { transcript, reply, audioBase64 } where audioBase64 is the spoken reply.
app.post('/api/chat', upload.single('audio'), async (req, res) => {
  try {
    const sessionId = req.body?.sessionId || 'default';
    const history = tutor.getHistory(sessionId);

    let userText = (req.body?.text || '').trim();

    if (req.file) {
      const mp3Path = await toMp3(req.file.buffer);
      userText = await elevenlabs.transcribe(mp3Path, TARGET_LANGUAGE_CODE);
      fs.rmSync(path.dirname(mp3Path), { recursive: true, force: true });
    }

    if (!userText) {
      return res.status(400).json({ error: 'Nothing heard — try again, a little louder.' });
    }

    const reply = await tutor.getTutorReply(history, userText);
    tutor.pushTurn(sessionId, userText, reply);

    let audioBase64 = null;
    if (elevenlabs.isConfigured()) {
      try {
        const mp3 = await elevenlabs.speak(reply, VOICE_ID);
        audioBase64 = mp3.toString('base64');
      } catch (err) {
        console.error('TTS failed (continuing without audio):', err.message);
      }
    }

    res.json({ transcript: userText, reply, audioBase64 });
  } catch (err) {
    console.error('chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Report what the app is running on (shown in the header chips).
app.get('/api/status', (req, res) => {
  res.json({
    model: tutor.MODEL,
    voice: elevenlabs.isConfigured() ? 'enabled' : 'off (add ELEVENLABS_API_KEY)',
  });
});

// Reset a session's conversation memory.
app.post('/api/reset', (req, res) => {
  const sessionId = req.body?.sessionId || 'default';
  tutor.getHistory(sessionId);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Habla Conmigo running on http://localhost:${PORT}`);
  console.log(`Model: ${tutor.MODEL} via Ollama at ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);
  console.log(`Voice: ${elevenlabs.isConfigured() ? 'ElevenLabs enabled' : 'ElevenLabs NOT configured — text mode only'}`);
});