import { Store } from './store.js';
import { speak, startListening, stopListening, isRecognitionSupported } from './speech.js';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_KEY = '';

const SYSTEM_PROMPT = `あなたは優しい日本語の先生です。生徒は台湾人のビジネスパーソンで、日本語初中級レベル（N4〜N3）です。

ルール：
1. 日本語で話しかけてください。難しい漢字にはふりがなを（）で付けてください。
2. 生徒が間違えたら、まず正しい文を示し、なぜ間違いかを中国語（繁體中文）で簡潔に説明してください。
3. 生徒が中国語で書いても構いません。その場合は日本語でどう言うかを教えてください。
4. 会話は自然に続けてください。一度に長すぎる説明はしないでください（3文以内）。
5. ビジネス日本語（敬語、メール、会議、電話対応）を中心に教えてください。
6. 時々、生徒に質問を投げかけて練習させてください。
7. 生徒のレベルに合わせて、徐々に難易度を上げてください。

最初のメッセージ: 簡単に自己紹介をして、生徒に今日何を練習したいか聞いてください。`;

let chatHistory = [];
let isLoading = false;
let isRecording = false;
let apiKey = '';

function getApiKey() {
    if (apiKey) return apiKey;
    apiKey = localStorage.getItem('jt_groq_key') || DEFAULT_KEY;
    return apiKey;
}

function saveApiKey(key) {
    apiKey = key;
    localStorage.setItem('jt_groq_key', key);
}

async function callLLM(messages) {
    const key = getApiKey();
    if (!key) throw new Error('NO_KEY');

    const body = {
        model: GROQ_MODEL,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages
        ],
        temperature: 0.8,
        max_tokens: 500,
    };

    const res = await fetch(GROQ_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '（応答なし）';
}

function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function renderMessages() {
    if (chatHistory.length === 0) return '';
    return chatHistory.map(m => {
        const isUser = m.role === 'user';
        return `
        <div class="ai-bubble ai-bubble--${isUser ? 'user' : 'ai'}">
            <div class="ai-bubble__content">
                ${formatMessage(m.content)}
            </div>
            ${!isUser ? `
            <button class="audio-btn ai-bubble__speak" onclick="window.JT.speakAI(this)" data-text="${m.content.replace(/"/g, '&quot;').replace(/[（）\(\)]/g, '')}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            </button>
            ` : ''}
        </div>
        `;
    }).join('');
}

export function renderAIChat() {
    const key = getApiKey();

    if (!key) {
        return `
        <div class="view">
            <div class="ai-setup">
                <div class="ai-setup__icon">🤖</div>
                <div class="ai-setup__title">AI 對話教室</div>
                <div class="ai-setup__desc">請輸入你的 Groq API Key 開始練習</div>
                <div class="ai-setup__form">
                    <input type="password" id="api-key-input" class="ai-input"
                           placeholder="gsk_..." value="">
                    <button class="btn btn--primary" onclick="window.JT.saveGeminiKey()">開始學習</button>
                </div>
                <div class="ai-setup__note">Key 只存在你的瀏覽器，不會上傳到任何伺服器</div>
            </div>
        </div>
        `;
    }

    return `
    <div class="view ai-chat-view">
        <div class="ai-chat-header">
            <div class="ai-chat-header__info">
                <span class="ai-chat-header__icon">🤖</span>
                <span class="ai-chat-header__title">AI 日語教師</span>
            </div>
            <div class="ai-chat-header__actions">
                <button class="btn btn--ghost btn--sm" onclick="window.JT.resetAIChat()">重新開始</button>
                <button class="btn btn--ghost btn--sm" onclick="window.JT.changeGeminiKey()">更換 Key</button>
            </div>
        </div>

        <div class="ai-chat-messages" id="ai-messages">
            ${renderMessages()}
            ${isLoading ? '<div class="ai-bubble ai-bubble--ai ai-bubble--loading"><div class="typing-dots"><span></span><span></span><span></span></div></div>' : ''}
        </div>

        <div class="ai-chat-input-area">
            <div class="ai-chat-suggestions" id="ai-suggestions">
                ${chatHistory.length === 0 ? `
                <button class="ai-suggestion" onclick="window.JT.sendAISuggestion('自己紹介の練習をしたいです')">自我介紹練習</button>
                <button class="ai-suggestion" onclick="window.JT.sendAISuggestion('ビジネスメールの書き方を教えてください')">商務郵件寫法</button>
                <button class="ai-suggestion" onclick="window.JT.sendAISuggestion('電話対応の練習をしたいです')">電話應對練習</button>
                <button class="ai-suggestion" onclick="window.JT.sendAISuggestion('会議で使う表現を教えてください')">會議用語</button>
                ` : ''}
            </div>
            <form class="ai-chat-form" onsubmit="event.preventDefault(); window.JT.sendAIMessage()">
                ${isRecognitionSupported() ? `
                <button type="button" class="ai-mic-btn ${isRecording ? 'ai-mic-btn--active' : ''}"
                        onclick="window.JT.toggleVoiceInput()" title="語音輸入">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </button>
                ` : ''}
                <input type="text" id="ai-user-input" class="ai-chat-input"
                       placeholder="${isRecording ? '🎤 聆聽中...' : '日文或中文都可以...'}" autocomplete="off"
                       ${isLoading ? 'disabled' : ''}>
                <button type="submit" class="ai-send-btn" ${isLoading ? 'disabled' : ''}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </form>
        </div>
    </div>
    `;
}

export async function sendAIMessage() {
    const input = document.getElementById('ai-user-input');
    const text = input?.value?.trim();
    if (!text || isLoading) return;

    input.value = '';
    chatHistory.push({ role: 'user', content: text });
    isLoading = true;
    refreshChat();

    try {
        const reply = await callLLM(chatHistory);
        chatHistory.push({ role: 'assistant', content: reply });
    } catch (e) {
        if (e.message === 'NO_KEY') {
            chatHistory.pop();
            apiKey = '';
        } else {
            chatHistory.push({ role: 'assistant', content: `⚠️ エラー: ${e.message}` });
        }
    }

    isLoading = false;
    refreshChat();
}

export async function sendAISuggestion(text) {
    chatHistory.push({ role: 'user', content: text });
    isLoading = true;
    refreshChat();

    try {
        const reply = await callLLM(chatHistory);
        chatHistory.push({ role: 'assistant', content: reply });
    } catch (e) {
        chatHistory.push({ role: 'assistant', content: `⚠️ エラー: ${e.message}` });
    }

    isLoading = false;
    refreshChat();
}

export function resetAIChat() {
    chatHistory = [];
    isLoading = false;
    refreshChat();
}

export function saveGeminiKey() {
    const input = document.getElementById('api-key-input');
    const key = input?.value?.trim();
    if (!key) return;
    saveApiKey(key);
    refreshChat();
    startConversation();
}

export function changeGeminiKey() {
    apiKey = '';
    localStorage.removeItem('jt_groq_key');
    chatHistory = [];
    refreshChat();
}

export function speakAI(btn) {
    const text = btn?.dataset?.text;
    if (text) speak(text);
}

export function toggleVoiceInput() {
    if (isRecording) {
        stopListening();
        isRecording = false;
        refreshChat();
        return;
    }

    isRecording = true;
    refreshChat();

    startListening((result) => {
        isRecording = false;
        if (result.error) {
            refreshChat();
            return;
        }
        const text = result.results?.[0]?.text || '';
        if (text) {
            const input = document.getElementById('ai-user-input');
            if (input) input.value = text;
        }
        refreshChat();
    });
}

async function startConversation() {
    if (chatHistory.length > 0) return;
    isLoading = true;
    refreshChat();

    try {
        chatHistory.push({ role: 'user', content: 'こんにちは、先生。よろしくお願いします。' });
        const reply = await callLLM(chatHistory);
        chatHistory.push({ role: 'assistant', content: reply });
    } catch (e) {
        chatHistory.push({ role: 'assistant', content: `⚠️ 接続エラー: ${e.message}` });
    }

    isLoading = false;
    refreshChat();
}

function refreshChat() {
    const main = document.getElementById('main-content');
    if (main && location.hash === '#ai-chat') {
        main.innerHTML = renderAIChat();
        scrollToBottom();
    }
}

function scrollToBottom() {
    setTimeout(() => {
        const container = document.getElementById('ai-messages');
        if (container) container.scrollTop = container.scrollHeight;
    }, 50);
}

export function initAIChat() {
    if (getApiKey() && chatHistory.length === 0) {
        startConversation();
    }
}
