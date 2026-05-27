import { Store } from './store.js';
import { getDueCards, reviewCard, getNextInterval, createNewCard } from './srs.js';
import { getToday, shuffle } from './utils.js';
import { getAllCards, getAllCardIds } from './data-loader.js';
import { speak, speakSlow, isSpeechSupported } from './speech.js';

let sessionCards = [];
let currentIndex = 0;
let isFlipped = false;
let sessionStats = { reviewed: 0, correct: 0, newLearned: 0 };

function buildSession() {
    const settings = Store.getSettings();
    const allIds = getAllCardIds();
    const allCards = getAllCards();
    const { due, newCards } = getDueCards(allIds, allCards);

    const reviewCards = shuffle(due).slice(0, settings.reviewLimit);
    const newToStudy = newCards.slice(0, settings.newCardsPerDay);

    newToStudy.forEach(id => {
        Store.setCardSRS(id, createNewCard(id));
    });

    sessionCards = shuffle([...reviewCards, ...newToStudy]);
    currentIndex = 0;
    isFlipped = false;
    sessionStats = { reviewed: 0, correct: 0, newLearned: newToStudy.length };
}

function getCardData(cardId) {
    const allCards = getAllCards();
    return allCards.find(c => c.id === cardId);
}

function furigana(word, reading) {
    if (!word || !reading) return word || '';
    if (word === reading) return `<span class="jp">${word}</span>`;
    const hasKanji = /[一-龯㐀-䶿]/.test(word);
    if (!hasKanji) return `<span class="jp">${word}</span>`;
    return `<ruby class="jp">${word}<rt>${reading}</rt></ruby>`;
}

function renderCard() {
    if (currentIndex >= sessionCards.length) {
        return renderComplete();
    }

    const cardId = sessionCards[currentIndex];
    const card = getCardData(cardId);
    if (!card) {
        currentIndex++;
        return renderCard();
    }

    const total = sessionCards.length;
    const progress = Math.round((currentIndex / total) * 100);
    const hasTTS = isSpeechSupported();

    return `
    <div class="view">
        <div class="flashcard-container">
            <div class="flashcard-progress">
                <span class="flashcard-progress__text">${currentIndex + 1} / ${total}</span>
                <div class="progress-bar flashcard-progress__bar">
                    <div class="progress-bar__fill" style="width: ${progress}%"></div>
                </div>
            </div>

            <div class="flashcard-scene" onclick="window.JT.flipCard()">
                <div class="flashcard ${isFlipped ? 'flipped' : ''}" id="flashcard">
                    <div class="flashcard__face flashcard__front">
                        <div class="flashcard__word">${furigana(card.word, card.reading)}</div>
                        <div class="flashcard__reading jp">${card.reading}</div>
                        ${hasTTS ? `
                        <div class="flashcard__audio" onclick="event.stopPropagation(); window.JT.speakWord()">
                            <button class="audio-btn" title="播放發音">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                            </button>
                            <button class="audio-btn audio-btn--slow" onclick="event.stopPropagation(); window.JT.speakWordSlow()" title="慢速播放">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3z"/></svg>
                                <span style="font-size:10px">慢</span>
                            </button>
                        </div>
                        ` : ''}
                        <div class="flashcard__type">${card.tags ? card.tags[0] : ''}</div>
                        <div class="flashcard__hint">點擊翻面</div>
                    </div>
                    <div class="flashcard__face flashcard__back">
                        <div class="flashcard__meaning">${card.meaning_zh}</div>
                        <div class="flashcard__example jp-serif">${card.example}</div>
                        <div class="flashcard__example-zh">${card.example_zh}</div>
                        ${hasTTS ? `
                        <div class="flashcard__audio" onclick="event.stopPropagation(); window.JT.speakExample()">
                            <button class="audio-btn" title="播放例句">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                                <span style="font-size:11px; margin-left:4px">例句</span>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div class="flashcard-rating ${isFlipped ? 'visible' : ''}" id="rating-buttons">
                <button class="rating-btn rating-btn--again" onclick="window.JT.rateCard(1)">
                    <span class="rating-btn__label">重來</span>
                    <span class="rating-btn__time">${getNextInterval(cardId, 1)}</span>
                </button>
                <button class="rating-btn rating-btn--hard" onclick="window.JT.rateCard(2)">
                    <span class="rating-btn__label">困難</span>
                    <span class="rating-btn__time">${getNextInterval(cardId, 2)}</span>
                </button>
                <button class="rating-btn rating-btn--good" onclick="window.JT.rateCard(3)">
                    <span class="rating-btn__label">良好</span>
                    <span class="rating-btn__time">${getNextInterval(cardId, 3)}</span>
                </button>
                <button class="rating-btn rating-btn--easy" onclick="window.JT.rateCard(4)">
                    <span class="rating-btn__label">簡單</span>
                    <span class="rating-btn__time">${getNextInterval(cardId, 4)}</span>
                </button>
            </div>
        </div>
    </div>
    `;
}

function renderComplete() {
    const accuracy = sessionStats.reviewed > 0
        ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
        : 0;

    return `
    <div class="view">
        <div class="session-complete">
            <div class="session-complete__icon">🎉</div>
            <div class="session-complete__title">今日學習完成！</div>
            <div class="session-complete__stats">
                <div class="stat-card">
                    <div class="stat-card__value">${sessionStats.reviewed}</div>
                    <div class="stat-card__label">複習卡片</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__value">${sessionStats.newLearned}</div>
                    <div class="stat-card__label">新學卡片</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__value">${accuracy}%</div>
                    <div class="stat-card__label">正確率</div>
                </div>
            </div>
            <a href="#dashboard" class="btn btn--primary btn--large">回到首頁</a>
        </div>
    </div>
    `;
}

export function renderFlashcard() {
    if (sessionCards.length === 0 || currentIndex >= sessionCards.length) {
        buildSession();
    }
    if (sessionCards.length === 0) {
        return `
        <div class="view">
            <div class="empty-state">
                <div class="empty-state__icon">📭</div>
                <div class="empty-state__title">今天沒有需要學習的卡片</div>
                <p>所有卡片都已複習完畢，明天再來吧！</p>
                <br>
                <a href="#dashboard" class="btn btn--secondary">回到首頁</a>
            </div>
        </div>
        `;
    }
    return renderCard();
}

export function flipCard() {
    isFlipped = !isFlipped;
    const el = document.getElementById('flashcard');
    const btns = document.getElementById('rating-buttons');
    if (el) el.classList.toggle('flipped', isFlipped);
    if (btns) btns.classList.toggle('visible', isFlipped);
}

export function speakWord() {
    const cardId = sessionCards[currentIndex];
    const card = getCardData(cardId);
    if (card) speak(card.word);
}

export function speakWordSlow() {
    const cardId = sessionCards[currentIndex];
    const card = getCardData(cardId);
    if (card) speakSlow(card.word);
}

export function speakExample() {
    const cardId = sessionCards[currentIndex];
    const card = getCardData(cardId);
    if (card) speak(card.example);
}

export function rateCard(quality) {
    const cardId = sessionCards[currentIndex];
    reviewCard(cardId, quality);

    sessionStats.reviewed++;
    if (quality >= 3) sessionStats.correct++;

    const today = getToday();
    Store.logDailyStudy(today, 1, quality >= 3 ? 1 : 0, 0);
    Store.updateStreak(today);

    currentIndex++;
    isFlipped = false;

    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderCard();
}

export function resetSession() {
    sessionCards = [];
    currentIndex = 0;
}
