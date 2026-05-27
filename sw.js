const CACHE_NAME = 'jp-tutor-v5';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/variables.css',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './css/dashboard.css',
    './css/flashcard.css',
    './css/dialogue.css',
    './css/progress.css',
    './css/jlpt.css',
    './css/ai-chat.css',
    './css/responsive.css',
    './js/app.js',
    './js/store.js',
    './js/srs.js',
    './js/utils.js',
    './js/dashboard.js',
    './js/flashcard.js',
    './js/dialogue.js',
    './js/progress.js',
    './js/review.js',
    './js/speech.js',
    './js/ai-chat.js',
    './js/data-loader.js',
    './js/jlpt.js',
    './data/curriculum.js',
    './data/jlpt-mock.js',
    './data/vocabulary/week01.js',
    './data/vocabulary/week02.js',
    './data/vocabulary/week03.js',
    './data/vocabulary/week04.js',
    './data/vocabulary/week05.js',
    './data/vocabulary/week06.js',
    './data/vocabulary/week07.js',
    './data/vocabulary/week08.js',
    './data/vocabulary/week09.js',
    './data/vocabulary/week10.js',
    './data/vocabulary/week11.js',
    './data/vocabulary/week12.js',
    './data/grammar/keigo-basics.js',
    './data/dialogues/scenarios.js',
    './data/dialogues/advanced-scenarios.js',
    './data/dialogues/travel-scenarios.js',
    './data/dialogues/jlpt-scenarios.js',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
