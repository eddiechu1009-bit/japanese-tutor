import { Store } from './store.js';
import { shuffle } from './utils.js';
import { getAllCards } from './data-loader.js';
import { curriculum } from '../data/curriculum.js';

let quizQuestions = [];
let currentQuestion = 0;
let score = 0;
let selectedAnswer = null;
let showingResult = false;

export function renderReview() {
    const user = Store.getUser();
    const progress = Store.getProgress();

    if (quizQuestions.length > 0 && currentQuestion < quizQuestions.length) {
        return renderQuiz();
    }
    if (quizQuestions.length > 0 && currentQuestion >= quizQuestions.length) {
        return renderQuizResult();
    }

    return `
    <div class="view">
        <div class="view__header">
            <div class="view__title">週測驗</div>
            <div class="view__subtitle">完成測驗以解鎖下一週的內容</div>
        </div>

        <div class="dialogue-grid">
            ${curriculum.slice(0, 4).map(week => {
                const testScore = progress.weeklyTests[week.week];
                const isUnlocked = week.week <= user.currentWeek;
                const isPassed = testScore !== undefined && testScore >= 70;
                return `
                <div class="scenario-card ${isPassed ? 'scenario-card--done' : ''}"
                     onclick="${isUnlocked ? `window.JT.startReview(${week.week})` : ''}"
                     style="${!isUnlocked ? 'opacity:0.5;cursor:not-allowed;' : ''}">
                    <div class="scenario-card__header">
                        <span class="scenario-card__icon">📝</span>
                        ${isPassed ? `<span class="badge badge--success">${testScore}%</span>` : ''}
                        ${!isUnlocked ? '<span class="badge badge--warning">🔒</span>' : ''}
                    </div>
                    <div class="scenario-card__title">第 ${week.week} 週測驗</div>
                    <div class="scenario-card__subtitle jp">${week.theme_jp}</div>
                    <div class="scenario-card__desc">${week.theme_zh} — ${week.description}</div>
                </div>
                `;
            }).join('')}
        </div>
    </div>
    `;
}

function generateQuiz(week) {
    const allCards = getAllCards();
    const weekCards = allCards.filter(c => {
        const weekNum = parseInt(c.id.split('-')[0].replace('w', ''));
        return weekNum === week;
    });

    if (weekCards.length === 0) return [];

    const questions = [];
    const shuffled = shuffle(weekCards).slice(0, 10);

    shuffled.forEach(card => {
        const otherCards = allCards.filter(c => c.id !== card.id);
        const wrongAnswers = shuffle(otherCards).slice(0, 3).map(c => c.meaning_zh);
        const options = shuffle([card.meaning_zh, ...wrongAnswers]);

        questions.push({
            type: 'meaning',
            prompt: card.word,
            reading: card.reading,
            correctAnswer: card.meaning_zh,
            options,
            example: card.example,
        });
    });

    return questions;
}

function renderQuiz() {
    const q = quizQuestions[currentQuestion];
    const total = quizQuestions.length;

    return `
    <div class="view">
        <div class="flashcard-container">
            <div class="flashcard-progress">
                <span class="flashcard-progress__text">問題 ${currentQuestion + 1} / ${total}</span>
                <div class="progress-bar flashcard-progress__bar">
                    <div class="progress-bar__fill" style="width: ${(currentQuestion / total) * 100}%"></div>
                </div>
            </div>

            <div class="card" style="text-align: center; padding: var(--space-8);">
                <div style="font-size: var(--text-sm); color: var(--text-muted); margin-bottom: var(--space-2);">
                    這個詞是什麼意思？
                </div>
                <div class="jp" style="font-size: 2.5rem; font-weight: 700; margin-bottom: var(--space-2);">
                    ${q.prompt}
                </div>
                <div class="jp" style="color: var(--accent-light); margin-bottom: var(--space-6);">
                    ${q.reading}
                </div>

                <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                    ${q.options.map((opt, i) => {
                        let btnClass = 'btn btn--secondary btn--block';
                        if (showingResult) {
                            if (opt === q.correctAnswer) btnClass = 'btn btn--success btn--block';
                            else if (opt === selectedAnswer && opt !== q.correctAnswer) btnClass = 'btn btn--danger btn--block';
                        }
                        return `
                        <button class="${btnClass}"
                                onclick="window.JT.answerQuiz(${i})"
                                ${showingResult ? 'disabled' : ''}>
                            ${opt}
                        </button>
                        `;
                    }).join('')}
                </div>

                ${showingResult ? `
                <div style="margin-top: var(--space-6); padding: var(--space-4); background: var(--bg-tertiary); border-radius: var(--radius-md);">
                    <div class="jp-serif" style="color: var(--text-secondary);">${q.example}</div>
                </div>
                <button class="btn btn--primary" style="margin-top: var(--space-4);" onclick="window.JT.nextQuestion()">
                    ${currentQuestion < total - 1 ? '下一題' : '查看結果'}
                </button>
                ` : ''}
            </div>
        </div>
    </div>
    `;
}

function renderQuizResult() {
    const total = quizQuestions.length;
    const percent = Math.round((score / total) * 100);
    const passed = percent >= 70;

    return `
    <div class="view">
        <div class="session-complete">
            <div class="session-complete__icon">${passed ? '🎊' : '📚'}</div>
            <div class="session-complete__title">
                ${passed ? '恭喜通過！' : '再加油！'}
            </div>
            <div class="session-complete__stats">
                <div class="stat-card">
                    <div class="stat-card__value">${score}/${total}</div>
                    <div class="stat-card__label">答對題數</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__value">${percent}%</div>
                    <div class="stat-card__label">正確率</div>
                </div>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: var(--space-6);">
                ${passed ? '已解鎖下一週內容！' : '需要 70% 以上才能解鎖下一週，再複習一下吧。'}
            </p>
            <a href="#review" class="btn btn--primary btn--large" onclick="window.JT.resetQuiz()">
                返回
            </a>
        </div>
    </div>
    `;
}

export function startReview(week) {
    quizQuestions = generateQuiz(week);
    currentQuestion = 0;
    score = 0;
    selectedAnswer = null;
    showingResult = false;

    if (quizQuestions.length === 0) return;
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderQuiz();
}

export function answerQuiz(optionIndex) {
    if (showingResult) return;
    const q = quizQuestions[currentQuestion];
    selectedAnswer = q.options[optionIndex];
    showingResult = true;

    if (selectedAnswer === q.correctAnswer) {
        score++;
    }

    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderQuiz();
}

export function nextQuestion() {
    currentQuestion++;
    selectedAnswer = null;
    showingResult = false;

    if (currentQuestion >= quizQuestions.length) {
        const total = quizQuestions.length;
        const percent = Math.round((score / total) * 100);
        const user = Store.getUser();

        Store.saveWeeklyTest(user.currentWeek, percent);

        if (percent >= 70 && user.currentWeek < 12) {
            user.currentWeek++;
            Store.setUser(user);
        }

        const main = document.getElementById('main-content');
        if (main) main.innerHTML = renderQuizResult();
    } else {
        const main = document.getElementById('main-content');
        if (main) main.innerHTML = renderQuiz();
    }
}

export function resetQuiz() {
    quizQuestions = [];
    currentQuestion = 0;
    score = 0;
}
