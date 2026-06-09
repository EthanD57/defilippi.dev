import {useCallback, useEffect, useRef, useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlay, faRotateRight, faSpinner} from '@fortawesome/free-solid-svg-icons';
import * as ort from 'onnxruntime-web';
import type {Project, ProjectFile, ProjectFolder} from '../projects';
import FileTree from './FileTree';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {oneDark} from 'react-syntax-highlighter/dist/esm/styles/prism';
import {API_BASE} from '../api';

// Physics constants matching ML-Lunar-Lander simulation/params.py
const VIEWPORT_W = 600;
const VIEWPORT_H = 400;
const WORLD_WIDTH = 600;               // metres
const WORLD_HEIGHT = 400;              // metres
const GRAVITY = 1.62;                  // Moon, m/s²
const DT = 0.02;                       // timestep, s
const MAX_STEPS = 4096;
const LANDER_MASS = 100.0;             // dry mass, kg
const LANDER_WIDTH = 2.0;
const LANDER_HEIGHT = 3.0;
const INITIAL_FUEL = 500.0;            // kg
const FUEL_CONSUMPTION_RATE = 0.001;   // kg / (N·s)
const MAX_THRUST = 2000.0;             // N
const MAX_TORQUE = 500.0;              // N·m
const ANGULAR_DAMPING = 0.01;          // fraction of angVel lost per step
const INITIAL_ALTITUDE = 350.0;        // m

// Terrain: flat at y=0 with landing pad from 230 to 370 (params.py default)
const PAD_X_START = 230.0;
const PAD_X_END = 370.0;
const PAD_CX = (PAD_X_START + PAD_X_END) / 2;

// Observation normalization constants (model/agent.py)
const OBS_DIM = 9;
const MAX_SPEED = 100;
const MAX_ANG_VEL = 10;

// Rendering: 1 px per metre horizontally; ground drawn GROUND_PX above bottom
const GROUND_PX = 30;
const SCALE_X = VIEWPORT_W / WORLD_WIDTH;                     // 1
const SCALE_Y = (VIEWPORT_H - GROUND_PX) / WORLD_HEIGHT;      // ~0.925

// Stars: generated once at module load for stable rendering
const STARS = Array.from({ length: 80 }, () => ({
    x: Math.random() * VIEWPORT_W,
    y: Math.random() * (VIEWPORT_H - 110),
    r: Math.random() * 1.2 + 0.3,
    a: Math.random() * 0.7 + 0.3,
}));

interface LanderAction {
    thrust: number;   // N, [0, MAX_THRUST]
    torque: number;   // N·m, [-MAX_TORQUE, MAX_TORQUE]
}

interface LanderState {
    x: number; y: number;
    vx: number; vy: number;
    angle: number; angVel: number;
    fuel: number;
    onPad: boolean;
    step: number;
    done: boolean;
    outcome: 'running' | 'landed' | 'crashed' | 'timeout';
    action: LanderAction;
}

// Mirrors LanderSimulation.reset() (simulation/lander.py)
function initialState(): LanderState {
    return {
        x: 50 + Math.random() * (WORLD_WIDTH - 100),
        y: INITIAL_ALTITUDE,
        vx: 0,
        vy: 0,
        angle: 0,
        angVel: 0,
        fuel: INITIAL_FUEL,
        onPad: false,
        step: 0,
        done: false,
        outcome: 'running',
        action: { thrust: 0, torque: 0 },
    };
}

function wrapAngle(a: number): number {
    return ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
}

// Observation vector matching model/agent.py preprocess_state() exactly
function getObservation(s: LanderState): number[] {
    return [
        s.x / WORLD_WIDTH,
        s.y / WORLD_HEIGHT,
        s.vx / MAX_SPEED,
        s.vy / MAX_SPEED,
        wrapAngle(s.angle) / Math.PI,
        s.angVel / MAX_ANG_VEL,
        s.fuel / INITIAL_FUEL,
        s.onPad ? 1.0 : 0.0,
        (PAD_CX - s.x) / WORLD_WIDTH,
    ];
}

// Mirrors LanderSimulation.step() (simulation/lander.py) — same order of operations
function physicsStep(s: LanderState, action: LanderAction): LanderState {
    const totalMass = LANDER_MASS + s.fuel;
    const momentOfInertia = (1 / 12) * totalMass * (LANDER_WIDTH ** 2 + LANDER_HEIGHT ** 2);

    // 1. Gravity
    let vy = s.vy - GRAVITY * DT;

    // 2. Thrust (zero if out of fuel), burns fuel
    let thrust = s.fuel > 0 ? action.thrust : 0;
    thrust = Math.min(thrust, MAX_THRUST);
    const accel = thrust / totalMass;
    let vx = s.vx + accel * Math.sin(s.angle) * DT;
    vy = vy + accel * Math.cos(s.angle) * DT;
    const fuel = Math.max(0, s.fuel - thrust * FUEL_CONSUMPTION_RATE * DT);

    // 3. Wind — disabled by default (wind_strength = 0)

    // 4. Integrate position
    let x = s.x + vx * DT;
    let y = s.y + vy * DT;

    // 5. Rotation (torque + angular damping)
    const angVel = (s.angVel + (action.torque / momentOfInertia) * DT) * (1.0 - ANGULAR_DAMPING);
    const angle = s.angle + angVel * DT;

    // 6. Collision (terrain is flat at y=0; pad spans PAD_X_START–PAD_X_END)
    const onPad = x >= PAD_X_START && x <= PAD_X_END;
    const collided = y <= 0;
    const aw = wrapAngle(angle);
    const landedOk = Math.abs(vy) <= 2.0 && Math.abs(vx) <= 1.0 && Math.abs(aw) <= 0.2;

    // 7. Clamp to world boundaries
    x = Math.max(0, Math.min(x, WORLD_WIDTH));
    y = Math.max(0, Math.min(y, WORLD_HEIGHT));

    const step = s.step + 1;
    const landed = collided && landedOk;
    const crashed = collided && !landedOk;
    const timedOut = !collided && step >= MAX_STEPS;

    return {
        x, y, vx, vy, angle, angVel, fuel, onPad,
        step,
        done: landed || crashed || timedOut,
        outcome: landed ? 'landed' : crashed ? 'crashed' : timedOut ? 'timeout' : 'running',
        action: { thrust, torque: action.torque },
    };
}

// Model outputs [1, 2] in [-1, 1]: [thrust_raw, torque_raw] (model/agent.py postprocess_action)
async function runInference(session: ort.InferenceSession, obs: number[]): Promise<LanderAction> {
    const tensor = new ort.Tensor('float32', Float32Array.from(obs), [1, OBS_DIM]);
    const feeds: Record<string, ort.Tensor> = { [session.inputNames[0]]: tensor };
    const results = await session.run(feeds);
    const data = results[session.outputNames[0]].data as Float32Array;
    // SB3 clips raw gaussian actions to the action space
    const a0 = Math.max(-1, Math.min(1, Number(data[0])));
    const a1 = Math.max(-1, Math.min(1, Number(data[1])));
    return {
        thrust: (a0 + 1.0) / 2.0 * MAX_THRUST,
        torque: a1 * MAX_TORQUE,
    };
}

function drawCanvas(ctx: CanvasRenderingContext2D, state: LanderState) {
    const cw = VIEWPORT_W;
    const ch = VIEWPORT_H;

    // Space background
    ctx.fillStyle = '#06071a';
    ctx.fillRect(0, 0, cw, ch);

    // Stars
    for (const s of STARS) {
        ctx.save();
        ctx.globalAlpha = s.a;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Ground (terrain at world y=0)
    const groundCanvasY = ch - GROUND_PX;
    ctx.fillStyle = '#111320';
    ctx.fillRect(0, groundCanvasY, cw, ch - groundCanvasY);

    // Ground surface
    ctx.strokeStyle = '#1e2340';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundCanvasY);
    ctx.lineTo(cw, groundCanvasY);
    ctx.stroke();

    // Landing pad (world 230–370)
    const padX = PAD_X_START * SCALE_X;
    const padW = (PAD_X_END - PAD_X_START) * SCALE_X;
    ctx.fillStyle = '#172545';
    ctx.fillRect(padX, groundCanvasY - 4, padW, 5);

    ctx.fillStyle = '#4a7fc1';
    ctx.fillRect(padX - 2, groundCanvasY - 4, 10, 5);
    ctx.fillRect(padX + padW - 8, groundCanvasY - 4, 10, 5);

    ctx.fillStyle = '#6baed6';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('H', PAD_CX * SCALE_X, groundCanvasY - 7);

    // Lander (sprite drawn larger than physical 2×3 m for visibility)
    const cx = state.x * SCALE_X;
    const cy = groundCanvasY - state.y * SCALE_Y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.angle); // positive angle = tilted right; canvas rotate is clockwise
    // The physics point (x, y) is where collision happens — anchor the sprite's
    // leg tips there (legs extend to +18 in sprite coords) so the lander sits
    // on the surface at touchdown instead of being half-buried.
    ctx.translate(0, -18);

    // Main engine flame, scaled by thrust
    const thrustFrac = state.action.thrust / MAX_THRUST;
    if (thrustFrac > 0.05 && !state.done) {
        const fl = (14 + Math.random() * 8) * (0.4 + 0.6 * thrustFrac);
        const grad = ctx.createLinearGradient(0, 10, 0, 10 + fl);
        grad.addColorStop(0, 'rgba(255,210,0,0.95)');
        grad.addColorStop(0.4, 'rgba(255,100,0,0.8)');
        grad.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-6, 10);
        ctx.lineTo(6, 10);
        ctx.lineTo(2, 10 + fl);
        ctx.lineTo(-2, 10 + fl);
        ctx.closePath();
        ctx.fill();
    }

    // Attitude thruster flames - left thruster fires
    if (state.action.torque > 25 && !state.done) {
        const fl = 10 + Math.random() * 6;
        const grad = ctx.createLinearGradient(-14, 0, -14 - fl, 0);
        grad.addColorStop(0, 'rgba(120,200,255,0.95)');
        grad.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-14, -3);
        ctx.lineTo(-14, 4);
        ctx.lineTo(-14 - fl, 0);
        ctx.closePath();
        ctx.fill();
    }

    // Negative torque = right thruster fires
    if (state.action.torque < -25 && !state.done) {
        const fl = 10 + Math.random() * 6;
        const grad = ctx.createLinearGradient(14, 0, 14 + fl, 0);
        grad.addColorStop(0, 'rgba(120,200,255,0.95)');
        grad.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(14, -3);
        ctx.lineTo(14, 4);
        ctx.lineTo(14 + fl, 0);
        ctx.closePath();
        ctx.fill();
    }

    // Lander body — LANDER_POLY in gym coords, y-flipped for canvas
    ctx.fillStyle = state.outcome === 'crashed' ? '#d32f2f' :
        state.outcome === 'landed' ? '#388e3c' :
            '#c8c8d4';
    ctx.beginPath();
    ctx.moveTo(-14, -17);
    ctx.lineTo(-17, 0);
    ctx.lineTo(-17, 10);
    ctx.lineTo(17, 10);
    ctx.lineTo(17, 0);
    ctx.lineTo(14, -17);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Landing legs
    const touchedDown = state.outcome === 'landed';
    ctx.strokeStyle = touchedDown ? '#66bb6a' : '#606070';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, 8);
    ctx.lineTo(-20, 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, 8);
    ctx.lineTo(20, 18);
    ctx.stroke();

    // Cockpit window
    ctx.fillStyle = state.outcome === 'crashed' ? '#ff5252' : '#4fc3f7';
    ctx.beginPath();
    ctx.arc(0, -5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // HUD strip
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, ch - 26, cw, 26);
    ctx.fillStyle = '#8ab4f8';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    const hud = `Step: ${state.step}   alt: ${state.y.toFixed(0)}m   vy: ${state.vy.toFixed(1)}   vx: ${state.vx.toFixed(1)}   angle: ${(wrapAngle(state.angle) * 180 / Math.PI).toFixed(1)}°   fuel: ${state.fuel.toFixed(0)}kg   thrust: ${(state.action.thrust / MAX_THRUST * 100).toFixed(0)}%`;
    ctx.fillText(hud, 10, ch - 8);

    // End-state overlay
    if (state.done) {
        ctx.fillStyle = 'rgba(6,7,26,0.65)';
        ctx.fillRect(0, 0, cw, ch - 26);
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = state.outcome === 'landed' ? '#66bb6a' :
            state.outcome === 'timeout' ? '#ffb74d' : '#ef5350';
        ctx.fillText(
            state.outcome === 'landed'
                ? (state.onPad ? '✓  Landed on the Pad' : '✓  Landed Successfully')
                : state.outcome === 'timeout' ? '⏱  Out of Time' : '✗  Crashed',
            cw / 2, ch / 2 - 18,
        );
        ctx.font = '13px monospace';
        ctx.fillStyle = '#9aa0b4';
        ctx.fillText(`Completed in ${state.step} steps`, cw / 2, ch / 2 + 16);
    }
}

function findFirstFile(items: (ProjectFile | ProjectFolder)[]): ProjectFile | null {
    for (const item of items) {
        if (item.type === 'file') return item;
        if (item.type === 'folder') {
            const found = findFirstFile(item.children);
            if (found) return found;
        }
    }
    return null;
}

function flattenFiles(
    items: (ProjectFile | ProjectFolder)[],
    prefix = '',
): { file: ProjectFile; path: string }[] {
    const result: { file: ProjectFile; path: string }[] = [];
    for (const item of items) {
        if (item.type === 'file') result.push({ file: item, path: prefix + item.name });
        else result.push(...flattenFiles(item.children, prefix + item.name + '/'));
    }
    return result;
}

interface Props { project: Project }
type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';
type SimStatus = 'idle' | 'running' | 'done';

export default function LunarLanderModal({ project }: Props) {
    const [activeTab, setActiveTab] = useState<'code' | 'play'>('code');
    const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
    const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
    const [modelError, setModelError] = useState<string | null>(null);
    const [simStatus, setSimStatus] = useState<SimStatus>('idle');
    const [simOutcome, setSimOutcome] = useState<LanderState['outcome']>('running');
    const [simSpeed, setSimSpeed] = useState(2);
    const simSpeedRef = useRef(2);

    const sessionRef = useRef<ort.InferenceSession | null>(null);
    const simRef = useRef<LanderState>(initialState());
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const inferenceInProgress = useRef(false);
    const pendingAction = useRef<LanderAction>({ thrust: 0, torque: 0 });
    const accumRef = useRef(0);
    const lastTsRef = useRef<number | null>(null);
    const demoTabVisited = useRef(false);

    const flatFiles = flattenFiles(project.files);

    useEffect(() => {
        setSelectedFile(findFirstFile(project.files));
    }, [project.files, project.id]);

    // Load ONNX model on first visit to the demo tab
    useEffect(() => {
        if (activeTab !== 'play' || demoTabVisited.current) return;
        demoTabVisited.current = true;

        const load = async () => {
            setModelStatus('loading');
            try {
                ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
                ort.env.wasm.numThreads = 1;
                const res = await fetch(`${API_BASE}/api/lunar-lander/model`);
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                const buf = await res.arrayBuffer();
                sessionRef.current = await ort.InferenceSession.create(buf, {
                    executionProviders: ['wasm'],
                });
                setModelStatus('ready');
            } catch (err) {
                setModelError(err instanceof Error ? err.message : String(err));
                setModelStatus('error');
            }
        };
        load();
    }, [activeTab]);

    // Draw initial frame when demo tab opens
    useEffect(() => {
        if (activeTab === 'play' && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) drawCanvas(ctx, simRef.current);
        }
    }, [activeTab]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancelAnimationFrame(animFrameRef.current);
            sessionRef.current?.release().catch(() => {});
        };
    }, []);

    const animate = useCallback((ts: number) => {
        if (lastTsRef.current === null) lastTsRef.current = ts;
        const elapsed = Math.min((ts - lastTsRef.current) / 1000, 0.1);
        lastTsRef.current = ts;
        accumRef.current += elapsed * simSpeedRef.current;

        while (accumRef.current >= DT) {
            if (!simRef.current.done) {
                simRef.current = physicsStep(simRef.current, pendingAction.current);

                // Kick off async inference for the next step (pipelined)
                if (!inferenceInProgress.current && sessionRef.current) {
                    inferenceInProgress.current = true;
                    const obs = getObservation(simRef.current);
                    runInference(sessionRef.current, obs)
                        .then(a => { pendingAction.current = a; inferenceInProgress.current = false; })
                        .catch(() => { inferenceInProgress.current = false; });
                }
            }
            accumRef.current -= DT;
        }

        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) drawCanvas(ctx, simRef.current);
        }

        if (simRef.current.done) {
            setSimStatus('done');
            setSimOutcome(simRef.current.outcome);
        } else {
            animFrameRef.current = requestAnimationFrame(animate);
        }
    }, []);

    const handleLaunch = useCallback(() => {
        cancelAnimationFrame(animFrameRef.current);
        simRef.current = initialState();
        pendingAction.current = { thrust: 0, torque: 0 };
        inferenceInProgress.current = false;
        accumRef.current = 0;
        lastTsRef.current = null;
        setSimStatus('running');
        setSimOutcome('running');
        animFrameRef.current = requestAnimationFrame(animate);
    }, [animate]);

    const handleReset = useCallback(() => {
        cancelAnimationFrame(animFrameRef.current);
        simRef.current = initialState();
        pendingAction.current = { thrust: 0, torque: 0 };
        inferenceInProgress.current = false;
        accumRef.current = 0;
        lastTsRef.current = null;
        setSimStatus('idle');
        setSimOutcome('running');
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) drawCanvas(ctx, simRef.current);
        }
    }, []);

    const selectedPath = selectedFile
        ? flatFiles.find(f => f.file === selectedFile)?.path ?? selectedFile.name
        : '';

    return (
        <div className="flex flex-col p-2 bg-white dark:bg-[#0D0C0C] rounded-xl overflow-x-hidden">
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
                        {/* Mobile: dropdown */}
                        <div className="md:hidden px-3 py-2 border-b border-gray-200 dark:border-[#1C1A1B] bg-gray-50 dark:bg-[#0D0C0C]">
                            <select
                                value={selectedPath}
                                onChange={(e) => {
                                    const match = flatFiles.find(f => f.path === e.target.value);
                                    if (match) setSelectedFile(match.file);
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] bg-white dark:bg-[#1C1A1B] text-sm text-gray-900 dark:text-white"
                            >
                                {flatFiles.map(({ path }) => (
                                    <option key={path} value={path}>{path}</option>
                                ))}
                            </select>
                        </div>

                        {/* Desktop: file tree sidebar */}
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
                                    width: 'max-content', minWidth: '100%',
                                    paddingRight: '12px', boxSizing: 'border-box',
                                }}>
                                    <SyntaxHighlighter
                                        language={selectedFile?.language || 'python'}
                                        style={oneDark}
                                        customStyle={{
                                            margin: 0, padding: '24px', fontSize: '14px',
                                            lineHeight: '1.5', backgroundColor: 'transparent',
                                            overflow: 'visible', minHeight: '100%',
                                        }}
                                    >
                                        {selectedFile?.content || ''}
                                    </SyntaxHighlighter>
                                </div>
                            </div>
                        </main>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 p-4">
                        {/* Simulation canvas */}
                        <canvas
                            ref={canvasRef}
                            width={VIEWPORT_W}
                            height={VIEWPORT_H}
                            className="rounded-xl border border-gray-100 dark:border-[#1C1A1B] w-full max-w-150"
                            style={{ aspectRatio: `${VIEWPORT_W} / ${VIEWPORT_H}` }}
                        />

                        {/* Controls */}
                        <div className="flex flex-col items-center gap-3 w-full max-w-150">
                            {modelStatus === 'loading' && (
                                <div className="flex items-center gap-2 text-[#86868b] text-sm">
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                    Loading ONNX model from server...
                                </div>
                            )}

                            {modelStatus === 'error' && (
                                <div className="w-full p-3 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg text-sm">
                                    <span className="font-semibold">Failed to load model: </span>{modelError}
                                </div>
                            )}

                            {modelStatus === 'ready' && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleLaunch}
                                        disabled={simStatus === 'running'}
                                        className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        {simStatus === 'running' ? (
                                            <>
                                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                                Running...
                                            </>
                                        ) : (
                                            <>
                                                <FontAwesomeIcon icon={faPlay} />
                                                {simStatus === 'idle' ? 'Launch' : 'Launch Again'}
                                            </>
                                        )}
                                    </button>
                                    {simStatus !== 'idle' && (
                                        <button
                                            onClick={handleReset}
                                            className="px-4 py-2.5 bg-gray-100 dark:bg-[#1C1A1B] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <FontAwesomeIcon icon={faRotateRight} />
                                            Reset
                                        </button>
                                    )}
                                    <div className="flex items-center bg-gray-100 dark:bg-[#1C1A1B] p-1 rounded-lg">
                                        {[1, 2, 4].map(speed => (
                                            <button
                                                key={speed}
                                                onClick={() => {
                                                    simSpeedRef.current = speed;
                                                    setSimSpeed(speed);
                                                }}
                                                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                                                    simSpeed === speed
                                                        ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                }`}
                                                title={`${speed}× simulation speed`}
                                            >
                                                {speed}×
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {simStatus === 'done' && (
                                <p className={`text-sm font-semibold ${simOutcome === 'landed' ? 'text-green-600 dark:text-green-400' : simOutcome === 'timeout' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {simOutcome === 'landed' ? '✓ Successful landing!' : simOutcome === 'timeout' ? '⏱ Ran out of time' : '✗ Crashed'}
                                </p>
                            )}

                            <p className="text-xs text-[#86868b] text-center max-w-xs">
                                PPO policy downloaded from the backend and run locally via ONNX Runtime Web.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
