import {useCallback, useEffect, useRef, useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlay, faRotateRight, faShuffle} from '@fortawesome/free-solid-svg-icons';
import type {Project, ProjectFile, ProjectFolder} from '../projects';
import FileTree from './FileTree';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {oneDark} from 'react-syntax-highlighter/dist/esm/styles/prism';

// Each cell stores which walls are still standing.
type Cell = { top: boolean; right: boolean; bottom: boolean; left: boolean };
type Pos = { r: number; c: number };

// The canvas always draws at this many pixels and CSS scales it to fit,
// so small mazes aren't tiny and big mazes don't overflow on phones.
const CANVAS_PX = 640;

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

// ---------- A* solver ----------
// Returns the cells in the order they were explored, plus the final path.
function solveAStar(grid: Cell[][]): { explored: Pos[]; path: Pos[] } {
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
            // Walk backwards through cameFrom to rebuild the path.
            const path: Pos[] = [];
            let cur: number | undefined = k;
            while (cur !== undefined) {
                path.push({r: Math.floor(cur / size), c: cur % size});
                cur = cameFrom.get(cur);
            }
            return {explored, path: path.reverse()};
        }

        const cell = grid[pos.r][pos.c];
        const neighbors: Pos[] = [];
        if (!cell.top) neighbors.push({r: pos.r - 1, c: pos.c});
        if (!cell.right) neighbors.push({r: pos.r, c: pos.c + 1});
        if (!cell.bottom) neighbors.push({r: pos.r + 1, c: pos.c});
        if (!cell.left) neighbors.push({r: pos.r, c: pos.c - 1});

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
    return {explored, path: []};
}

// ---------- Interactive demo ----------
// Lives in its own component so switching to the Source Code tab or closing
// the modal unmounts it, and the cleanup below cancels any running animation.
function MazeDemo() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number | null>(null);
    const speedRef = useRef(5);

    const [size, setSize] = useState(20);
    const [speed, setSpeed] = useState(5); // cells revealed per frame
    const [maze, setMaze] = useState<Cell[][]>(() => generateMaze(20));
    const [status, setStatus] = useState('Hit Solve to watch A* find the exit.');
    const [solving, setSolving] = useState(false);
    const [explored, setExplored] = useState<Pos[]>([]);
    const [path, setPath] = useState<Pos[]>([]);

    const stopAnimation = () => {
        if (animRef.current !== null) cancelAnimationFrame(animRef.current);
        animRef.current = null;
    };

    // Redraw whenever the maze or the visualization state changes.
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const n = maze.length;
        const cell = CANVAS_PX / n;
        const inset = cell * 0.2;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

        // Explored cells
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        for (const p of explored) ctx.fillRect(p.c * cell, p.r * cell, cell, cell);

        // Final path
        ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
        for (const p of path) ctx.fillRect(p.c * cell + inset, p.r * cell + inset, cell - 2 * inset, cell - 2 * inset);

        // Start and goal
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(inset, inset, cell - 2 * inset, cell - 2 * inset);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect((n - 1) * cell + inset, (n - 1) * cell + inset, cell - 2 * inset, cell - 2 * inset);

        // Walls
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.lineCap = 'square';
        ctx.beginPath();
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const x = c * cell;
                const y = r * cell;
                const w = maze[r][c];
                if (w.top) { ctx.moveTo(x, y); ctx.lineTo(x + cell, y); }
                if (w.right) { ctx.moveTo(x + cell, y); ctx.lineTo(x + cell, y + cell); }
                if (w.bottom) { ctx.moveTo(x, y + cell); ctx.lineTo(x + cell, y + cell); }
                if (w.left) { ctx.moveTo(x, y); ctx.lineTo(x, y + cell); }
            }
        }
        ctx.stroke();
    }, [maze, explored, path]);

    useEffect(() => { draw(); }, [draw]);

    // Cancel any running animation when this component unmounts.
    useEffect(() => () => {
        if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    }, []);

    const handleGenerate = () => {
        stopAnimation();
        setSolving(false);
        setExplored([]);
        setPath([]);
        setMaze(generateMaze(size));
        setStatus('New maze ready. Hit Solve.');
    };

    const handleClear = () => {
        stopAnimation();
        setSolving(false);
        setExplored([]);
        setPath([]);
        setStatus('Path cleared.');
    };

    const handleSolve = () => {
        stopAnimation();
        setExplored([]);
        setPath([]);
        setSolving(true);
        setStatus('Solving...');

        const result = solveAStar(maze);
        let i = 0;

        const step = () => {
            // Read speed from a ref so moving the slider mid-solve takes effect immediately.
            i = Math.min(i + speedRef.current, result.explored.length);
            setExplored(result.explored.slice(0, i));
            if (i < result.explored.length) {
                animRef.current = requestAnimationFrame(step);
            } else {
                animRef.current = null;
                setPath(result.path);
                setSolving(false);
                setStatus(
                    `Solved! Path is ${result.path.length} cells long, explored ${result.explored.length} of ${maze.length ** 2} cells.`
                );
            }
        };
        animRef.current = requestAnimationFrame(step);
    };

    const secondaryBtn = 'w-full px-4 py-2.5 bg-gray-100 dark:bg-[#1C1A1B] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2';

    // Canvas beside the controls on wide screens, stacked on phones. The canvas
    // is capped by the modal height (85vh minus header/tabs) so it never gets cut off.
    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-4">
            <canvas
                ref={canvasRef}
                width={CANVAS_PX}
                height={CANVAS_PX}
                className="w-full max-w-[min(40rem,calc(85vh-11rem))] aspect-square rounded-xl border border-gray-100 dark:border-[#1C1A1B]"
            />

            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <p className="min-h-10 text-sm text-[#86868b] text-center">{status}</p>

                <button
                    onClick={handleSolve}
                    disabled={solving}
                    className="w-full px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <FontAwesomeIcon icon={faPlay} />
                    Solve with A*
                </button>
                <button onClick={handleGenerate} className={secondaryBtn}>
                    <FontAwesomeIcon icon={faShuffle} />
                    Generate Maze
                </button>
                <button onClick={handleClear} className={secondaryBtn}>
                    <FontAwesomeIcon icon={faRotateRight} />
                    Clear Path
                </button>

                <div className="w-full flex flex-col gap-2 pt-2 text-sm text-gray-700 dark:text-gray-300">
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
                    <label className="flex items-center justify-between gap-3">
                        <span>Speed</span>
                        <input
                            type="range"
                            min={1}
                            max={30}
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

// ---------- Modal (Source Code / Interactive Demo tabs, same as the other projects) ----------
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
    // Opens on the demo since it needs no loading.
    const [activeTab, setActiveTab] = useState<'code' | 'play'>('play');
    const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(() => findFirstFile(project.files));

    const flatFiles = flattenFiles(project.files);
    const selectedPath = selectedFile
        ? flatFiles.find(f => f.file === selectedFile)?.path ?? selectedFile.name
        : '';

    return (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col p-2 bg-white dark:bg-[#0D0C0C] rounded-xl overflow-x-hidden">
            {/* Segmented Control Tabs */}
            <div className="flex justify-center p-2 dark:border-[#1C1A1B]">
                <div className="flex bg-gray-100 dark:bg-[#1C1A1B] p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('code')}
                        className={`px-6 py-1.5 rounded-lg text-sm transition-all ${activeTab === 'code' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'opacity-50'}`}
                    >
                        Source Code
                    </button>
                    <button
                        onClick={() => setActiveTab('play')}
                        className={`px-6 py-1.5 rounded-lg text-sm transition-all ${activeTab === 'play' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'opacity-50'}`}
                    >
                        Interactive Demo
                    </button>
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
                ) : (
                    <MazeDemo />
                )}
            </div>
        </div>
    );
}
