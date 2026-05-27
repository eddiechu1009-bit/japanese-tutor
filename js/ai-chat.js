import { Store } from './store.js';
import { getToday } from './utils.js';
import { speak, startListening, stopListening, isRecognitionSupported } from './speech.js';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_KEY = '';

const TOPICS = [
    {
        id: 'free',
        icon: '💬',
        title: '自由對話',
        title_jp: 'フリートーク',
        desc: '跟老師聊任何主題',
        prompt: '生徒が自由に話したいトピックを選びます。何について話したいか聞いてください。',
    },
    {
        id: 'intro',
        icon: '🤝',
        title: '自我介紹',
        title_jp: '自己紹介',
        desc: '練習商務場合的自我介紹',
        prompt: '今日のテーマは「自己紹介」です。ビジネスの場面で使える自己紹介を練習しましょう。まず、簡単な場面を設定して（例：新しい取引先との初対面）、生徒に自己紹介をさせてください。',
    },
    {
        id: 'email',
        icon: '📧',
        title: '商務郵件',
        title_jp: 'ビジネスメール',
        desc: '學習郵件的敬語與格式',
        prompt: '今日のテーマは「ビジネスメール」です。メールの書き方（件名、挨拶、本文、結び）を練習しましょう。具体的な場面を設定して（例：会議の日程調整、お礼メール）、生徒にメールを書かせてください。',
    },
    {
        id: 'phone',
        icon: '📞',
        title: '電話應對',
        title_jp: '電話対応',
        desc: '接電話、轉接、留言',
        prompt: '今日のテーマは「電話対応」です。電話の受け方、取り次ぎ、伝言の預かり方を練習しましょう。あなたが電話をかける側の役を演じて、生徒に対応させてください。',
    },
    {
        id: 'meeting',
        icon: '🏢',
        title: '會議發言',
        title_jp: '会議',
        desc: '提案、贊成、反對、總結',
        prompt: '今日のテーマは「会議」です。会議での発言（提案、賛成、反対、質問、まとめ）を練習しましょう。会議の場面を設定して、生徒に発言させてください。',
    },
    {
        id: 'keigo',
        icon: '🎌',
        title: '敬語特訓',
        title_jp: '敬語',
        desc: '尊敬語、謙讓語、丁寧語',
        prompt: '今日のテーマは「敬語」です。尊敬語、謙譲語、丁寧語の使い分けを練習しましょう。普通の文を提示して、生徒に正しい敬語に変換させてください。間違えたら丁寧に説明してください。',
    },
    {
        id: 'negotiate',
        icon: '💼',
        title: '商業談判',
        title_jp: '交渉',
        desc: '價格協商、條件討論',
        prompt: '今日のテーマは「交渉・ネゴシエーション」です。価格交渉、条件の提示、譲歩の表現を練習しましょう。あなたが取引先の役を演じて、生徒と交渉してください。',
    },
    {
        id: 'travel',
        icon: '✈️',
        title: '日本出差',
        title_jp: '出張',
        desc: '飯店、交通、餐廳用語',
        prompt: '今日のテーマは「日本出張」です。ホテルのチェックイン、タクシー、レストランでの注文など、出張中に使う日本語を練習しましょう。場面を設定してロールプレイしてください。',
    },
];

const BASE_SYSTEM = `あなたは優しい日本語の先生です。生徒は台湾人のビジネスパーソンで、日本語初中級レベル（N4〜N3）です。

ルール：
1. 日本語で話しかけてください。難しい漢字にはふりがなを（）で付けてください。
2. 生徒が間違えたら、まず正しい文を示し、なぜ間違いかを中国語（繁體中文）で簡潔に説明してください。
3. 生徒が中国語で書いても構いません。その場合は日本語でどう言うかを教えてください。
4. 会話は自然に続けてください。一度に長すぎる説明はしないでください（3文以内）。
5. 時々、生徒に質問を投げかけて練習させてください。
6. 生徒のレベルに合わせて、徐々に難易度を上げてください。`;

let chatHistory = [];
let isLoading = false;
let isRecording = false;
let currentTopic = null;
let sessionSummary = null;
let apiKey = '';

function getApiKey() {
    if (apiKey) return apiKey;
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get('key');
    if (urlKey) {
        saveApiKey(urlKey);
        return apiKey;
    }
    apiKey = localStorage.getItem('jt_groq_key') || DEFAULT_KEY;
    return apiKey;
}

function saveApiKey(key) {
    apiKey = key;
    localStorage.setItem('jt_groq_key', key);
}

function getSystemPrompt() {
    const topicPrompt = currentTopic ? currentTopic.prompt : '';
    return `${BASE_SYSTEM}\n\n今日のテーマ: ${topicPrompt}\n\n最初のメッセージ: テーマに合わせて簡単に挨拶し、練習を始めてください。`;
}

async function callLLM(messages) {
    const key = getApiKey();
    if (!key) throw new Error('NO_KEY');

    const body = {
        model: GROQ_MODEL,
        messages: [
            { role: 'system', content: getSystemPrompt() },
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

function renderTopicSelect() {
    return `
    <div class="view">
        <div class="view__header">
            <div class="view__title">AI 對話教室</div>
            <div class="view__subtitle">選擇今天要練習的主題</div>
        </div>
        <div class="ai-topic-grid">
            ${TOPICS.map(t => `
            <div class="ai-topic-card" onclick="window.JT.selectAITopic('${t.id}')">
                <div class="ai-topic-card__icon">${t.icon}</div>
                <div class="ai-topic-card__body">
                    <div class="ai-topic-card__title">${t.title}</div>
                    <div class="ai-topic-card__jp">${t.title_jp}</div>
                    <div class="ai-topic-card__desc">${t.desc}</div>
                </div>
            </div>
            `).join('')}
        </div>
    </div>
    `;
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

    if (!currentTopic) {
        return renderTopicSelect();
    }

    return `
    <div class="view ai-chat-view">
        <div class="ai-chat-header">
            <div class="ai-chat-header__info">
                <button class="ai-chat-header__back" onclick="window.JT.backToTopics()">←</button>
                <span class="ai-chat-header__icon">${currentTopic.icon}</span>
                <span class="ai-chat-header__title">${currentTopic.title}</span>
            </div>
            <div class="ai-chat-header__actions">
                <button class="btn btn--ghost btn--sm" onclick="window.JT.endSession()">結束練習</button>
                <button class="btn btn--ghost btn--sm" onclick="window.JT.resetAIChat()">重新開始</button>
            </div>
        </div>

        <div class="ai-chat-messages" id="ai-messages">
            ${renderMessages()}
            ${isLoading ? '<div class="ai-bubble ai-bubble--ai ai-bubble--loading"><div class="typing-dots"><span></span><span></span><span></span></div></div>' : ''}
        </div>

        <div class="ai-chat-input-area">
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

const SUMMARY_PROMPT = `今までの会話を振り返って、以下のJSON形式で学習レポートを作成してください。他のテキストは一切出力しないでください。JSONのみ出力してください。

{
  "expressions": [
    {"jp": "学んだ表現", "reading": "よみがな", "zh": "中文意思"}
  ],
  "corrections": [
    {"wrong": "生徒の間違い", "correct": "正しい表現", "explanation": "中文で簡潔に説明"}
  ],
  "feedback": "今日の練習について一言アドバイス（中国語繁體で）"
}

注意：
- expressions: 今日の会話で教えた新しい表現（最大5個）
- corrections: 生徒が間違えた箇所（最大5個、なければ空配列）
- feedback: 1〜2文の励ましとアドバイス`;

function renderSummary() {
    if (!sessionSummary) return '';
    const s = sessionSummary;
    return `
    <div class="view">
        <div class="ai-summary">
            <div class="ai-summary__header">
                <div class="ai-summary__icon">📝</div>
                <div class="ai-summary__title">今日の学習レポート</div>
            </div>

            ${s.expressions && s.expressions.length > 0 ? `
            <div class="ai-summary__section">
                <div class="ai-summary__section-title">✨ 學到的新表達</div>
                <div class="ai-summary__list">
                    ${s.expressions.map((e, i) => `
                    <div class="ai-summary__item">
                        <div class="ai-summary__item-main">
                            <span class="ai-summary__jp">${e.jp}</span>
                            <span class="ai-summary__reading">${e.reading || ''}</span>
                        </div>
                        <div class="ai-summary__zh">${e.zh}</div>
                        <button class="btn btn--ghost btn--sm ai-summary__add" onclick="window.JT.addToSRS(${i}, 'expression')">+ 加入複習</button>
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${s.corrections && s.corrections.length > 0 ? `
            <div class="ai-summary__section">
                <div class="ai-summary__section-title">🔧 錯誤修正</div>
                <div class="ai-summary__list">
                    ${s.corrections.map((c, i) => `
                    <div class="ai-summary__item ai-summary__item--correction">
                        <div class="ai-summary__wrong">✗ ${c.wrong}</div>
                        <div class="ai-summary__correct">✓ ${c.correct}</div>
                        <div class="ai-summary__explanation">${c.explanation}</div>
                        <button class="btn btn--ghost btn--sm ai-summary__add" onclick="window.JT.addToSRS(${i}, 'correction')">+ 加入複習</button>
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${s.feedback ? `
            <div class="ai-summary__section">
                <div class="ai-summary__section-title">💬 老師的話</div>
                <div class="ai-summary__feedback">${s.feedback}</div>
            </div>
            ` : ''}

            <div class="ai-summary__actions">
                <button class="btn btn--primary" onclick="window.JT.backToTopics()">選擇新主題</button>
                <button class="btn btn--ghost" onclick="window.JT.addAllToSRS()">全部加入複習</button>
            </div>
        </div>
    </div>
    `;
}

export async function endSession() {
    if (chatHistory.length < 2) {
        backToTopics();
        return;
    }

    isLoading = true;
    refreshChat();

    try {
        const summaryMessages = [
            ...chatHistory,
            { role: 'user', content: SUMMARY_PROMPT }
        ];

        const key = getApiKey();
        const body = {
            model: GROQ_MODEL,
            messages: [
                { role: 'system', content: 'あなたは日本語教師です。指示通りにJSONのみを出力してください。' },
                ...summaryMessages
            ],
            temperature: 0.3,
            max_tokens: 800,
        };

        const res = await fetch(GROQ_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error('API error');

        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            sessionSummary = JSON.parse(jsonMatch[0]);
        } else {
            sessionSummary = { expressions: [], corrections: [], feedback: raw };
        }
    } catch (e) {
        sessionSummary = { expressions: [], corrections: [], feedback: '⚠️ レポート生成に失敗しました。' };
    }

    isLoading = false;
    Store.logAISession(getToday(), currentTopic.id, sessionSummary?.corrections?.length || 0);
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderSummary();
}

export function addToSRS(index, type) {
    if (!sessionSummary) return;
    const item = type === 'expression'
        ? sessionSummary.expressions[index]
        : sessionSummary.corrections[index];
    if (!item) return;

    const cardId = `ai-${Date.now()}-${index}`;
    const card = {
        id: cardId,
        word: type === 'expression' ? item.jp : item.correct,
        reading: type === 'expression' ? (item.reading || '') : '',
        meaning_zh: type === 'expression' ? item.zh : item.explanation,
        example: type === 'expression' ? item.jp : item.correct,
        example_zh: type === 'expression' ? item.zh : item.explanation,
        tags: ['ai-learned'],
    };

    let customCards = JSON.parse(localStorage.getItem('jt_custom_cards') || '[]');
    customCards.push(card);
    localStorage.setItem('jt_custom_cards', JSON.stringify(customCards));

    const btn = event?.target;
    if (btn) {
        btn.textContent = '✓ 已加入';
        btn.disabled = true;
        btn.classList.add('ai-summary__added');
    }
}

export function addAllToSRS() {
    if (!sessionSummary) return;
    const expressions = sessionSummary.expressions || [];
    const corrections = sessionSummary.corrections || [];

    expressions.forEach((_, i) => addToSRS(i, 'expression'));
    corrections.forEach((_, i) => addToSRS(i, 'correction'));

    const btn = event?.target;
    if (btn) {
        btn.textContent = '✓ 全部已加入';
        btn.disabled = true;
    }
}

export function selectAITopic(topicId) {
    currentTopic = TOPICS.find(t => t.id === topicId);
    chatHistory = [];
    sessionSummary = null;
    isLoading = false;
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderAIChat();
    startConversation();
}

export function backToTopics() {
    currentTopic = null;
    chatHistory = [];
    sessionSummary = null;
    isLoading = false;
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderAIChat();
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
    startConversation();
}

export function saveGeminiKey() {
    const input = document.getElementById('api-key-input');
    const key = input?.value?.trim();
    if (!key) return;
    saveApiKey(key);
    refreshChat();
}

export function changeGeminiKey() {
    apiKey = '';
    localStorage.removeItem('jt_groq_key');
    chatHistory = [];
    currentTopic = null;
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
        updateMicUI();
        return;
    }

    isRecording = true;
    updateMicUI();

    startListening((result) => {
        isRecording = false;
        if (result.error) {
            const errMsg = `語音辨識失敗: ${result.error}`;
            chatHistory.push({ role: 'assistant', content: `⚠️ ${errMsg}\n\n可能原因：\n• 請確認已允許麥克風權限\n• 需使用 HTTPS 網頁\n• 請對著麥克風說話` });
            refreshChat();
            return;
        }
        const text = result.results?.[0]?.text || '';
        if (text) {
            chatHistory.push({ role: 'user', content: text });
            isLoading = true;
            refreshChat();
            callLLM(chatHistory).then(reply => {
                chatHistory.push({ role: 'assistant', content: reply });
                isLoading = false;
                refreshChat();
            }).catch(e => {
                chatHistory.push({ role: 'assistant', content: `⚠️ エラー: ${e.message}` });
                isLoading = false;
                refreshChat();
            });
        } else {
            chatHistory.push({ role: 'assistant', content: '⚠️ 沒有偵測到語音，請再試一次。' });
            refreshChat();
        }
    });
}

function updateMicUI() {
    const btn = document.querySelector('.ai-mic-btn');
    const input = document.getElementById('ai-user-input');
    if (btn) {
        btn.classList.toggle('ai-mic-btn--active', isRecording);
    }
    if (input) {
        input.placeholder = isRecording ? '🎤 聆聽中...' : '日文或中文都可以...';
    }
}

async function startConversation() {
    if (chatHistory.length > 0 || !currentTopic) return;
    isLoading = true;
    refreshChat();

    try {
        chatHistory.push({ role: 'user', content: 'こんにちは、先生。よろしくお願いします。今日のテーマを始めましょう。' });
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
    if (getApiKey() && !currentTopic) {
        refreshChat();
    }
}
