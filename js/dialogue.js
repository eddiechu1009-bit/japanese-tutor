import { Store } from './store.js';
import { scenarios } from '../data/dialogues/scenarios.js';
import { advancedScenarios } from '../data/dialogues/advanced-scenarios.js';
import { travelScenarios } from '../data/dialogues/travel-scenarios.js';
import { jlptScenarios } from '../data/dialogues/jlpt-scenarios.js';

const businessScenarios = [...scenarios, ...advancedScenarios].map(s => ({ ...s, category: s.category || 'business' }));
const allScenarios = [...businessScenarios, ...travelScenarios, ...jlptScenarios];

let currentScenario = null;
let revealedLines = new Set();
let activeTab = 'business';

export function renderDialogue() {
    if (currentScenario) {
        return renderDialogueView();
    }
    return renderScenarioList();
}

function renderScenarioList() {
    const progress = Store.getProgress();
    const user = Store.getUser();
    const filtered = allScenarios.filter(s => s.category === activeTab);

    return `
    <div class="view">
        <div class="view__header">
            <div class="view__title">對話練習</div>
            <div class="view__subtitle">模擬真實場景，練習日語會話</div>
        </div>

        <div class="dialogue-tabs">
            <button class="dialogue-tab ${activeTab === 'business' ? 'dialogue-tab--active' : ''}"
                    onclick="window.JT.switchDialogueTab('business')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
                商務
            </button>
            <button class="dialogue-tab ${activeTab === 'travel' ? 'dialogue-tab--active' : ''}"
                    onclick="window.JT.switchDialogueTab('travel')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                旅遊
            </button>
            <button class="dialogue-tab ${activeTab === 'jlpt' ? 'dialogue-tab--active' : ''}"
                    onclick="window.JT.switchDialogueTab('jlpt')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
                日檢
            </button>
        </div>

        <div class="dialogue-grid">
            ${filtered.map(s => {
                const isDone = progress.dialoguesCompleted.includes(s.id);
                const isLocked = activeTab === 'business' && s.week > user.currentWeek + 1;
                return `
                <div class="scenario-card ${isDone ? 'scenario-card--done' : ''}"
                     onclick="${isLocked ? '' : `window.JT.openDialogue('${s.id}')`}"
                     style="${isLocked ? 'opacity:0.5;cursor:not-allowed;' : 'cursor:pointer;'}">
                    <div class="scenario-card__header">
                        <span class="scenario-card__icon">${s.icon}</span>
                        ${isDone ? '<span class="badge badge--success">完成</span>' : ''}
                        ${isLocked ? '<span class="badge badge--warning">🔒</span>' : ''}
                    </div>
                    <div class="scenario-card__title">${s.title_zh}</div>
                    <div class="scenario-card__subtitle jp">${s.title_jp}</div>
                    <div class="scenario-card__desc">${s.scene_zh}</div>
                </div>
                `;
            }).join('')}
        </div>
    </div>
    `;
}

export function switchDialogueTab(tab) {
    activeTab = tab;
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderScenarioList();
}

function renderDialogueView() {
    const s = currentScenario;

    return `
    <div class="view">
        <div class="dialogue-view">
            <div class="dialogue-header">
                <button class="dialogue-header__back" onclick="window.JT.closeDialogue()">
                    ← 返回
                </button>
                <div class="dialogue-header__info">
                    <div class="dialogue-header__title">${s.icon} ${s.title_zh}</div>
                    <div class="dialogue-header__scene">${s.scene_zh}</div>
                </div>
            </div>

            <div class="dialogue-chat">
                ${s.lines.map((line, i) => {
                    const isHidden = line.hidden && !revealedLines.has(i);
                    const isRevealed = line.hidden && revealedLines.has(i);
                    return `
                    <div class="chat-bubble chat-bubble--${line.role} ${isHidden ? 'chat-bubble--hidden' : ''} ${isRevealed ? 'chat-bubble--revealed' : ''}"
                         ${isHidden ? `onclick="window.JT.revealLine(${i})"` : ''}>
                        <div class="chat-bubble__speaker">${line.speaker}</div>
                        <div class="chat-bubble__text jp">${line.text}</div>
                        <div class="chat-bubble__translation">${line.zh}</div>
                        ${!isHidden ? `
                        <button class="audio-btn" style="margin-top:6px" onclick="event.stopPropagation(); window.JT.speak('${line.text.replace(/'/g, "\\'")}')">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                        </button>
                        ` : ''}
                    </div>
                    `;
                }).join('')}
            </div>

            <div class="key-expressions">
                <div class="key-expressions__title">重點表達</div>
                ${s.keyExpressions.map(e => `
                    <div class="key-expression">
                        <span class="key-expression__jp jp">${e.jp}</span>
                        <span class="key-expression__zh">${e.zh}</span>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: var(--space-6); text-align: center;">
                <button class="btn btn--primary" onclick="window.JT.completeDialogue('${s.id}')">
                    標記為已練習
                </button>
            </div>
        </div>
    </div>
    `;
}

export function openDialogue(id) {
    currentScenario = allScenarios.find(s => s.id === id);
    revealedLines = new Set();
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderDialogueView();
}

export function closeDialogue() {
    currentScenario = null;
    revealedLines = new Set();
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderScenarioList();
}

export function revealLine(index) {
    revealedLines.add(index);
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderDialogueView();
}

export function completeDialogue(id) {
    Store.completeDialogue(id);
    currentScenario = null;
    revealedLines = new Set();
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderScenarioList();
}
