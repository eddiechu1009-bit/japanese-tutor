import { Store } from './store.js';
import { getCardStatus } from './srs.js';
import { getToday, addDays, formatDate } from './utils.js';
import { getAllCardIds } from './data-loader.js';

export function renderProgress() {
    const progress = Store.getProgress();
    const user = Store.getUser();
    const allIds = getAllCardIds();

    let newCount = 0, learningCount = 0, matureCount = 0;
    allIds.forEach(id => {
        const status = getCardStatus(id);
        if (status === 'new') newCount++;
        else if (status === 'learning') learningCount++;
        else matureCount++;
    });

    const totalReviewed = Object.values(progress.dailyLog).reduce((sum, d) => sum + d.reviewed, 0);
    const totalCorrect = Object.values(progress.dailyLog).reduce((sum, d) => sum + d.correct, 0);
    const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;
    const studyDays = Object.keys(progress.dailyLog).length;

    const curriculumProgress = Math.round(((matureCount + learningCount) / Math.max(allIds.length, 1)) * 100);

    const heatmapData = buildHeatmap(progress.dailyLog);
    const weeklyData = buildWeeklyChart(progress.dailyLog);

    const total = newCount + learningCount + matureCount;
    const newPct = total > 0 ? (newCount / total) * 100 : 0;
    const learnPct = total > 0 ? (learningCount / total) * 100 : 0;
    const maturePct = total > 0 ? (matureCount / total) * 100 : 0;

    return `
    <div class="view">
        <div class="view__header">
            <div class="view__title">學習進度</div>
            <div class="view__subtitle">追蹤你的日語學習旅程</div>
        </div>

        <div class="stats-grid" style="margin-bottom: var(--space-6);">
            <div class="stat-card">
                <div class="stat-card__value">${studyDays}</div>
                <div class="stat-card__label">學習天數</div>
            </div>
            <div class="stat-card">
                <div class="stat-card__value">${totalReviewed}</div>
                <div class="stat-card__label">總複習次數</div>
            </div>
            <div class="stat-card">
                <div class="stat-card__value">${accuracy}%</div>
                <div class="stat-card__label">正確率</div>
            </div>
            <div class="stat-card">
                <div class="stat-card__value">${user.streakDays}</div>
                <div class="stat-card__label">連續天數</div>
            </div>
        </div>

        <div class="progress-grid">
            <div class="level-card">
                <div class="level-card__header">
                    <span class="level-card__title">課程進度</span>
                    <span class="level-card__percent">${curriculumProgress}%</span>
                </div>
                <div class="level-card__bar">
                    <div class="level-card__fill" style="width: ${curriculumProgress}%"></div>
                </div>
                <div class="level-card__labels">
                    <span>N4</span>
                    <span>→</span>
                    <span>N3</span>
                </div>
            </div>

            <div class="mastery-card">
                <div class="mastery-card__title">單字掌握度</div>
                <div class="mastery-chart">
                    <div class="mastery-ring">
                        <svg width="120" height="120" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" stroke="var(--bg-tertiary)" stroke-width="12"/>
                            <circle cx="60" cy="60" r="50" stroke="var(--coral)" stroke-width="12"
                                stroke-dasharray="${newPct * 3.14} ${314 - newPct * 3.14}"
                                stroke-dashoffset="0"/>
                            <circle cx="60" cy="60" r="50" stroke="var(--amber)" stroke-width="12"
                                stroke-dasharray="${learnPct * 3.14} ${314 - learnPct * 3.14}"
                                stroke-dashoffset="${-newPct * 3.14}"/>
                            <circle cx="60" cy="60" r="50" stroke="var(--matcha)" stroke-width="12"
                                stroke-dasharray="${maturePct * 3.14} ${314 - maturePct * 3.14}"
                                stroke-dashoffset="${-(newPct + learnPct) * 3.14}"/>
                        </svg>
                    </div>
                    <div class="mastery-legend">
                        <div class="mastery-legend__item">
                            <span class="mastery-legend__dot" style="background: var(--coral)"></span>
                            <span>未學 ${newCount}</span>
                        </div>
                        <div class="mastery-legend__item">
                            <span class="mastery-legend__dot" style="background: var(--amber)"></span>
                            <span>學習中 ${learningCount}</span>
                        </div>
                        <div class="mastery-legend__item">
                            <span class="mastery-legend__dot" style="background: var(--matcha)"></span>
                            <span>已熟練 ${matureCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="weekly-chart">
                <div class="weekly-chart__title">近 14 天學習量</div>
                <div class="weekly-chart__bars">
                    ${weeklyData.map(d => `
                        <div class="weekly-chart__bar">
                            <div class="weekly-chart__fill" style="height: ${d.height}%"></div>
                            <span class="weekly-chart__label">${d.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="heatmap">
                <div class="heatmap__title">學習熱力圖（近 12 週）</div>
                <div class="heatmap__grid">
                    ${heatmapData.map(d => `
                        <div class="heatmap__cell heatmap__cell--${d.level}" title="${d.date}: ${d.count} 張"></div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
    `;
}

function buildHeatmap(dailyLog) {
    const today = getToday();
    const cells = [];
    for (let i = 83; i >= 0; i--) {
        const date = addDays(today, -i);
        const log = dailyLog[date];
        const count = log ? log.reviewed : 0;
        let level = 'l0';
        if (count >= 30) level = 'l4';
        else if (count >= 20) level = 'l3';
        else if (count >= 10) level = 'l2';
        else if (count > 0) level = 'l1';
        cells.push({ date, count, level });
    }
    return cells;
}

function buildWeeklyChart(dailyLog) {
    const today = getToday();
    const data = [];
    let maxVal = 1;
    for (let i = 13; i >= 0; i--) {
        const date = addDays(today, -i);
        const log = dailyLog[date];
        const count = log ? log.reviewed : 0;
        if (count > maxVal) maxVal = count;
        data.push({ date, count, label: formatDate(date) });
    }
    return data.map(d => ({
        ...d,
        height: Math.round((d.count / maxVal) * 100),
    }));
}
