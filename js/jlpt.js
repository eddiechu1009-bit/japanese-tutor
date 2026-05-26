import { Store } from './store.js';
import { shuffle } from './utils.js';
import { jlptLevels, mockQuestions } from '../data/jlpt-mock.js';

let currentLevel = null;
let currentSection = null;
let examQuestions = [];
let examIndex = 0;
let examScore = 0;
let examSelectedAnswer = null;
let examShowingResult = false;

export function renderJLPT() {
    if (examQuestions.length > 0 && examIndex < examQuestions.length) {
        return renderExamQuestion();
    }
    if (examQuestions.length > 0 && examIndex >= examQuestions.length) {
        return renderExamResult();
    }
    if (currentLevel) {
        return renderLevelDetail();
    }
    return renderJLPTOverview();
}

function getNextExamDate() {
    const today = new Date();
    const year = today.getFullYear();
    // JLPT exams: first Sunday of July and first Sunday of December
    const julyFirst = new Date(year, 6, 1);
    const julyExam = new Date(year, 6, 1 + (7 - julyFirst.getDay()) % 7);
    const decFirst = new Date(year, 11, 1);
    const decExam = new Date(year, 11, 1 + (7 - decFirst.getDay()) % 7);

    if (today < julyExam) return { date: julyExam, label: `${year}年7月（第1回）` };
    if (today < decExam) return { date: decExam, label: `${year}年12月（第2回）` };
    const nextJulyFirst = new Date(year + 1, 6, 1);
    const nextJulyExam = new Date(year + 1, 6, 1 + (7 - nextJulyFirst.getDay()) % 7);
    return { date: nextJulyExam, label: `${year + 1}年7月（第1回）` };
}

function renderJLPTOverview() {
    const progress = Store.getProgress();
    const nextExam = getNextExamDate();
    const daysLeft = Math.ceil((nextExam.date - new Date()) / (1000 * 60 * 60 * 24));

    return `
    <div class="view">
        <div class="view__header">
            <div class="view__title">JLPT 模擬考</div>
            <div class="view__subtitle">日本語能力試驗 模擬練習</div>
        </div>

        <div class="jlpt-countdown card" style="margin-bottom: var(--space-6); text-align: center; padding: var(--space-6);">
            <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-2);">
                下次考試：${nextExam.label}
            </div>
            <div style="display: flex; align-items: baseline; justify-content: center; gap: var(--space-2);">
                <span style="font-size: var(--text-3xl); font-weight: 800; color: ${daysLeft < 30 ? 'var(--coral)' : daysLeft < 90 ? 'var(--amber)' : 'var(--accent-light)'};">
                    ${daysLeft}
                </span>
                <span style="font-size: var(--text-base); color: var(--text-secondary);">天</span>
            </div>
            <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-2);">
                ${daysLeft < 30 ? '衝刺階段！每天練習很重要' : daysLeft < 90 ? '還有時間，保持穩定節奏' : '從容準備，打好基礎'}
            </div>
        </div>

        <div class="jlpt-levels">
            ${Object.entries(jlptLevels).map(([key, level]) => {
                const scores = progress.jlptScores?.[key] || {};
                const attempts = Object.keys(scores).length;
                const bestScore = attempts > 0 ? Math.max(...Object.values(scores)) : null;
                return `
                <div class="jlpt-level-card" onclick="window.JT.selectJLPTLevel('${key}')">
                    <div class="jlpt-level-card__badge">${key}</div>
                    <div class="jlpt-level-card__info">
                        <div class="jlpt-level-card__title">${level.target_zh}</div>
                        <div class="jlpt-level-card__meta">
                            單字 ${level.vocab_target.toLocaleString()} · 漢字 ${level.kanji_target}
                        </div>
                    </div>
                    <div class="jlpt-level-card__score">
                        ${bestScore !== null ? `
                            <span class="badge ${bestScore >= 70 ? 'badge--success' : 'badge--warning'}">
                                最高 ${bestScore}%
                            </span>
                        ` : `
                            <span class="badge badge--accent">未挑戰</span>
                        `}
                    </div>
                </div>
                `;
            }).join('')}
        </div>

        <div class="jlpt-tips card" style="margin-top: var(--space-6);">
            <div class="card__title">考試準備建議</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-top: var(--space-4);">
                <div class="jlpt-tip">
                    <span class="jlpt-tip__icon">📖</span>
                    <span class="jlpt-tip__text">每天學習 30 分鐘比週末集中學習更有效</span>
                </div>
                <div class="jlpt-tip">
                    <span class="jlpt-tip__icon">🎧</span>
                    <span class="jlpt-tip__text">多聽日語 Podcast 或新聞增強聽力</span>
                </div>
                <div class="jlpt-tip">
                    <span class="jlpt-tip__icon">✍️</span>
                    <span class="jlpt-tip__text">用日語寫商務郵件練習作文</span>
                </div>
                <div class="jlpt-tip">
                    <span class="jlpt-tip__icon">📝</span>
                    <span class="jlpt-tip__text">考前多做模擬題掌握答題節奏</span>
                </div>
            </div>
        </div>
    </div>
    `;
}

function renderLevelDetail() {
    const level = jlptLevels[currentLevel];
    const progress = Store.getProgress();
    const scores = progress.jlptScores?.[currentLevel] || {};

    return `
    <div class="view">
        <div class="view__header" style="display: flex; align-items: center; gap: var(--space-4);">
            <button class="btn btn--secondary" onclick="window.JT.backToJLPTOverview()">← 返回</button>
            <div>
                <div class="view__title">${currentLevel} 模擬考</div>
                <div class="view__subtitle">${level.target_zh}</div>
            </div>
        </div>

        <div class="stats-grid" style="margin-bottom: var(--space-6);">
            <div class="stat-card">
                <div class="stat-card__value">${level.vocab_target.toLocaleString()}</div>
                <div class="stat-card__label">目標單字量</div>
            </div>
            <div class="stat-card">
                <div class="stat-card__value">${level.kanji_target}</div>
                <div class="stat-card__label">目標漢字量</div>
            </div>
            <div class="stat-card">
                <div class="stat-card__value">${Object.keys(scores).length}</div>
                <div class="stat-card__label">已做次數</div>
            </div>
            <div class="stat-card">
                <div class="stat-card__value">${Object.keys(scores).length > 0 ? Math.max(...Object.values(scores)) + '%' : '--'}</div>
                <div class="stat-card__label">最高分</div>
            </div>
        </div>

        <div class="dialogue-grid">
            <div class="scenario-card" onclick="window.JT.startJLPTExam('${currentLevel}', 'vocabulary')">
                <div class="scenario-card__icon">📝</div>
                <div class="scenario-card__title">語彙（單字）</div>
                <div class="scenario-card__desc">讀音、語意、用法題</div>
                ${scores.vocabulary ? `<span class="badge badge--success">${scores.vocabulary}%</span>` : ''}
            </div>
            <div class="scenario-card" onclick="window.JT.startJLPTExam('${currentLevel}', 'grammar')">
                <div class="scenario-card__icon">✏️</div>
                <div class="scenario-card__title">文法</div>
                <div class="scenario-card__desc">文法選擇、句子組合</div>
                ${scores.grammar ? `<span class="badge badge--success">${scores.grammar}%</span>` : ''}
            </div>
            <div class="scenario-card" onclick="window.JT.startJLPTExam('${currentLevel}', 'reading')">
                <div class="scenario-card__icon">📄</div>
                <div class="scenario-card__title">読解（閱讀）</div>
                <div class="scenario-card__desc">短文閱讀理解</div>
                ${scores.reading ? `<span class="badge badge--success">${scores.reading}%</span>` : ''}
            </div>
        </div>
    </div>
    `;
}

function renderExamQuestion() {
    const q = examQuestions[examIndex];
    const total = examQuestions.length;

    return `
    <div class="view">
        <div class="flashcard-container" style="max-width: 700px;">
            <div class="flashcard-progress">
                <span class="flashcard-progress__text">${currentLevel} ${currentSection} — ${examIndex + 1}/${total}</span>
                <div class="progress-bar flashcard-progress__bar">
                    <div class="progress-bar__fill" style="width: ${(examIndex / total) * 100}%"></div>
                </div>
            </div>

            <div class="card" style="padding: var(--space-6);">
                ${q.passage ? `
                    <div class="exam-passage">
                        <div class="exam-passage__text jp-serif">${q.passage.replace(/\n/g, '<br>')}</div>
                    </div>
                ` : ''}

                <div class="exam-question">
                    <div class="exam-question__type badge badge--accent">${q.type || currentSection}</div>
                    <div class="exam-question__text jp" style="font-size: var(--text-lg); margin: var(--space-4) 0;">
                        ${q.question}
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-4);">
                    ${q.options.map((opt, i) => {
                        let btnStyle = '';
                        if (examShowingResult) {
                            if (i === q.correct) btnStyle = 'background: rgba(123,196,127,0.2); border-color: var(--matcha);';
                            else if (i === examSelectedAnswer && i !== q.correct) btnStyle = 'background: rgba(232,111,111,0.2); border-color: var(--coral);';
                        }
                        return `
                        <button class="btn btn--secondary btn--block" style="text-align: left; justify-content: flex-start; ${btnStyle}"
                                onclick="window.JT.answerJLPT(${i})"
                                ${examShowingResult ? 'disabled' : ''}>
                            <span class="jp">${i + 1}. ${opt}</span>
                        </button>
                        `;
                    }).join('')}
                </div>

                ${examShowingResult ? `
                <div style="margin-top: var(--space-6); padding: var(--space-4); background: var(--bg-tertiary); border-radius: var(--radius-md); border-left: 3px solid var(--accent-primary);">
                    <div style="font-size: var(--text-sm); color: var(--text-secondary);">
                        💡 ${q.explanation_zh}
                    </div>
                </div>
                <div style="text-align: center; margin-top: var(--space-4);">
                    <button class="btn btn--primary" onclick="window.JT.nextJLPTQuestion()">
                        ${examIndex < total - 1 ? '下一題 →' : '查看結果'}
                    </button>
                </div>
                ` : ''}
            </div>
        </div>
    </div>
    `;
}

function renderExamResult() {
    const total = examQuestions.length;
    const percent = Math.round((examScore / total) * 100);
    const passed = percent >= 60;

    return `
    <div class="view">
        <div class="session-complete">
            <div class="session-complete__icon">${passed ? '🎉' : '💪'}</div>
            <div class="session-complete__title">
                ${currentLevel} ${currentSection} — ${passed ? '合格！' : '繼續加油！'}
            </div>
            <div class="session-complete__stats">
                <div class="stat-card">
                    <div class="stat-card__value">${examScore}/${total}</div>
                    <div class="stat-card__label">正確題數</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__value">${percent}%</div>
                    <div class="stat-card__label">正確率</div>
                </div>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: var(--space-6);">
                ${passed ? '表現不錯！繼續保持。' : 'JLPT 合格基準約為 60%，再多練習幾次吧！'}
            </p>
            <button class="btn btn--primary btn--large" onclick="window.JT.backToJLPTLevel()">
                返回 ${currentLevel}
            </button>
        </div>
    </div>
    `;
}

export function selectJLPTLevel(level) {
    currentLevel = level;
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderLevelDetail();
}

export function backToJLPTOverview() {
    currentLevel = null;
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderJLPTOverview();
}

export function backToJLPTLevel() {
    examQuestions = [];
    examIndex = 0;
    examScore = 0;
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderLevelDetail();
}

export function startJLPTExam(level, section) {
    currentLevel = level;
    currentSection = section;
    const questions = mockQuestions[level]?.[section];
    if (!questions || questions.length === 0) return;

    examQuestions = shuffle([...questions]);
    examIndex = 0;
    examScore = 0;
    examSelectedAnswer = null;
    examShowingResult = false;

    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderExamQuestion();
}

export function answerJLPT(index) {
    if (examShowingResult) return;
    const q = examQuestions[examIndex];
    examSelectedAnswer = index;
    examShowingResult = true;

    if (index === q.correct) examScore++;

    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderExamQuestion();
}

export function nextJLPTQuestion() {
    examIndex++;
    examSelectedAnswer = null;
    examShowingResult = false;

    if (examIndex >= examQuestions.length) {
        const total = examQuestions.length;
        const percent = Math.round((examScore / total) * 100);

        const progress = Store.getProgress();
        if (!progress.jlptScores) progress.jlptScores = {};
        if (!progress.jlptScores[currentLevel]) progress.jlptScores[currentLevel] = {};
        const prev = progress.jlptScores[currentLevel][currentSection] || 0;
        if (percent > prev) {
            progress.jlptScores[currentLevel][currentSection] = percent;
        }
        Store.setProgress(progress);

        const main = document.getElementById('main-content');
        if (main) main.innerHTML = renderExamResult();
    } else {
        const main = document.getElementById('main-content');
        if (main) main.innerHTML = renderExamQuestion();
    }
}
