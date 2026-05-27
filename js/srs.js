import { Store } from './store.js';
import { getToday, addDays } from './utils.js';

const MIN_EASE = 1.3;
const INITIAL_EASE = 2.5;

export function createNewCard(cardId) {
    return {
        ease: INITIAL_EASE,
        interval: 0,
        reps: 0,
        due: getToday(),
        lastReview: null,
        history: [],
    };
}

export function reviewCard(cardId, quality) {
    let card = Store.getCardSRS(cardId) || createNewCard(cardId);
    const today = getToday();

    card.history = [...card.history.slice(-4), quality];
    card.lastReview = today;

    if (quality < 3) {
        card.reps = 0;
        card.interval = 1;
    } else {
        card.reps += 1;
        if (card.reps === 1) {
            card.interval = 1;
        } else if (card.reps === 2) {
            card.interval = 3;
        } else {
            card.interval = Math.round(card.interval * card.ease);
        }
    }

    card.ease = card.ease + (0.1 - (4 - quality) * (0.08 + (4 - quality) * 0.02));
    if (card.ease < MIN_EASE) card.ease = MIN_EASE;

    card.due = addDays(today, card.interval);
    Store.setCardSRS(cardId, card);
    return card;
}

export function getDueCards(allCardIds, allCards) {
    const today = getToday();
    const due = [];
    const newCards = [];

    for (const id of allCardIds) {
        const card = Store.getCardSRS(id);
        if (!card) {
            newCards.push(id);
        } else if (card.due <= today) {
            due.push(id);
        }
    }

    // Interleave newCards by JLPT level (N5 -> N4 -> N3 -> repeat)
    if (allCards && newCards.length > 0) {
        const levelOrder = ['N5', 'N4', 'N3'];
        const cardMap = new Map(allCards.map(c => [c.id, c]));
        const buckets = { N5: [], N4: [], N3: [] };

        for (const id of newCards) {
            const cardData = cardMap.get(id);
            const level = (cardData && cardData.level) || 'N4';
            if (buckets[level]) {
                buckets[level].push(id);
            } else {
                buckets['N4'].push(id);
            }
        }

        const interleaved = [];
        let placed = true;
        while (placed) {
            placed = false;
            for (const lvl of levelOrder) {
                if (buckets[lvl].length > 0) {
                    interleaved.push(buckets[lvl].shift());
                    placed = true;
                }
            }
        }

        return { due, newCards: interleaved };
    }

    return { due, newCards };
}

export function getCardStatus(cardId) {
    const card = Store.getCardSRS(cardId);
    if (!card) return 'new';
    if (card.interval >= 21) return 'mature';
    if (card.reps > 0) return 'learning';
    return 'new';
}

export function getNextInterval(cardId, quality) {
    const card = Store.getCardSRS(cardId) || createNewCard(cardId);
    if (quality < 3) return '< 1天';
    let interval;
    if (card.reps === 0) interval = 1;
    else if (card.reps === 1) interval = 3;
    else interval = Math.round(card.interval * card.ease);

    if (interval === 1) return '1天';
    if (interval < 7) return `${interval}天`;
    if (interval < 30) return `${Math.round(interval / 7)}週`;
    return `${Math.round(interval / 30)}月`;
}
