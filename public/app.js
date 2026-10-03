const sessionId = Math.random().toString(36).slice(2);

const chat = document.getElementById('chat');
const micBtn = document.getElementById('mic-btn');
const sendBtn = document.getElementById('send-btn');
const textInput = document.getElementById('text-input');
const recordingIndicator = document.getElementById('recording-indicator');
const modelStatus = document.getElementById('model-status');
const voiceStatus = document.getElementById('voice-status');

let mediaRecorder = null;
let chunks = [];
let recording = false;

function addBubble(who, text) {
  const bubble = document.createElement('div');
  bubble.className = `bubble ${who === 'You' ? 'student' : 'tutor'}`;
  bubble.innerHTML = `<div class="bubble__who">${who}</div><div class="bubble__text"></div>`;
  bubble.querySelector('.bubble__text').textContent = text;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
  return bubble;
}

function setStatus() {
  fetch('/api/status')
    .then((r) => r.json())
    .then((s) => {
      modelStatus.textContent = `model: ${s.model}`;
      voiceStatus.textContent = `voice: ${s.voice}`;
      voiceStatus.classList.toggle('off', s.voice !== 'enabled');
    })
    .catch(() => {
      modelStatus.textContent = 'model: unreachable';
    });
}

async function sendAudio(blob) {
  const form = new FormData();
  form.append('audio', blob, 'recording.webm');
  form.append('sessionId', sessionId);
  return send(form);
}

async function sendText(text) {
  const form = new FormData();
  form.append('text', text);
  form.append('sessionId', sessionId);
  return send(form);
}

async function send(form) {
  const res = await fetch('/api/chat', { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

async function handleReply(data) {
  addBubble('Tutor', data.reply);
  if (data.audioBase64) {
    const audio = new Audio('data:audio/mpeg;base64,' + data.audioBase64);
    audio.play();
  }
}

micBtn.addEventListener('click', async () => {
  if (recording) {
    mediaRecorder.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      recording = false;
      micBtn.classList.remove('recording');
      recordingIndicator.classList.add('hidden');
      const blob = new Blob(chunks, { type: 'audio/webm' });
      if (blob.size < 1000) return;
      const thinking = addBubble('Tutor', '…');
      try {
        const data = await sendAudio(blob);
        thinking.remove();
        addBubble('You', data.transcript);
        await handleReply(data);
      } catch (err) {
        thinking.remove();
        addBubble('Tutor', `⚠ ${err.message}`);
      }
    };
    mediaRecorder.start();
    recording = true;
    micBtn.classList.add('recording');
    recordingIndicator.classList.remove('hidden');
  } catch {
    addBubble('Tutor', '⚠ Microphone blocked — type your message instead.');
  }
});

sendBtn.addEventListener('click', onTextSend);
textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') onTextSend();
});

async function onTextSend() {
  const text = textInput.value.trim();
  if (!text) return;
  textInput.value = '';
  const thinking = addBubble('Tutor', '…');
  try {
    const data = await sendText(text);
    thinking.remove();
    addBubble('You', text);
    await handleReply(data);
  } catch (err) {
    thinking.remove();
    addBubble('Tutor', `⚠ ${err.message}`);
  }
}

setStatus();