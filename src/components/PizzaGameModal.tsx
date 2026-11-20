import {useEffect, useReducer, useState, type ReactNode} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBellConcierge, faPause, faPlay, faRotateRight, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import type {Project, ProjectFile} from '../projects';
import FileTree from './FileTree';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {oneDark} from 'react-syntax-highlighter/dist/esm/styles/prism';

// ---------- Ingredients ----------
type SauceId = 'tomato' | 'white' | 'pesto' | 'bbq';
type ToppingId = 'cheese' | 'pepperoni' | 'mushroom' | 'olive' | 'pepper' | 'onion' | 'pineapple' | 'basil';

// `unlock` is the level an ingredient starts showing up in orders.
// `key` is the keyboard shortcut.
const SAUCES: { id: SauceId; label: string; color: string; key: string; unlock: number }[] = [
    {id: 'tomato', label: 'Tomato', color: '#D93A26', key: '1', unlock: 1},
    {id: 'white', label: 'Garlic White', color: '#F4EAD5', key: '2', unlock: 1},
    {id: 'pesto', label: 'Pesto', color: '#5C9E31', key: '3', unlock: 2},
    {id: 'bbq', label: 'BBQ', color: '#7A2E14', key: '4', unlock: 3},
];

const TOPPINGS: { id: ToppingId; label: string; key: string; unlock: number }[] = [
    {id: 'cheese', label: 'Cheese', key: 'c', unlock: 1},
    {id: 'pepperoni', label: 'Pepperoni', key: 'p', unlock: 1},
    {id: 'mushroom', label: 'Mushroom', key: 'm', unlock: 1},
    {id: 'olive', label: 'Olives', key: 'o', unlock: 1},
    {id: 'pepper', label: 'Green Pepper', key: 'g', unlock: 2},
    {id: 'onion', label: 'Onion', key: 'n', unlock: 3},
    {id: 'pineapple', label: 'Pineapple', key: 'a', unlock: 4},
    {id: 'basil', label: 'Basil', key: 'b', unlock: 5},
];

const sauceInfo = (id: SauceId) => SAUCES.find(s => s.id === id)!;
const toppingInfo = (id: ToppingId) => TOPPINGS.find(t => t.id === id)!;
const toppingOrder = (id: ToppingId) => TOPPINGS.findIndex(t => t.id === id);
const sortToppings = (ids: ToppingId[]) => [...ids].sort((a, b) => toppingOrder(a) - toppingOrder(b));

// ---------- Tuning ----------
const LEVEL_MS = 30_000;     // the shop gets busier every 30 seconds
const MAX_STRIKES = 3;       // wrong or late orders before the shift ends
const WRONG_PENALTY = 40;
const LATE_PENALTY = 25;
const TOAST_MS = 2200;
const BEST_KEY = 'pizza-rush-best';

// How long a customer waits. Shrinks each level, with extra time for bigger orders.
const patienceMs = (level: number, toppings: number) =>
    Math.max(12_000, 34_000 * 0.9 ** (level - 1)) + toppings * 1500;
// Gap between customers walking in.
const spawnGapMs = (level: number) =>
    Math.max(2500, 10_000 * 0.85 ** (level - 1)) * (0.8 + Math.random() * 0.4);
// How many customers can be waiting at once.
const maxOrders = (level: number) => Math.min(5, 2 + Math.floor((level - 1) / 2));
// Most extra toppings (besides cheese) an order can ask for.
const maxExtras = (level: number) => Math.min(4, 1 + Math.floor(level / 2));

// ---------- Customers ----------
type Mood = 'happy' | 'ok' | 'mad';
interface Look { skin: string; hair: string; shirt: string; style: number }

const NAMES = ['Marco', 'Luna', 'Gus', 'Priya', 'Theo', 'Rosa', 'Kenji', 'Nia', 'Otto', 'Zara',
    'Leo', 'Mabel', 'Sal', 'Ivy', 'Dante', 'Wren', 'Omar', 'Pip', 'Hazel', 'Rafa'];
const SKINS = ['#F9D3B4', '#E8B48A', '#C68B59', '#8D5A3B', '#5C3A23'];
const HAIRS = ['#2B1B10', '#6B3E1E', '#D9A441', '#B5442B', '#3C3C46', '#E6E1D6'];
const SHIRTS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

const pick = <T, >(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

interface Order {
    id: number;
    name: string;
    look: Look;
    sauce: SauceId;
    toppings: ToppingId[];
    arrivedAt: number;  // game clock (ms)
    patience: number;   // ms
}

function makeOrder(id: number, level: number, clock: number, waiting: Order[]): Order {
    const sauce = pick(SAUCES.filter(s => s.unlock <= level)).id;
    const extras = TOPPINGS.filter(t => t.id !== 'cheese' && t.unlock <= level).map(t => t.id);
    const count = 1 + Math.floor(Math.random() * Math.min(maxExtras(level), extras.length));
    const shuffled = [...extras].sort(() => Math.random() - 0.5);
    const toppings = shuffled.slice(0, count);
    if (Math.random() < 0.85) toppings.push('cheese');
    // Avoid two customers with the same name on the counter.
    const taken = new Set(waiting.map(o => o.name));
    return {
        id,
        name: pick(NAMES.filter(n => !taken.has(n))),
        look: {skin: pick(SKINS), hair: pick(HAIRS), shirt: pick(SHIRTS), style: Math.floor(Math.random() * 3)},
        sauce,
        toppings: sortToppings(toppings),
        arrivedAt: clock,
        patience: patienceMs(level, toppings.length),
    };
}

const timeLeft = (o: Order, clock: number) => Math.max(0, 1 - (clock - o.arrivedAt) / o.patience);
const moodFor = (frac: number): Mood => (frac > 0.5 ? 'happy' : frac > 0.2 ? 'ok' : 'mad');

// What's wrong with the pizza, as short readable reasons. Empty means perfect.
function checkPizza(order: Order, sauce: SauceId | null, toppings: ToppingId[]): string[] {
    const problems: string[] = [];
    if (sauce === null) problems.push('No sauce?!');
    else if (sauce !== order.sauce) problems.push(`Wanted ${sauceInfo(order.sauce).label} sauce`);
    const missing = order.toppings.filter(t => !toppings.includes(t));
    const extra = toppings.filter(t => !order.toppings.includes(t));
    const names = (ids: ToppingId[]) => ids.map(t => toppingInfo(t).label.toLowerCase()).join(', ');
    if (missing.length) problems.push(`Forgot the ${names(missing)}`);
    if (extra.length) problems.push(`Didn't want ${names(extra)}`);
    return problems;
}

// ---------- Game state ----------
type Phase = 'ready' | 'playing' | 'paused' | 'over';
interface Toast { id: number; text: string; tone: 'good' | 'bad' | 'info'; at: number }

interface GameState {
    phase: Phase;
    clock: number;      // ms of play time (doesn't advance while paused)
    level: number;
    score: number;
    served: number;
    strikes: number;
    orders: Order[];
    selectedId: number | null;
    nextSpawnAt: number;
    nextId: number;
    sauce: SauceId | null;          // the pizza being built
    toppings: ToppingId[];
    toasts: Toast[];
    best: number;
    newBest: boolean;
}

type Action =
    | { type: 'start' }
    | { type: 'tick'; dt: number }
    | { type: 'pause' }
    | { type: 'resume' }
    | { type: 'sauce'; sauce: SauceId }
    | { type: 'topping'; topping: ToppingId }
    | { type: 'clear' }
    | { type: 'serve' }
    | { type: 'select'; id: number }
    | { type: 'cycle'; dir: 1 | -1 };

function readBest(): number {
    try {
        return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
        return 0;
    }
}

function freshGame(best: number, phase: Phase): GameState {
    return {
        phase, clock: 0, level: 1, score: 0, served: 0, strikes: 0,
        orders: [], selectedId: null, nextSpawnAt: 600, nextId: 1,
        sauce: null, toppings: [], toasts: [], best, newBest: false,
    };
}

function addToast(s: GameState, text: string, tone: Toast['tone']): GameState {
    return {...s, nextId: s.nextId + 1, toasts: [...s.toasts, {id: s.nextId, text, tone, at: s.clock}].slice(-3)};
}

// Keeps the selection on a customer who's still here, and ends the shift on the last strike.
function settle(s: GameState): GameState {
    let next = s;
    if (!next.orders.some(o => o.id === next.selectedId)) {
        next = {...next, selectedId: next.orders[0]?.id ?? null};
    }
    if (next.strikes >= MAX_STRIKES && next.phase === 'playing') {
        const newBest = next.score > next.best;
        next = {...next, phase: 'over', newBest, best: Math.max(next.best, next.score)};
    }
    return next;
}

function reducer(s: GameState, a: Action): GameState {
    switch (a.type) {
        case 'start':
            return freshGame(s.best, 'playing');
        case 'pause':
            return s.phase === 'playing' ? {...s, phase: 'paused'} : s;
        case 'resume':
            return s.phase === 'paused' ? {...s, phase: 'playing'} : s;
    }
    if (s.phase !== 'playing') return s;

    switch (a.type) {
        case 'tick': {
            const clock = s.clock + a.dt;
            let next: GameState = {...s, clock};

            const level = 1 + Math.floor(clock / LEVEL_MS);
            if (level > s.level) {
                const fresh = [...SAUCES, ...TOPPINGS].filter(i => i.unlock === level).map(i => i.label);
                next = addToast({...next, level},
                    `Level ${level}! Faster orders${fresh.length ? ` · New: ${fresh.join(', ')}` : ''}`, 'info');
            }

            // Customers who ran out of patience walk out.
            for (const o of next.orders.filter(o => timeLeft(o, clock) <= 0)) {
                next = addToast({
                    ...next,
                    orders: next.orders.filter(x => x.id !== o.id),
                    score: next.score - LATE_PENALTY,
                    strikes: next.strikes + 1,
                }, `${o.name} got tired of waiting −${LATE_PENALTY}`, 'bad');
            }

            // Someone new walks in.
            if (clock >= next.nextSpawnAt) {
                if (next.orders.length < maxOrders(level)) {
                    next = {
                        ...next,
                        orders: [...next.orders, makeOrder(next.nextId, level, clock, next.orders)],
                        nextId: next.nextId + 1,
                        nextSpawnAt: clock + spawnGapMs(level),
                    };
                } else {
                    // Counter is full: the next customer shows up shortly after a spot opens.
                    next = {...next, nextSpawnAt: clock + 1500};
                }
            } else if (next.orders.length === 0 && next.nextSpawnAt > clock + 1200) {
                // Don't leave the player staring at an empty counter.
                next = {...next, nextSpawnAt: clock + 1200};
            }

            next = {...next, toasts: next.toasts.filter(t => clock - t.at < TOAST_MS)};
            return settle(next);
        }
        case 'sauce':
            return {...s, sauce: s.sauce === a.sauce ? null : a.sauce};
        case 'topping':
            return {
                ...s,
                toppings: s.toppings.includes(a.topping)
                    ? s.toppings.filter(t => t !== a.topping)
                    : sortToppings([...s.toppings, a.topping]),
            };
        case 'clear':
            return {...s, sauce: null, toppings: []};
        case 'select':
            return {...s, selectedId: a.id};
        case 'cycle': {
            if (!s.orders.length) return s;
            const i = s.orders.findIndex(o => o.id === s.selectedId);
            const j = (i + a.dir + s.orders.length) % s.orders.length;
            return {...s, selectedId: s.orders[j].id};
        }
        case 'serve': {
            const order = s.orders.find(o => o.id === s.selectedId);
            if (!order) return s;
            if (s.sauce === null && s.toppings.length === 0) return addToast(s, 'Build a pizza first!', 'info');

            const problems = checkPizza(order, s.sauce, s.toppings);
            const base: GameState = {...s, orders: s.orders.filter(o => o.id !== order.id), sauce: null, toppings: []};
            if (problems.length === 0) {
                // Bigger orders and faster service are worth more.
                const pts = 50 + 15 * order.toppings.length + Math.round(60 * timeLeft(order, s.clock));
                return settle(addToast({...base, score: s.score + pts, served: s.served + 1},
                    `${order.name}: Perfect! +${pts}`, 'good'));
            }
            return settle(addToast({...base, score: s.score - WRONG_PENALTY, strikes: s.strikes + 1},
                `${order.name}: ${problems.join(' · ')} −${WRONG_PENALTY}`, 'bad'));
        }
    }
    return s;
}

// ---------- Cartoon art (SVG) ----------
const INK = '#3B1F0E'; // dark brown outline for the cartoon look

// A wobbly circle, so sauce and cheese look hand-spread instead of perfect.
function blobPath(r: number, wobble: number, lobes: number, phase: number): string {
    const pts: string[] = [];
    for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const rr = r + wobble * Math.sin(a * lobes + phase) + wobble * 0.5 * Math.sin(a * (lobes + 3) + phase * 2);
        pts.push(`${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`);
    }
    return `M${pts.join(' L')} Z`;
}

const SAUCE_PATH = blobPath(71, 2.5, 7, 0.5);
const CHEESE_PATH = blobPath(64, 4, 9, 1.7);
const CHEESE_SPOTS: [number, number, number][] = [[-30, -18, 6], [22, -34, 4], [35, 15, 7], [-12, 38, 5], [-44, 20, 4], [8, 4, 5]];

// Fixed spots for each topping's pieces: a golden-angle spiral, offset per topping
// so they spread out evenly and the pizza looks the same every time.
const PIECES_PER_TOPPING = 7;
const PLACEMENTS: Record<ToppingId, { x: number; y: number; rot: number }[]> = Object.fromEntries(
    TOPPINGS.map((t, ti) => [t.id, Array.from({length: PIECES_PER_TOPPING}, (_, k) => {
        const angle = k * 2.39996 + ti * 1.3;
        const rad = 14 + 44 * Math.sqrt((k + 0.5) / PIECES_PER_TOPPING);
        return {x: Math.cos(angle) * rad, y: Math.sin(angle) * rad, rot: (k * 97 + ti * 53) % 360};
    })]),
) as Record<ToppingId, { x: number; y: number; rot: number }[]>;

// One topping piece centered at 0,0 (about 20 units across).
function ToppingPiece({id}: { id: ToppingId }) {
    switch (id) {
        case 'pepperoni':
            return (
                <g>
                    <circle r={10} fill="#C8372D" stroke={INK} strokeWidth={2}/>
                    <circle cx={-3} cy={-2} r={1.6} fill="#8E1F17"/>
                    <circle cx={3.5} cy={2} r={1.4} fill="#8E1F17"/>
                    <circle cx={-1} cy={4.5} r={1.2} fill="#8E1F17"/>
                    <path d="M-6 -5 A8 8 0 0 1 2 -7.5" stroke="#ffffff88" strokeWidth={2} fill="none" strokeLinecap="round"/>
                </g>
            );
        case 'mushroom':
            return (
                <g strokeLinejoin="round">
                    <path d="M-3.5 0 L-3.5 8 Q0 10.5 3.5 8 L3.5 0 Z" fill="#F5EDE0" stroke={INK} strokeWidth={2}/>
                    <path d="M-10 1 C-10 -10 10 -10 10 1 Q0 -2 -10 1 Z" fill="#C99A6B" stroke={INK} strokeWidth={2}/>
                    <path d="M-5 -4 Q-3 -6 0 -6.5" stroke="#ffffff77" strokeWidth={1.6} fill="none" strokeLinecap="round"/>
                </g>
            );
        case 'olive':
            return (
                <g fill="none">
                    <circle r={6} stroke={INK} strokeWidth={6}/>
                    <circle r={6} stroke="#2E2E2E" strokeWidth={3.5}/>
                    <path d="M-4 -3 A5 5 0 0 1 0 -6" stroke="#ffffff66" strokeWidth={1.2} strokeLinecap="round"/>
                </g>
            );
        case 'pepper':
            return (
                <g fill="none" strokeLinecap="round">
                    <path d="M-8 4 A8.5 8.5 0 1 1 6 6" stroke={INK} strokeWidth={6}/>
                    <path d="M-8 4 A8.5 8.5 0 1 1 6 6" stroke="#3DAA4A" strokeWidth={3.4}/>
                </g>
            );
        case 'onion':
            return (
                <g fill="none" strokeLinecap="round">
                    <path d="M-9 3 A9.5 9.5 0 0 1 9 3" stroke={INK} strokeWidth={4.6}/>
                    <path d="M-9 3 A9.5 9.5 0 0 1 9 3" stroke="#D3A6EA" strokeWidth={2.6}/>
                    <path d="M-5 4 A5.5 5.5 0 0 1 5 4" stroke={INK} strokeWidth={4}/>
                    <path d="M-5 4 A5.5 5.5 0 0 1 5 4" stroke="#B57CD0" strokeWidth={2}/>
                </g>
            );
        case 'pineapple':
            return (
                <g strokeLinejoin="round">
                    <path d="M-8 6 L0 -9 L8 6 Q0 9 -8 6 Z" fill="#FFD93B" stroke={INK} strokeWidth={2}/>
                    <path d="M-3 3 L0 -3 L3 3" stroke="#E0A91C" strokeWidth={1.4} fill="none"/>
                </g>
            );
        case 'basil':
            return (
                <g>
                    <path d="M-10 0 Q0 -9 10 0 Q0 9 -10 0 Z" fill="#2E8B3A" stroke={INK} strokeWidth={1.8}/>
                    <path d="M-7 0 L8 0 M-1 0 L3 -3 M-1 0 L3 3" stroke="#7CCB6A" strokeWidth={1} fill="none" strokeLinecap="round"/>
                </g>
            );
        case 'cheese':
            // Only used as a button icon; on the pizza cheese is a melted layer.
            return (
                <g strokeLinejoin="round">
                    <path d="M-10 6 L10 6 L10 -2 L-10 -8 Z" fill="#FFD95A" stroke={INK} strokeWidth={2}/>
                    <circle cx={-2} cy={1} r={1.8} fill="#E8B630"/>
                    <circle cx={5} cy={2.5} r={1.3} fill="#E8B630"/>
                </g>
            );
    }
}

function Pizza({sauce, toppings, className, animated = false}: {
    sauce: SauceId | null;
    toppings: ToppingId[];
    className?: string;
    animated?: boolean;
}) {
    // Pieces pop in when animated (the pizza you're building); tickets stay static.
    const Layer = animated ? motion.g : 'g';
    const pop = animated
        ? {initial: {scale: 0, opacity: 0}, animate: {scale: 1, opacity: 1}}
        : {};
    const pieces = toppings.filter(t => t !== 'cheese');

    return (
        <svg viewBox="-100 -100 200 200" className={className} aria-hidden>
            <ellipse cx={0} cy={8} rx={94} ry={92} fill="rgba(0,0,0,0.18)"/>
            <circle r={90} fill="#E9A04F" stroke={INK} strokeWidth={4}/>
            <circle r={83} fill="none" stroke="#F6C27A" strokeWidth={4} opacity={0.8}/>
            <circle r={75} fill="#F7D9A0" stroke="#D99A52" strokeWidth={2}/>
            {sauce && (
                <Layer key={`sauce-${sauce}`} {...pop}>
                    <path d={SAUCE_PATH} fill={sauceInfo(sauce).color} stroke={INK} strokeOpacity={0.35} strokeWidth={2}/>
                </Layer>
            )}
            {toppings.includes('cheese') && (
                <Layer key="cheese" {...pop}>
                    <path d={CHEESE_PATH} fill="#FFD95A" fillOpacity={0.93} stroke="#E0A82E" strokeWidth={2}/>
                    {CHEESE_SPOTS.map(([x, y, r]) => <circle key={`${x},${y}`} cx={x} cy={y} r={r} fill="#FFF0A8"/>)}
                </Layer>
            )}
            {pieces.map(t => (
                <g key={t}>
                    {PLACEMENTS[t].map((p, k) => (
                        <g key={k} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot})`}>
                            <Layer
                                {...pop}
                                {...(animated ? {transition: {type: 'spring', stiffness: 500, damping: 18, delay: k * 0.03}} : {})}
                            >
                                <ToppingPiece id={t}/>
                            </Layer>
                        </g>
                    ))}
                </g>
            ))}
        </svg>
    );
}

function CustomerFace({look, mood, className}: { look: Look; mood: Mood; className?: string }) {
    const hair = [
        'M-16 -4 Q-17 -21 0 -21 Q17 -21 16 -4 Q9 -13 0 -13 Q-9 -13 -16 -4 Z',
        'M-16 -5 L-13 -18 L-7 -13 L-3 -22 L2 -14 L7 -21 L10 -13 L15 -17 L16 -5 Q8 -12 0 -12 Q-8 -12 -16 -5 Z',
        'M-16 -3 Q-17 -20 0 -20 Q17 -20 16 -3 Q12 -12 0 -12 Q-12 -12 -16 -3 Z',
    ][look.style];
    const mouth = {
        happy: 'M-6 4 Q0 10.5 6 4',
        ok: 'M-5 6 L5 6',
        mad: 'M-6 8.5 Q0 2.5 6 8.5',
    }[mood];

    return (
        <svg viewBox="-30 -30 60 60" className={className} aria-hidden>
            <path d="M-22 30 Q-22 13 0 13 Q22 13 22 30 Z" fill={look.shirt} stroke={INK} strokeWidth={2}/>
            <circle cy={-2} r={16} fill={look.skin} stroke={INK} strokeWidth={2}/>
            {look.style === 2 && <circle cy={-23} r={6} fill={look.hair} stroke={INK} strokeWidth={2}/>}
            <path d={hair} fill={look.hair} stroke={INK} strokeWidth={2} strokeLinejoin="round"/>
            <circle cx={-6} cy={-2} r={2} fill={INK}/>
            <circle cx={6} cy={-2} r={2} fill={INK}/>
            {mood === 'happy' && (
                <>
                    <circle cx={-10} cy={4} r={2.6} fill="#FF8A8A" opacity={0.55}/>
                    <circle cx={10} cy={4} r={2.6} fill="#FF8A8A" opacity={0.55}/>
                </>
            )}
            {mood === 'mad' && (
                <path d="M-10 -8 L-3 -5.5 M10 -8 L3 -5.5" stroke={INK} strokeWidth={2} strokeLinecap="round"/>
            )}
            <path d={mouth} stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round"/>
        </svg>
    );
}

// ---------- UI pieces ----------
const PRIMARY_BTN = 'px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2';
const SECONDARY_BTN = 'px-4 py-2.5 bg-gray-100 dark:bg-[#1C1A1B] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2';

function Ticket({order, clock, selected, onSelect}: {
    order: Order;
    clock: number;
    selected: boolean;
    onSelect: () => void;
}) {
    const frac = timeLeft(order, clock);
    const mood = moodFor(frac);
    const bar = mood === 'happy' ? 'bg-green-500' : mood === 'ok' ? 'bg-yellow-400' : 'bg-red-500 animate-pulse';

    return (
        <motion.button
            layout
            initial={{opacity: 0, y: -24, scale: 0.9}}
            animate={{opacity: 1, y: 0, scale: 1}}
            exit={{opacity: 0, scale: 0.8, transition: {duration: 0.2}}}
            onClick={onSelect}
            className={`shrink-0 w-28 md:w-40 rounded-2xl p-2 md:p-2.5 text-left bg-white dark:bg-[#0D0C0C] border-2 transition-colors ${
                selected ? 'border-blue-500 shadow-lg' : 'border-transparent shadow-sm hover:border-blue-300 dark:hover:border-blue-800'
            }`}
        >
            <div className="flex items-center gap-2">
                <CustomerFace look={order.look} mood={mood} className="w-8 h-8 md:w-10 md:h-10 shrink-0"/>
                <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{order.name}</div>
                    <div className={`text-[11px] ${selected ? 'text-blue-500 font-semibold' : 'text-[#86868b]'}`}>
                        {selected ? 'Serving' : 'Tap to serve'}
                    </div>
                </div>
            </div>
            <Pizza sauce={order.sauce} toppings={order.toppings} className="hidden md:block w-16 h-16 mx-auto my-1.5"/>
            <div className="mt-1 md:mt-0 text-[11px] md:text-xs leading-snug min-h-[2.75rem]">
                <div className="font-semibold">{sauceInfo(order.sauce).label} sauce</div>
                <div className="text-[#86868b]">
                    {order.toppings.length ? order.toppings.map(t => toppingInfo(t).label).join(', ') : 'No toppings'}
                </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-[#1C1A1B] overflow-hidden">
                <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${bar}`} style={{width: `${frac * 100}%`}}/>
            </div>
        </motion.button>
    );
}

function IngredientButton({label, hotkey, active, locked, unlock, onClick, icon}: {
    label: string;
    hotkey: string;
    active: boolean;
    locked: boolean;
    unlock: number;
    onClick: () => void;
    icon: ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            disabled={locked}
            aria-pressed={active}
            className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-1 md:px-2.5 py-1.5 md:py-2 rounded-xl border-2 text-[11px] md:text-sm font-semibold transition-colors md:text-left disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15'
                    : 'border-transparent bg-gray-100 dark:bg-[#1C1A1B] enabled:hover:bg-gray-200 dark:enabled:hover:bg-[#2a2a2a]'
            }`}
        >
            <svg viewBox="-13 -13 26 26" className="w-6 h-6 shrink-0" aria-hidden>{icon}</svg>
            <span className="truncate max-w-full">{label}</span>
            <span className="hidden md:inline ml-auto text-[10px] font-mono uppercase text-[#86868b]">
                {locked ? `Lv${unlock}` : hotkey}
            </span>
        </button>
    );
}

function Strikes({count}: { count: number }) {
    return (
        <div className="flex gap-1" aria-label={`${count} of ${MAX_STRIKES} strikes`}>
            {Array.from({length: MAX_STRIKES}, (_, i) => (
                <span
                    key={i}
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        i < count ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-[#1C1A1B] text-gray-300 dark:text-gray-600'
                    }`}
                >✕</span>
            ))}
        </div>
    );
}

const TOAST_COLOR = {good: 'text-green-600 dark:text-green-400', bad: 'text-red-500', info: 'text-blue-500'};

function Toasts({toasts, className}: { toasts: Toast[]; className: string }) {
    return (
        <div className={`pointer-events-none flex-col items-center gap-1 px-2 z-10 ${className}`}>
            <AnimatePresence>
                {toasts.map(t => (
                    <motion.div
                        key={t.id}
                        initial={{opacity: 0, y: 10}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -10}}
                        className={`max-w-full text-center text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-white dark:bg-[#2a2728] shadow-md ${TOAST_COLOR[t.tone]}`}
                    >
                        {t.text}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

function Overlay({children}: { children: ReactNode }) {
    return (
        <div className="absolute inset-0 z-20 flex items-start md:items-center justify-center pt-10 md:pt-0 p-4 rounded-2xl bg-white/70 dark:bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{opacity: 0, scale: 0.95}}
                animate={{opacity: 1, scale: 1}}
                className="w-full max-w-sm bg-white dark:bg-[#0D0C0C] rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-3 text-center"
            >
                {children}
            </motion.div>
        </div>
    );
}

// ---------- The game ----------
function PizzaGame() {
    const [s, dispatch] = useReducer(reducer, undefined, () => freshGame(readBest(), 'ready'));

    // Game loop: advance the clock ~10x a second while playing.
    useEffect(() => {
        if (s.phase !== 'playing') return;
        let last = performance.now();
        const id = setInterval(() => {
            const now = performance.now();
            dispatch({type: 'tick', dt: Math.min(now - last, 250)});
            last = now;
        }, 100);
        return () => clearInterval(id);
    }, [s.phase]);

    // Pause if the browser tab is hidden so customers don't walk out on you.
    useEffect(() => {
        const onVisibility = () => {
            if (document.hidden) dispatch({type: 'pause'});
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(BEST_KEY, String(s.best));
        } catch {
            // Storage blocked (private mode etc). Best score just won't persist.
        }
    }, [s.best]);

    // Keyboard shortcuts.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const k = e.key.toLowerCase();
            let action: Action | null = null;
            if (s.phase === 'playing') {
                const sauce = SAUCES.find(x => x.key === k && x.unlock <= s.level);
                const topping = TOPPINGS.find(x => x.key === k && x.unlock <= s.level);
                if (sauce) action = {type: 'sauce', sauce: sauce.id};
                else if (topping) action = {type: 'topping', topping: topping.id};
                else if (k === 'enter') action = {type: 'serve'};
                else if (k === 'backspace' || k === 'x') action = {type: 'clear'};
                else if (k === 'arrowleft') action = {type: 'cycle', dir: -1};
                else if (k === 'arrowright') action = {type: 'cycle', dir: 1};
                else if (k === 'escape') action = {type: 'pause'};
            } else if (k === 'enter') {
                action = s.phase === 'paused' ? {type: 'resume'} : {type: 'start'};
            }
            if (!action) return;
            e.preventDefault(); // stop Enter from also clicking a focused button
            dispatch(action);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [s.phase, s.level]);

    const selected = s.orders.find(o => o.id === s.selectedId) ?? null;
    const levelProgress = (s.clock % LEVEL_MS) / LEVEL_MS;

    return (
        <div className="relative flex flex-col gap-3 md:gap-4 p-2 md:p-4 max-w-5xl mx-auto w-full">
            {/* HUD */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-end gap-5">
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Score</div>
                        <div className={`text-2xl md:text-3xl font-semibold tabular-nums ${s.score < 0 ? 'text-red-500' : ''}`}>{s.score}</div>
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Level {s.level}</div>
                        <div className="mt-2 h-1.5 w-20 rounded-full bg-gray-100 dark:bg-[#1C1A1B] overflow-hidden">
                            <div className="h-full bg-orange-400 transition-[width] duration-100 ease-linear" style={{width: `${levelProgress * 100}%`}}/>
                        </div>
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Served</div>
                        <div className="text-lg font-semibold tabular-nums">{s.served}</div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Strikes count={s.strikes}/>
                    <div className="hidden sm:block text-sm text-[#86868b] tabular-nums">Best {s.best}</div>
                    <button
                        onClick={() => dispatch({type: s.phase === 'paused' ? 'resume' : 'pause'})}
                        disabled={s.phase !== 'playing' && s.phase !== 'paused'}
                        aria-label={s.phase === 'paused' ? 'Resume' : 'Pause'}
                        className="h-9 w-9 rounded-full bg-gray-100 dark:bg-[#1C1A1B] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] disabled:opacity-40 flex items-center justify-center"
                    >
                        <FontAwesomeIcon icon={s.phase === 'paused' ? faPlay : faPause}/>
                    </button>
                </div>
            </div>

            {/* The counter: customers and their orders. Sticky on phones so the
                orders stay in view while you scroll down to the toppings. */}
            <div className="sticky md:static top-0 z-10">
                <div className="rounded-2xl bg-orange-50 dark:bg-[#161415] p-2 md:p-3 min-h-[8rem] md:min-h-[14rem] flex gap-2 md:gap-3 overflow-x-auto items-start shadow-sm md:shadow-none">
                    <AnimatePresence mode="popLayout">
                        {s.orders.map(o => (
                            <Ticket
                                key={o.id}
                                order={o}
                                clock={s.clock}
                                selected={o.id === s.selectedId}
                                onSelect={() => dispatch({type: 'select', id: o.id})}
                            />
                        ))}
                    </AnimatePresence>
                    {s.orders.length === 0 && (
                        <div className="m-auto text-sm text-[#86868b]">
                            {s.phase === 'playing' ? 'Here comes someone…' : 'The counter is empty.'}
                        </div>
                    )}
                </div>
                <Toasts toasts={s.toasts} className="flex md:hidden absolute inset-x-0 -bottom-3"/>
            </div>

            {/* The kitchen. Desktop: pizza on the left, ingredients and Serve on the right.
                Phone: pizza beside Serve, ingredients below. */}
            <div className="relative grid grid-cols-[auto_1fr] gap-3 md:gap-x-6 md:gap-y-3 items-center">
                <div className="relative md:row-start-1 md:row-span-3 rounded-3xl md:rounded-[2rem] bg-[#E7B77A] dark:bg-[#5A3A22] p-2 md:p-4 shadow-inner">
                    <Pizza sauce={s.sauce} toppings={s.toppings} animated className="w-28 h-28 sm:w-44 sm:h-44 md:w-64 md:h-64"/>
                    <Toasts toasts={s.toasts} className="hidden md:flex absolute inset-x-0 top-2"/>
                </div>

                <div className="md:col-start-2 md:row-start-3 flex flex-col gap-2 min-w-0">
                    <div className="flex flex-col md:flex-row gap-2">
                        <button
                            onClick={() => dispatch({type: 'serve'})}
                            disabled={s.phase !== 'playing' || !selected}
                            className={`${PRIMARY_BTN} md:flex-1 min-w-0`}
                        >
                            <FontAwesomeIcon icon={faBellConcierge}/>
                            <span className="truncate">{selected ? `Serve ${selected.name}` : 'Serve'}</span>
                        </button>
                        <button onClick={() => dispatch({type: 'clear'})} className={SECONDARY_BTN}>
                            <FontAwesomeIcon icon={faTrashCan}/>
                            Trash
                        </button>
                    </div>
                    <p className="text-xs text-[#86868b]">
                        <span className="hidden md:inline">
                            Keys: 1–4 sauce, letters for toppings, Enter to serve, X to trash, ←/→ to switch customer, Esc to pause.
                        </span>
                        <span className="md:hidden">Tap a ticket to choose who you're serving.</span>
                    </p>
                </div>

                <div className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-1">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Sauce</h4>
                    <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                        {SAUCES.map(x => (
                            <IngredientButton
                                key={x.id}
                                label={x.label}
                                hotkey={x.key}
                                unlock={x.unlock}
                                locked={x.unlock > s.level}
                                active={s.sauce === x.id}
                                onClick={() => dispatch({type: 'sauce', sauce: x.id})}
                                icon={<circle r={9} fill={x.color} stroke={INK} strokeWidth={2}/>}
                            />
                        ))}
                    </div>
                </div>
                <div className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-2">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Toppings</h4>
                    <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                        {TOPPINGS.map(x => (
                            <IngredientButton
                                key={x.id}
                                label={x.label}
                                hotkey={x.key}
                                unlock={x.unlock}
                                locked={x.unlock > s.level}
                                active={s.toppings.includes(x.id)}
                                onClick={() => dispatch({type: 'topping', topping: x.id})}
                                icon={<ToppingPiece id={x.id}/>}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {s.phase === 'ready' && (
                <Overlay>
                    <Pizza sauce="tomato" toppings={['cheese', 'pepperoni', 'mushroom', 'basil']} className="w-24 h-24"/>
                    <h3 className="text-2xl font-semibold">Pizza Rush</h3>
                    <ul className="text-sm text-[#86868b] text-left list-disc pl-5 space-y-1">
                        <li>Customers walk in with orders. Pick the sauce and toppings, then serve.</li>
                        <li>Perfect pizzas score points, more if you're quick.</li>
                        <li>A wrong or late order costs points and a strike. Three strikes and the shift's over.</li>
                        <li>It gets busier every 30 seconds.</li>
                    </ul>
                    <button onClick={() => dispatch({type: 'start'})} className={`${PRIMARY_BTN} w-full`}>
                        <FontAwesomeIcon icon={faPlay}/> Open the shop
                    </button>
                </Overlay>
            )}
            {s.phase === 'paused' && (
                <Overlay>
                    <h3 className="text-2xl font-semibold">Paused</h3>
                    <p className="text-sm text-[#86868b]">The customers are frozen in time. Lucky you.</p>
                    <button onClick={() => dispatch({type: 'resume'})} className={`${PRIMARY_BTN} w-full`}>
                        <FontAwesomeIcon icon={faPlay}/> Resume
                    </button>
                </Overlay>
            )}
            {s.phase === 'over' && (
                <Overlay>
                    <h3 className="text-2xl font-semibold">Shift's over!</h3>
                    <div className={`text-5xl font-semibold tabular-nums ${s.score < 0 ? 'text-red-500' : ''}`}>{s.score}</div>
                    {s.newBest && <div className="text-sm font-semibold text-green-600 dark:text-green-400">🎉 New best score!</div>}
                    <p className="text-sm text-[#86868b]">
                        {s.served} {s.served === 1 ? 'pizza' : 'pizzas'} served · reached level {s.level} · best {s.best}
                    </p>
                    <button onClick={() => dispatch({type: 'start'})} className={`${PRIMARY_BTN} w-full`}>
                        <FontAwesomeIcon icon={faRotateRight}/> Play again
                    </button>
                </Overlay>
            )}
        </div>
    );
}

// ---------- Modal (Source Code / Play tabs) ----------
export default function PizzaGameModal({project}: { project: Project }) {
    const files = project.files.filter((f): f is ProjectFile => f.type === 'file');
    const [activeTab, setActiveTab] = useState<'code' | 'play'>('play');
    const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(files[0] ?? null);

    const tabClass = (tab: typeof activeTab) =>
        `px-3 sm:px-6 py-1.5 rounded-lg text-sm transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-600 shadow-sm' : 'opacity-50'}`;

    return (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col p-2 bg-white dark:bg-[#0D0C0C] rounded-xl overflow-x-hidden">
            <div className="flex justify-center p-2">
                <div className="flex bg-gray-100 dark:bg-[#1C1A1B] p-1 rounded-xl">
                    <button onClick={() => setActiveTab('code')} className={tabClass('code')}>Source Code</button>
                    <button onClick={() => setActiveTab('play')} className={tabClass('play')}>Play</button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                {activeTab === 'code' ? (
                    <div className="flex flex-col md:flex-row h-full">
                        <aside className="hidden md:flex flex-col w-max shrink-0 border-r border-gray-100 dark:border-[#1C1A1B] bg-gray-50/50 dark:bg-[#0D0C0C] p-4 overflow-y-auto">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Files</h4>
                            <FileTree
                                items={project.files}
                                onFileClick={(file) => setSelectedFile(file)}
                                selectedFile={selectedFile?.name ?? null}
                            />
                        </aside>
                        <main className="flex-1 min-w-0 flex flex-col bg-white dark:bg-[#0D0C0C] overflow-hidden">
                            <div className="flex overflow-auto bg-[#282c34] rounded-xl m-2">
                                <div style={{width: 'max-content', minWidth: '100%', paddingRight: '12px', boxSizing: 'border-box'}}>
                                    <SyntaxHighlighter
                                        language={selectedFile?.language || 'tsx'}
                                        style={oneDark}
                                        customStyle={{
                                            margin: 0,
                                            padding: '24px',
                                            fontSize: '14px',
                                            lineHeight: '1.5',
                                            backgroundColor: 'transparent',
                                            overflow: 'visible',
                                            minHeight: '100%',
                                        }}
                                    >
                                        {selectedFile?.content || ''}
                                    </SyntaxHighlighter>
                                </div>
                            </div>
                        </main>
                    </div>
                ) : (
                    <PizzaGame/>
                )}
            </div>
        </div>
    );
}
