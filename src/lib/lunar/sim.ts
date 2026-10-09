// Lunar Lander simulation + rendering, ported 1:1 from the React version.
// Physics mirror ML-Lunar-Lander's simulation/lander.py.
import type * as Ort from 'onnxruntime-web';

// Physics constants matching ML-Lunar-Lander simulation/params.py
export const VIEWPORT_W = 600;
export const VIEWPORT_H = 400;
const WORLD_WIDTH = 600;               // metres
const WORLD_HEIGHT = 400;              // metres
const GRAVITY = 1.62;                  // Moon, m/s²
export const DT = 0.02;                       // timestep, s
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

export interface LanderAction {
    thrust: number;   // N, [0, MAX_THRUST]
    torque: number;   // N·m, [-MAX_TORQUE, MAX_TORQUE]
}

export interface LanderState {
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
export function initialState(): LanderState {
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
export function getObservation(s: LanderState): number[] {
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
export function physicsStep(s: LanderState, action: LanderAction): LanderState {
    const totalMass = LANDER_MASS + s.fuel;
    const momentOfInertia = (1 / 12) * totalMass * (LANDER_WIDTH ** 2 + LANDER_HEIGHT ** 2);

    // 1. Gravity
    let vy = s.vy - GRAVITY * DT;

    // 2. Thrust (zero if out of fuel), burns fuel
    let thrust = s.fuel > 0 ? action.thrust : 0;
    thrust = Math.min(thrust, MAX_THRUST);
    const accel = thrust / totalMass;
    const vx = s.vx + accel * Math.sin(s.angle) * DT;
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
export async function runInference(ort: typeof Ort, session: Ort.InferenceSession, obs: number[]): Promise<LanderAction> {
    const tensor = new ort.Tensor('float32', Float32Array.from(obs), [1, OBS_DIM]);
    const feeds: Record<string, Ort.Tensor> = { [session.inputNames[0]]: tensor };
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

export function drawCanvas(ctx: CanvasRenderingContext2D, state: LanderState) {
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
