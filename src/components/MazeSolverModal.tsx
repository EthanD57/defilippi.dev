import {useEffect, useMemo, useRef, useState, type TouchEvent} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faArrowDown, faArrowLeft, faArrowRight, faArrowUp, faEye, faEyeSlash, faPlay, faRotateRight, faShuffle,
} from '@fortawesome/free-solid-svg-icons';
import type {Project, ProjectFile, ProjectFolder} from '../projects';
import FileTree from './FileTree';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {oneDark} from 'react-syntax-highlighter/dist/esm/styles/prism';

// Each cell stores which walls are still standing.
type Cell = { top: boolean; right: boolean; bottom: boolean; left: boolean };
type Pos = { r: number; c: number };
type Point = [number, number];

// The canvas always draws at this many pixels and CSS scales it to fit,
// so small mazes aren't tiny and big mazes don't overflow on phones.
const CANVAS_PX = 640;

const COLORS = {
    bg: '#0f172a',
    wall: '#e2e8f0',
    start: '#22c55e',
    goal: '#ef4444',
    explored: 'rgba(56, 189, 248, 0.22)',
    trying: '#fb923c',   // route A* is currently testing
    path: '#facc15',     // final shortest path
    player: '#60a5fa',
};

// Shared Tailwind classes, matching the buttons in the other project modals.
const CANVAS_CLASS = 'w-full max-w-[min(40rem,calc(85vh-11rem))] aspect-square rounded-xl border border-gray-100 dark:border-[#1C1A1B]';
const PRIMARY_BTN = 'w-full px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2';
const SECONDARY_BTN = 'w-full px-4 py-2.5 bg-gray-100 dark:bg-[#1C1A1B] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2';

// ---------- Maze generation (iterative recursive backtracker) ----------
function generateMaze(size: number): Cell[][] {
    const grid: Cell[][] = Array.from({length: size}, () =>
        Array.from({length: size}, () => ({top: true, right: true, bottom: true, left: true}))
    );
    const visited = Array.from({length: size}, () => Array(size).fill(false));
    const stack: Pos[] = [{r: 0, c: 0}];
    visited[0][0] = true;

    while (stack.length) {
        const {r, c} = stack[stack.length - 1];
        const options: { r: number; c: number; dir: 'top' | 'right' | 'bottom' | 'left' }[] = [];
        if (r > 0 && !visited[r - 1][c]) options.push({r: r - 1, c, dir: 'top'});
        if (c < size - 1 && !visited[r][c + 1]) options.push({r, c: c + 1, dir: 'right'});
        if (r < size - 1 && !visited[r + 1][c]) options.push({r: r + 1, c, dir: 'bottom'});
        if (c > 0 && !visited[r][c - 1]) options.push({r, c: c - 1, dir: 'left'});

        if (options.length === 0) {
            stack.pop();
            continue;
        }
        const next = options[Math.floor(Math.random() * options.length)];
        // Knock down the wall between the current cell and the chosen neighbor.
        if (next.dir === 'top') { grid[r][c].top = false; grid[next.r][next.c].bottom = false; }
        if (next.dir === 'right') { grid[r][c].right = false; grid[next.r][next.c].left = false; }
        if (next.dir === 'bottom') { grid[r][c].bottom = false; grid[next.r][next.c].top = false; }
        if (next.dir === 'left') { grid[r][c].left = false; grid[next.r][next.c].right = false; }
        visited[next.r][next.c] = true;
        stack.push({r: next.r, c: next.c});
    }
    return grid;
}

// Can you step from p in direction (dr, dc) without hitting a wall?
function canMove(maze: Cell[][], p: Pos, dr: number, dc: number): boolean {
    const cell = maze[p.r][p.c];
    if (dr === -1) return !cell.top;
    if (dr === 1) return !cell.bottom;
    if (dc === -1) return !cell.left;
    return !cell.right;
}

// ---------- A* solver ----------
// Returns the cells in the order they were explored, the final path, and a
// routeTo() helper that rebuilds the start -> cell route for any explored cell
// (used to animate the route A* is currently trying).
function solveAStar(grid: Cell[][]): { explored: Pos[]; path: Pos[]; routeTo: (p: Pos) => Pos[] } {
    const size = grid.length;
    const goal: Pos = {r: size - 1, c: size - 1};
    const key = (p: Pos) => p.r * size + p.c;
    const h = (p: Pos) => Math.abs(p.r - goal.r) + Math.abs(p.c - goal.c);

    const gScore = new Map<number, number>([[0, 0]]);
    const cameFrom = new Map<number, number>();
    // Simple array as the open set. Fine for grids this small (max 40x40).
    const open: { pos: Pos; f: number }[] = [{pos: {r: 0, c: 0}, f: h({r: 0, c: 0})}];
    const closed = new Set<number>();
    const explored: Pos[] = [];

    // Walk backwards through cameFrom to rebuild the route to a cell.
    const routeTo = (p: Pos): Pos[] => {
        const route: Pos[] = [];
        let cur: number | undefined = key(p);
        while (cur !== undefined) {
            route.push({r: Math.floor(cur / size), c: cur % size});
            cur = cameFrom.get(cur);
        }
        return route.reverse();
    };

    while (open.length) {
        // Pull the lowest f-score node.
        let best = 0;
        for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
        const {pos} = open.splice(best, 1)[0];
        const k = key(pos);
        if (closed.has(k)) continue;
        closed.add(k);
        explored.push(pos);

        if (pos.r === goal.r && pos.c === goal.c) {
            return {explored, path: routeTo(pos), routeTo};
        }

        const neighbors: Pos[] = [];
        for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
            if (canMove(grid, pos, dr, dc)) neighbors.push({r: pos.r + dr, c: pos.c + dc});
        }

        for (const n of neighbors) {
            const nk = key(n);
            if (closed.has(nk)) continue;
            const tentative = (gScore.get(k) ?? 0) + 1;
            if (tentative < (gScore.get(nk) ?? Infinity)) {
                gScore.set(nk, tentative);
                cameFrom.set(nk, k);
                open.push({pos: n, f: tentative + h(n)});
            }
        }
    }
    return {explored, path: [], routeTo};
}

// ---------- Canvas drawing ----------
const center = (p: Pos, cs: number): Point => [(p.c + 0.5) * cs, (p.r + 0.5) * cs];

// Background, optional shaded cells, start/goal markers, and walls.
function drawBoard(ctx: CanvasRenderingContext2D, maze: Cell[][], shaded: Pos[] = []) {
    const n = maze.length;
    const cs = CANVAS_PX / n;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

    ctx.fillStyle = COLORS.explored;
    for (const p of shaded) ctx.fillRect(p.c * cs, p.r * cs, cs, cs);

    drawDot(ctx, center({r: 0, c: 0}, cs), COLORS.start, cs * 0.3);
    drawDot(ctx, center({r: n - 1, c: n - 1}, cs), COLORS.goal, cs * 0.3);

    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = 2;
    ctx.lineCap = 'square';
    ctx.beginPath();
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const x = c * cs;
            const y = r * cs;
            const w = maze[r][c];
            if (w.top) { ctx.moveTo(x, y); ctx.lineTo(x + cs, y); }
            if (w.right) { ctx.moveTo(x + cs, y); ctx.lineTo(x + cs, y + cs); }
            if (w.bottom) { ctx.moveTo(x, y + cs); ctx.lineTo(x + cs, y + cs); }
            if (w.left) { ctx.moveTo(x, y); ctx.lineTo(x, y + cs); }
        }
    }
    ctx.stroke();
}

function drawLine(ctx: CanvasRenderingContext2D, pts: Point[], color: string, width: number) {
    if (pts.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, width);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
    ctx.stroke();
}

function drawDot(ctx: CanvasRenderingContext2D, [x, y]: Point, color: string, radius: number) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, radius), 0, Math.PI * 2);
    ctx.fill();
}

// Speed slider level 1-10 -> cells explored per second (5, 10, 20 ... 2560).
const cellsPerSecond = (level: number) => 5 * 2 ** (level - 1);

const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function SizeSlider({size, setSize}: { size: number; setSize: (n: number) => void }) {
    return (
        <label className="flex items-center justify-between gap-3">
            <span>Size: {size}×{size}</span>
            <input
                type="range"
                min={8}
                max={40}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-36 accent-blue-500"
            />
        </label>
    );
}

// ---------- A* solver demo ----------
// Each tab is its own component, so switching tabs or closing the modal
// unmounts it and the cleanup cancels any running animation.
function SolverDemo() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number | null>(null);
    const speedRef = useRef(5);

    const [size, setSize] = useState(20);
    const [speed, setSpeed] = useState(5);
    const [maze, setMaze] = useState<Cell[][]>(() => generateMaze(20));
    const [status, setStatus] = useState('Hit Solve to watch A* find the exit.');
    const [solving, setSolving] = useState(false);

    const stopAnimation = () => {
        if (animRef.current !== null) cancelAnimationFrame(animRef.current);
        animRef.current = null;
    };

    // Draw the empty maze whenever a new one is generated.
    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) drawBoard(ctx, maze);
    }, [maze]);

    useEffect(() => () => {
        if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    }, []);

    const handleGenerate = () => {
        stopAnimation();
        setSolving(false);
        setMaze(generateMaze(size));
        setStatus('New maze ready. Hit Solve.');
    };

    const handleClear = () => {
        stopAnimation();
        setSolving(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) drawBoard(ctx, maze);
        setStatus('Path cleared.');
    };

    // Two phases, drawn straight to the canvas each frame:
    // 1. Search: shade explored cells and draw an orange line along the route
    //    A* is currently trying, so you can watch it chase dead ends.
    // 2. Trace: once the exit is found, draw the shortest path as a yellow line
    //    growing from start to goal.
    const handleSolve = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        stopAnimation();
        setSolving(true);
        setStatus('Searching... the orange line is the route A* is trying.');

        const {explored, path, routeTo} = solveAStar(maze);
        const cs = CANVAS_PX / maze.length;
        const pathPts = path.map(p => center(p, cs));
        let shown = 0;   // explored cells revealed so far (fractional)
        let traced = 0;  // path segments drawn so far (fractional)
        let lastTs: number | null = null;

        const frame = (ts: number) => {
            const dt = lastTs === null ? 0 : Math.min((ts - lastTs) / 1000, 0.1);
            lastTs = ts;
            const rate = cellsPerSecond(speedRef.current);

            if (shown < explored.length) {
                shown = Math.min(explored.length, shown + rate * dt);
                const i = Math.max(1, Math.floor(shown));
                const head = explored[i - 1];
                drawBoard(ctx, maze, explored.slice(0, i));
                drawLine(ctx, routeTo(head).map(p => center(p, cs)), COLORS.trying, cs * 0.22);
                drawDot(ctx, center(head, cs), COLORS.trying, cs * 0.3);
                if (shown >= explored.length) setStatus('Found the exit! Tracing the shortest path...');
            } else {
                // Trace at the chosen speed, but never take longer than ~2.5s.
                const segments = pathPts.length - 1;
                traced = Math.min(segments, traced + Math.max(rate, segments / 2.5) * dt);
                const whole = Math.floor(traced);
                const pts = pathPts.slice(0, whole + 1);
                if (whole < segments) {
                    // Smoothly interpolate the head between two cells.
                    const [ax, ay] = pathPts[whole];
                    const [bx, by] = pathPts[whole + 1];
                    const f = traced - whole;
                    pts.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
                }
                drawBoard(ctx, maze, explored);
                drawLine(ctx, pts, COLORS.path, cs * 0.3);
                drawDot(ctx, pts[pts.length - 1], '#ffffff', cs * 0.22);

                if (traced >= segments) {
                    animRef.current = null;
                    setSolving(false);
                    setStatus(
                        `Solved! Shortest path is ${path.length} cells. A* explored ${explored.length} of ${maze.length ** 2} cells to find it.`
                    );
                    return;
                }
            }
            animRef.current = requestAnimationFrame(frame);
        };
        animRef.current = requestAnimationFrame(frame);
    };

    // Canvas beside the controls on wide screens, stacked on phones. The canvas
    // is capped by the modal height (85vh minus header/tabs) so it never gets cut off.
    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-4">
            <canvas ref={canvasRef} width={CANVAS_PX} height={CANVAS_PX} className={CANVAS_CLASS}/>

            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <p className="min-h-10 text-sm text-[#86868b] text-center">{status}</p>

                <button onClick={handleSolve} disabled={solving} className={PRIMARY_BTN}>
                    <FontAwesomeIcon icon={faPlay}/>
                    Solve with A*
                </button>
                <button onClick={handleGenerate} className={SECONDARY_BTN}>
                    <FontAwesomeIcon icon={faShuffle}/>
                    Generate Maze
                </button>
                <button onClick={handleClear} className={SECONDARY_BTN}>
                    <FontAwesomeIcon icon={faRotateRight}/>
                    Clear Path
                </button>

                <div className="w-full flex flex-col gap-2 pt-2 text-sm text-gray-700 dark:text-gray-300">
                    <SizeSlider size={size} setSize={setSize}/>
                    <label className="flex items-center justify-between gap-3">
                        <span>Speed</span>
                        <input
                            type="range"
                            min={1}
                            max={10}
                            value={speed}
                            onChange={(e) => {
                                speedRef.current = Number(e.target.value);
                                setSpeed(speedRef.current);
                            }}
                            className="w-36 accent-blue-500"
                        />
                    </label>
                </div>

                <p className="text-xs text-[#86868b] text-center">
                    Size applies on the next Generate. Everything runs in your browser.
                </p>
            </div>
        </div>
    );
}

// ---------- Play it yourself ----------
function PlayMaze() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const touchStart = useRef<Point | null>(null);

    const [size, setSize] = useState(12);
    const [maze, setMaze] = useState<Cell[][]>(() => generateMaze(12));
    // The player's route from the start. Stepping back onto the previous cell
    // pops it, so the line always shows the current route, not every misstep.
    const [trail, setTrail] = useState<Pos[]>([{r: 0, c: 0}]);
    const [moves, setMoves] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [now, setNow] = useState(0);
    const [finishMs, setFinishMs] = useState<number | null>(null);
    const [showSolution, setShowSolution] = useState(false);

    const n = maze.length;
    const solution = useMemo(() => solveAStar(maze).path, [maze]);
    const pos = trail[trail.length - 1];
    const won = finishMs !== null;
    const elapsed = finishMs ?? (startTime !== null ? Math.max(0, now - startTime) : 0);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const cs = CANVAS_PX / n;
        drawBoard(ctx, maze);
        if (showSolution) drawLine(ctx, solution.map(p => center(p, cs)), COLORS.path, cs * 0.12);
        drawLine(ctx, trail.map(p => center(p, cs)), COLORS.player, cs * 0.3);
        drawDot(ctx, center(trail[trail.length - 1], cs), won ? COLORS.path : '#ffffff', cs * 0.3);
    }, [maze, n, trail, showSolution, solution, won]);

    // Tick the timer while a game is in progress.
    useEffect(() => {
        if (startTime === null || finishMs !== null) return;
        const id = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(id);
    }, [startTime, finishMs]);

    // Move one cell, or with slide=true keep going down the corridor until the
    // next junction, dead end or turn (makes swiping on a phone less tedious).
    const walk = (dr: number, dc: number, slide = false) => {
        if (won) return;
        let t = trail;
        let p = pos;
        let steps = 0;
        while (canMove(maze, p, dr, dc)) {
            const next = {r: p.r + dr, c: p.c + dc};
            const prev = t[t.length - 2];
            t = prev && prev.r === next.r && prev.c === next.c ? t.slice(0, -1) : [...t, next];
            p = next;
            steps++;
            const cell = maze[p.r][p.c];
            const openings = [cell.top, cell.right, cell.bottom, cell.left].filter(w => !w).length;
            if (!slide || (p.r === n - 1 && p.c === n - 1) || openings !== 2) break;
        }
        if (steps === 0) return;

        const t0 = Date.now();
        const start = startTime ?? t0;
        if (startTime === null) setStartTime(t0);
        setNow(t0);
        setTrail(t);
        setMoves(m => m + steps);
        if (p.r === n - 1 && p.c === n - 1) setFinishMs(t0 - start);
    };

    // Keyboard controls. Re-attached each render so it always sees the latest state.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const dir: Record<string, [number, number]> = {
                ArrowUp: [-1, 0], w: [-1, 0], W: [-1, 0],
                ArrowDown: [1, 0], s: [1, 0], S: [1, 0],
                ArrowLeft: [0, -1], a: [0, -1], A: [0, -1],
                ArrowRight: [0, 1], d: [0, 1], D: [0, 1],
            };
            const d = dir[e.key];
            if (!d) return;
            e.preventDefault(); // stop arrows from scrolling the modal or nudging sliders
            walk(d[0], d[1]);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const handleNewMaze = () => {
        setMaze(generateMaze(size));
        setTrail([{r: 0, c: 0}]);
        setMoves(0);
        setStartTime(null);
        setFinishMs(null);
        setShowSolution(false);
    };

    const onTouchEnd = (e: TouchEvent) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;
        const dx = e.changedTouches[0].clientX - start[0];
        const dy = e.changedTouches[0].clientY - start[1];
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
        if (Math.abs(dx) > Math.abs(dy)) walk(0, dx > 0 ? 1 : -1, true);
        else walk(dy > 0 ? 1 : -1, 0, true);
    };

    const padBtn = 'h-12 w-12 bg-gray-100 dark:bg-[#1C1A1B] active:bg-gray-200 dark:active:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-lg flex items-center justify-center';

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-4">
            <canvas
                ref={canvasRef}
                width={CANVAS_PX}
                height={CANVAS_PX}
                className={`${CANVAS_CLASS} touch-none`}
                onTouchStart={(e) => { touchStart.current = [e.touches[0].clientX, e.touches[0].clientY]; }}
                onTouchEnd={onTouchEnd}
            />

            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                {won ? (
                    <p className="min-h-10 text-sm font-semibold text-center text-green-600 dark:text-green-400">
                        🎉 You made it in {formatTime(elapsed)} with {moves} moves!
                        <span className="block font-normal text-[#86868b]">
                            Shortest possible: {solution.length - 1} moves.
                        </span>
                    </p>
                ) : (
                    <p className="min-h-10 text-sm text-[#86868b] text-center">
                        Get from the green dot to the red one.
                        <span className="block tabular-nums">⏱ {formatTime(elapsed)} · {moves} moves</span>
                    </p>
                )}

                {/* On-screen arrows for phones (desktop uses the keyboard) */}
                <div className="md:hidden grid grid-cols-3 gap-2">
                    <span/>
                    <button aria-label="Up" className={padBtn} onClick={() => walk(-1, 0)}><FontAwesomeIcon icon={faArrowUp}/></button>
                    <span/>
                    <button aria-label="Left" className={padBtn} onClick={() => walk(0, -1)}><FontAwesomeIcon icon={faArrowLeft}/></button>
                    <button aria-label="Down" className={padBtn} onClick={() => walk(1, 0)}><FontAwesomeIcon icon={faArrowDown}/></button>
                    <button aria-label="Right" className={padBtn} onClick={() => walk(0, 1)}><FontAwesomeIcon icon={faArrowRight}/></button>
                </div>

                <button onClick={handleNewMaze} className={PRIMARY_BTN}>
                    <FontAwesomeIcon icon={faShuffle}/>
                    New Maze
                </button>
                <button onClick={() => setShowSolution(s => !s)} className={SECONDARY_BTN}>
                    <FontAwesomeIcon icon={showSolution ? faEyeSlash : faEye}/>
                    {showSolution ? 'Hide Solution' : 'Show Solution'}
                </button>

                <div className="w-full flex flex-col gap-2 pt-2 text-sm text-gray-700 dark:text-gray-300">
                    <SizeSlider size={size} setSize={setSize}/>
                </div>

                <p className="text-xs text-[#86868b] text-center">
                    <span className="hidden md:inline">Arrow keys or WASD to move.</span>
                    <span className="md:hidden">Swipe on the maze to slide to the next turn, or use the arrows.</span>
                    {' '}Size applies to the next maze.
                </p>
            </div>
        </div>
    );
}

// ---------- Modal (Source Code / A* Solver / Play tabs) ----------
interface ProjectRunnerProps {
    project: Project,
}

function findFirstFile(items: (ProjectFile | ProjectFolder)[]): ProjectFile | null {
    for (const item of items) {
        if (item.type === 'file') return item;
        const found = findFirstFile(item.children);
        if (found) return found;
    }
    return null;
}

function flattenFiles(
    items: (ProjectFile | ProjectFolder)[],
    prefix = ''
): {file: ProjectFile; path: string}[] {
    const result: {file: ProjectFile; path: string}[] = [];
    for (const item of items) {
        if (item.type === 'file') {
            result.push({file: item, path: prefix + item.name});
        } else {
            result.push(...flattenFiles(item.children, prefix + item.name + '/'));
        }
    }
    return result;
}

export default function MazeSolverModal({project}: ProjectRunnerProps) {
    // Opens on the solver since it needs no loading.
    const [activeTab, setActiveTab] = useState<'code' | 'solve' | 'play'>('solve');
    const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(() => findFirstFile(project.files));

    const flatFiles = flattenFiles(project.files);
    const selectedPath = selectedFile
        ? flatFiles.find(f => f.file === selectedFile)?.path ?? selectedFile.name
        : '';

    const tabClass = (tab: typeof activeTab) =>
        `px-3 sm:px-6 py-1.5 rounded-lg text-sm transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-600 shadow-sm' : 'opacity-50'}`;

    return (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col p-2 bg-white dark:bg-[#0D0C0C] rounded-xl overflow-x-hidden">
            {/* Segmented Control Tabs */}
            <div className="flex justify-center p-2 dark:border-[#1C1A1B]">
                <div className="flex bg-gray-100 dark:bg-[#1C1A1B] p-1 rounded-xl">
                    <button onClick={() => setActiveTab('code')} className={tabClass('code')}>Source Code</button>
                    <button onClick={() => setActiveTab('solve')} className={tabClass('solve')}>A* Solver</button>
                    <button onClick={() => setActiveTab('play')} className={tabClass('play')}>Play</button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                {activeTab === 'code' ? (
                    <div className="flex flex-col md:flex-row h-full">
                        {/* Mobile: dropdown file selector */}
                        <div className="md:hidden px-3 py-2 border-b border-gray-200 dark:border-[#1C1A1B] bg-gray-50 dark:bg-[#0D0C0C]">
                            <select
                                value={selectedPath}
                                onChange={(e) => {
                                    const match = flatFiles.find(f => f.path === e.target.value);
                                    if (match) setSelectedFile(match.file);
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] bg-white dark:bg-[#1C1A1B] text-sm text-gray-900 dark:text-white"
                            >
                                {flatFiles.map(({path}) => (
                                    <option key={path} value={path}>{path}</option>
                                ))}
                            </select>
                        </div>

                        {/* Desktop: sidebar file tree */}
                        <aside className="hidden md:flex flex-col w-max shrink-0 border-r border-gray-100 dark:border-[#1C1A1B] bg-gray-50/50 dark:bg-[#0D0C0C] p-4 overflow-y-auto">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Files</h4>
                            <FileTree
                                items={project.files}
                                onFileClick={(file) => setSelectedFile(file)}
                                selectedFile={selectedFile?.name ?? null}
                            />
                        </aside>

                        {/* Code viewer */}
                        <main className="flex-1 min-w-0 flex flex-col bg-white dark:bg-[#0D0C0C] overflow-hidden">
                            <div className="flex overflow-auto bg-[#282c34] rounded-xl m-2">
                                <div style={{
                                    width: 'max-content',
                                    minWidth: '100%',
                                    paddingRight: '12px',
                                    boxSizing: 'border-box'
                                }}>
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
                ) : activeTab === 'solve' ? (
                    <SolverDemo/>
                ) : (
                    <PlayMaze/>
                )}
            </div>
        </div>
    );
}
