import { Store } from './store.js';
import { getDueCards } from './srs.js';
import { getToday, getGreeting, getDailyProverb, getDayOfWeek, addDays } from './utils.js';
import { getAllCardIds, getAllCards } from './data-loader.js';

const AI_TOPIC_NAMES = { free: '自由', intro: '介紹', email: '郵件', phone: '電話', meeting: '會議', keigo: '敬語', negotiate: '談判', travel: '出差' };

function renderAIStatsCard(progress) {
    const sessions = progress.aiSessions || [];
    if (sessions.length === 0) {
        return `
            <div class="card ai-stats-card">
                <div class="ai-stats-card__title">AI 對話教室</div>
                <div class="ai-stats-card__stats">
                    <div class="today-stat">
                        <span class="today-stat__value">0</span>
                        <span class="today-stat__label">練習次數</span>
                    </div>
                    <div class="today-stat">
                        <span class="today-stat__value">0</span>
                        <span class="today-stat__label">糾正次數</span>
                    </div>
                    <div class="today-stat">
                        <span class="today-stat__value">—</span>
                        <span class="today-stat__label">最常練習</span>
                    </div>
                </div>
                <a href="#ai-chat" class="btn btn--ghost">開始練習</a>
            </div>`;
    }
    const totalSessions = sessions.length;
    const totalCorrections = sessions.reduce((sum, s) => sum + (s.corrections || 0), 0);
    const topicCount = {};
    sessions.forEach(s => { topicCount[s.topic] = (topicCount[s.topic] || 0) + 1; });
    const favoriteTopic = Object.entries(topicCount).sort((a, b) => b[1] - a[1])[0][0];
    return `
        <div class="card ai-stats-card">
            <div class="ai-stats-card__title">AI 對話教室</div>
            <div class="ai-stats-card__stats">
                <div class="today-stat">
                    <span class="today-stat__value">${totalSessions}</span>
                    <span class="today-stat__label">練習次數</span>
                </div>
                <div class="today-stat">
                    <span class="today-stat__value">${totalCorrections}</span>
                    <span class="today-stat__label">糾正次數</span>
                </div>
                <div class="today-stat">
                    <span class="today-stat__value">${AI_TOPIC_NAMES[favoriteTopic] || favoriteTopic}</span>
                    <span class="today-stat__label">最常練習</span>
                </div>
            </div>
            <a href="#ai-chat" class="btn btn--ghost">開始練習</a>
        </div>`;
}

export function renderDashboard() {
    const user = Store.getUser();
    const settings = Store.getSettings();
    const progress = Store.getProgress();
    const today = getToday();

    const allIds = getAllCardIds();
    const allCards = getAllCards();
    const { due, newCards } = getDueCards(allIds, allCards);
    const todayNewLimit = settings.newCardsPerDay;
    const todayReviewCount = due.length;
    const todayNewCount = Math.min(newCards.length, todayNewLimit);
    const totalToday = todayReviewCount + todayNewCount;

    const todayLog = progress.dailyLog[today] || { reviewed: 0, correct: 0, new: 0 };
    const proverb = getDailyProverb();

    const weekDays = [];
    const dayOfWeek = new Date(today).getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    for (let i = 0; i < 7; i++) {
        const d = addDays(today, mondayOffset + i);
        weekDays.push({
            date: d,
            label: getDayOfWeek(d),
            done: !!progress.dailyLog[d],
            isToday: d === today,
        });
    }

    return `
    <div class="view">
        <div class="view__header">
            <div class="view__title">${getGreeting()}！準備學習了嗎？</div>
            <div class="view__subtitle">第 ${user.currentWeek} 週學習計畫</div>
        </div>

        <div class="dashboard-grid">
            <div class="today-card card">
                <div class="today-card__greeting">今日學習目標</div>
                <div class="today-card__title">
                    ${totalToday > 0 ? `還有 ${totalToday} 張卡片等你` : '今天的份量已完成！🎉'}
                </div>
                <div class="today-card__stats">
                    <div class="today-stat">
                        <span class="today-stat__value">${todayReviewCount}</span>
                        <span class="today-stat__label">複習卡</span>
                    </div>
                    <div class="today-stat">
                        <span class="today-stat__value">${todayNewCount}</span>
                        <span class="today-stat__label">新卡片</span>
                    </div>
                    <div class="today-stat">
                        <span class="today-stat__value">${todayLog.reviewed}</span>
                        <span class="today-stat__label">今日已學</span>
                    </div>
                </div>
                ${totalToday > 0 ? `
                <a href="#flashcard" class="btn btn--primary btn--large">開始學習</a>
                ` : ''}
            </div>

            <div class="card streak-card">
                <div class="streak-card__flame">${user.streakDays > 0 ? '🔥' : '💤'}</div>
                <div class="streak-card__count">${user.streakDays}</div>
                <div class="streak-card__label">連續學習天數</div>
            </div>

            <div class="card week-overview">
                <div class="week-overview__header">
                    <span class="week-overview__title">本週學習紀錄</span>
                    <span class="badge badge--accent week-overview__badge">W${user.currentWeek}</span>
                </div>
                <div class="week-days">
                    ${weekDays.map(d => `
                        <div class="week-day ${d.done ? 'week-day--done' : ''} ${d.isToday ? 'week-day--today' : ''}">
                            <div class="week-day__label">${d.label}</div>
                            <div class="week-day__dot"></div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="quick-actions">
                <a href="#flashcard" class="quick-action">
                    <span class="quick-action__icon">📚</span>
                    <div>
                        <div class="quick-action__text">學習卡片</div>
                        <div class="quick-action__desc">單字與文法卡片</div>
                    </div>
                </a>
                <a href="#dialogue" class="quick-action">
                    <span class="quick-action__icon">💬</span>
                    <div>
                        <div class="quick-action__text">對話練習</div>
                        <div class="quick-action__desc">商務場景模擬</div>
                    </div>
                </a>
                <a href="#progress" class="quick-action">
                    <span class="quick-action__icon">📊</span>
                    <div>
                        <div class="quick-action__text">學習進度</div>
                        <div class="quick-action__desc">查看統計數據</div>
                    </div>
                </a>
            </div>

            ${renderAIStatsCard(progress)}

            <div class="proverb-card">
                <div class="proverb-card__jp jp-serif">${proverb.jp}</div>
                <div class="proverb-card__zh">${proverb.zh}</div>
            </div>
        </div>
    </div>
    `;
}
