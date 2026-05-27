import { week01 } from '../data/vocabulary/week01.js';
import { week02 } from '../data/vocabulary/week02.js';
import { week03 } from '../data/vocabulary/week03.js';
import { week04 } from '../data/vocabulary/week04.js';
import { week05 } from '../data/vocabulary/week05.js';
import { week06 } from '../data/vocabulary/week06.js';
import { week07 } from '../data/vocabulary/week07.js';
import { week08 } from '../data/vocabulary/week08.js';
import { week09 } from '../data/vocabulary/week09.js';
import { week10 } from '../data/vocabulary/week10.js';
import { week11 } from '../data/vocabulary/week11.js';
import { week12 } from '../data/vocabulary/week12.js';
import { keigoBasics } from '../data/grammar/keigo-basics.js';

const vocabularyData = [week01, week02, week03, week04, week05, week06, week07, week08, week09, week10, week11, week12];

export function getAllCards() {
    const allWords = [];
    vocabularyData.forEach(week => {
        allWords.push(...week.words);
    });
    keigoBasics.forEach(g => {
        allWords.push({
            id: g.id,
            word: g.pattern,
            reading: g.meaning_zh,
            meaning_zh: g.explanation_zh,
            example: g.examples[0].jp,
            example_zh: g.examples[0].zh,
            tags: ['grammar'],
        });
    });

    // Load custom cards from localStorage (added via AI session "加入複習")
    try {
        const raw = localStorage.getItem('jt_custom_cards');
        if (raw) {
            const customCards = JSON.parse(raw);
            if (Array.isArray(customCards)) {
                allWords.push(...customCards);
            }
        }
    } catch (e) {
        console.warn('[data-loader] Failed to parse jt_custom_cards:', e);
    }

    return allWords;
}

export function getAllCardIds() {
    return getAllCards().map(c => c.id);
}
