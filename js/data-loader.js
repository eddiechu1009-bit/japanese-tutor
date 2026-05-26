import { week01 } from '../data/vocabulary/week01.js';
import { week02 } from '../data/vocabulary/week02.js';
import { week03 } from '../data/vocabulary/week03.js';
import { week04 } from '../data/vocabulary/week04.js';
import { week05 } from '../data/vocabulary/week05.js';
import { keigoBasics } from '../data/grammar/keigo-basics.js';

const vocabularyData = [week01, week02, week03, week04, week05];

let _allCards = null;

export function getAllCards() {
    if (_allCards) return _allCards;
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
    _allCards = allWords;
    return allWords;
}

export function getAllCardIds() {
    return getAllCards().map(c => c.id);
}
