let japaneseVoice = null;

function findJapaneseVoice() {
    if (japaneseVoice) return japaneseVoice;
    const voices = speechSynthesis.getVoices();
    japaneseVoice = voices.find(v => v.lang === 'ja-JP') ||
                    voices.find(v => v.lang.startsWith('ja')) ||
                    null;
    return japaneseVoice;
}

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = findJapaneseVoice;
}

export function speak(text, rate = 0.9) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;
    utterance.pitch = 1;
    const voice = findJapaneseVoice();
    if (voice) utterance.voice = voice;
    speechSynthesis.speak(utterance);
}

export function speakSlow(text) {
    speak(text, 0.6);
}

export function stopSpeech() {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
}

let recognition = null;
let onResultCallback = null;

export function startListening(callback) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        callback({ error: 'not-supported', text: '' });
        return;
    }

    onResultCallback = callback;
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;

    let gotResult = false;

    recognition.onresult = (event) => {
        gotResult = true;
        const results = [];
        for (let i = 0; i < event.results[0].length; i++) {
            results.push({
                text: event.results[0][i].transcript,
                confidence: event.results[0][i].confidence,
            });
        }
        if (onResultCallback) onResultCallback({ error: null, results });
    };

    recognition.onerror = (event) => {
        gotResult = true;
        if (onResultCallback) onResultCallback({ error: event.error, results: [] });
    };

    recognition.onend = () => {
        if (!gotResult && onResultCallback) {
            onResultCallback({ error: 'no-speech', results: [] });
        }
        recognition = null;
    };

    try {
        recognition.start();
    } catch (e) {
        callback({ error: 'start-failed', results: [] });
    }
}

export function stopListening() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
}

export function isSpeechSupported() {
    return 'speechSynthesis' in window;
}

export function isRecognitionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
