export function getToday() {
    return new Date().toISOString().split('T')[0];
}

export function getDayOfWeek(dateStr) {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return days[new Date(dateStr).getDay()];
}

export function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

export function getWeekNumber(dateStr) {
    const d = new Date(dateStr);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d - startOfYear) / (1000 * 60 * 60 * 24));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

export function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return '深夜好';
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
}

const proverbs = [
    { jp: '継続は力なり', zh: '持續就是力量' },
    { jp: '七転び八起き', zh: '跌倒七次，爬起八次' },
    { jp: '千里の道も一歩から', zh: '千里之行，始於足下' },
    { jp: '石の上にも三年', zh: '鐵杵磨成針' },
    { jp: '塵も積もれば山となる', zh: '積少成多' },
    { jp: '案ずるより産むが易し', zh: '做比想像容易' },
    { jp: '習うより慣れろ', zh: '熟能生巧' },
    { jp: '急がば回れ', zh: '欲速則不達' },
    { jp: '失敗は成功のもと', zh: '失敗為成功之母' },
    { jp: '一期一会', zh: '一期一會，珍惜當下' },
];

export function getDailyProverb() {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % proverbs.length;
    return proverbs[dayIndex];
}
