import { renderDashboard } from './dashboard.js';
import { renderFlashcard, flipCard, rateCard, resetSession, speakWord, speakWordSlow, speakExample } from './flashcard.js';
import { renderDialogue, openDialogue, closeDialogue, revealLine, completeDialogue, switchDialogueTab } from './dialogue.js';
import { renderProgress } from './progress.js';
import { renderReview, startReview, answerQuiz, nextQuestion, resetQuiz } from './review.js';
import { renderJLPT, selectJLPTLevel, backToJLPTOverview, backToJLPTLevel, startJLPTExam, answerJLPT, nextJLPTQuestion } from './jlpt.js';
import { renderAIChat, sendAIMessage, sendAISuggestion, resetAIChat, saveGeminiKey, changeGeminiKey, speakAI, initAIChat, toggleVoiceInput, selectAITopic, backToTopics, endSession, addToSRS, addAllToSRS, switchVoiceLang, quickStart } from './ai-chat.js';
import { speak, speakSlow, startListening, stopListening } from './speech.js';

const routes = {
    '': renderDashboard,
    '#dashboard': renderDashboard,
    '#flashcard': renderFlashcard,
    '#dialogue': renderDialogue,
    '#ai-chat': renderAIChat,
    '#progress': renderProgress,
    '#review': renderReview,
    '#jlpt': renderJLPT,
};

function navigate() {
    const hash = location.hash || '';
    const renderer = routes[hash] || renderDashboard;
    const main = document.getElementById('main-content');
    if (main) {
        main.innerHTML = renderer();
    }
    updateActiveNav(hash || '#dashboard');
    if (hash === '#ai-chat') initAIChat();
}

function updateActiveNav(hash) {
    document.querySelectorAll('.nav__link').forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === hash);
    });
}

window.addEventListener('hashchange', navigate);

window.addEventListener('DOMContentLoaded', () => {
    navigate();
});

window.JT = {
    flipCard,
    rateCard,
    resetSession,
    speakWord,
    speakWordSlow,
    speakExample,
    speak,
    speakSlow,
    startListening,
    stopListening,
    openDialogue,
    closeDialogue,
    revealLine,
    completeDialogue,
    switchDialogueTab,
    startReview,
    answerQuiz,
    nextQuestion,
    resetQuiz,
    selectJLPTLevel,
    backToJLPTOverview,
    backToJLPTLevel,
    startJLPTExam,
    answerJLPT,
    nextJLPTQuestion,
    sendAIMessage,
    sendAISuggestion,
    resetAIChat,
    saveGeminiKey,
    changeGeminiKey,
    speakAI,
    toggleVoiceInput,
    selectAITopic,
    backToTopics,
    endSession,
    addToSRS,
    addAllToSRS,
    switchVoiceLang,
    quickStart,
};

window.addEventListener('keydown', (e) => {
    const hash = location.hash;
    if (hash === '#flashcard') {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            flipCard();
        }
        if (e.key === '1') rateCard(1);
        if (e.key === '2') rateCard(2);
        if (e.key === '3') rateCard(3);
        if (e.key === '4') rateCard(4);
    }
});
