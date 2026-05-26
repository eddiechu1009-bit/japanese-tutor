const STORE_VERSION = 1;
const KEYS = {
    user: 'jt_user',
    srs: 'jt_srs',
    progress: 'jt_progress',
    settings: 'jt_settings',
    version: 'jt_version',
};

function getDefault(key) {
    const defaults = {
        [KEYS.user]: {
            startDate: new Date().toISOString().split('T')[0],
            currentWeek: 1,
            streakDays: 0,
            lastStudyDate: null,
        },
        [KEYS.srs]: {},
        [KEYS.progress]: {
            dailyLog: {},
            weeklyTests: {},
            grammarCompleted: [],
            dialoguesCompleted: [],
        },
        [KEYS.settings]: {
            newCardsPerDay: 10,
            reviewLimit: 50,
            showFurigana: true,
        },
    };
    return defaults[key];
}

function load(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return getDefault(key);
        return JSON.parse(raw);
    } catch {
        return getDefault(key);
    }
}

function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

export const Store = {
    getUser() { return load(KEYS.user); },
    setUser(data) { save(KEYS.user, data); },

    getSRS() { return load(KEYS.srs); },
    setSRS(data) { save(KEYS.srs, data); },

    getCardSRS(cardId) {
        const srs = this.getSRS();
        return srs[cardId] || null;
    },

    setCardSRS(cardId, cardData) {
        const srs = this.getSRS();
        srs[cardId] = cardData;
        save(KEYS.srs, srs);
    },

    getProgress() { return load(KEYS.progress); },
    setProgress(data) { save(KEYS.progress, data); },

    getSettings() { return load(KEYS.settings); },
    setSettings(data) { save(KEYS.settings, data); },

    logDailyStudy(date, reviewed, correct, newCards) {
        const progress = this.getProgress();
        if (!progress.dailyLog[date]) {
            progress.dailyLog[date] = { reviewed: 0, correct: 0, new: 0 };
        }
        progress.dailyLog[date].reviewed += reviewed;
        progress.dailyLog[date].correct += correct;
        progress.dailyLog[date].new += newCards;
        save(KEYS.progress, progress);
    },

    updateStreak(date) {
        const user = this.getUser();
        if (user.lastStudyDate === date) return;

        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (user.lastStudyDate === yesterdayStr) {
            user.streakDays += 1;
        } else if (user.lastStudyDate !== date) {
            user.streakDays = 1;
        }
        user.lastStudyDate = date;
        save(KEYS.user, user);
    },

    completeDialogue(scenarioId) {
        const progress = this.getProgress();
        if (!progress.dialoguesCompleted.includes(scenarioId)) {
            progress.dialoguesCompleted.push(scenarioId);
            save(KEYS.progress, progress);
        }
    },

    saveWeeklyTest(week, score) {
        const progress = this.getProgress();
        progress.weeklyTests[week] = score;
        save(KEYS.progress, progress);
    },

    init() {
        const ver = localStorage.getItem(KEYS.version);
        if (!ver || parseInt(ver) < STORE_VERSION) {
            localStorage.setItem(KEYS.version, STORE_VERSION.toString());
        }
    },

    reset() {
        Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    }
};

Store.init();
