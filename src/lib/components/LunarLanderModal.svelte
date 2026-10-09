<script lang="ts">
    import { onDestroy } from 'svelte';
    import { faPlay, faRotateRight, faSpinner } from '@fortawesome/free-solid-svg-icons';
    import type * as Ort from 'onnxruntime-web';
    import type { Project } from '../projects';
    import { API_BASE } from '../api';
    import {
        DT, VIEWPORT_H, VIEWPORT_W,
        drawCanvas, getObservation, initialState, physicsStep, runInference,
        type LanderAction, type LanderState,
    } from '../lunar/sim';
    import Fa from './Fa.svelte';
    import CodeTab from './CodeTab.svelte';
    import TabSwitcher from './TabSwitcher.svelte';

    type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';
    type SimStatus = 'idle' | 'running' | 'done';
    type Tab = 'code' | 'play';

    let { project }: { project: Project } = $props();

    let activeTab = $state<Tab>('code');
    let modelStatus = $state<ModelStatus>('idle');
    let modelError = $state<string | null>(null);
    let simStatus = $state<SimStatus>('idle');
    let simOutcome = $state<LanderState['outcome']>('running');
    let simSpeed = $state(2);
    let canvas = $state<HTMLCanvasElement>();

    // Simulation internals live outside Svelte's reactivity: they change every frame and only the canvas reads them
    let ort: typeof Ort | null = null;
    let session: Ort.InferenceSession | null = null;
    let sim = initialState();
    let animFrame = 0;
    let inferenceInProgress = false;
    let pendingAction: LanderAction = { thrust: 0, torque: 0 };
    let accum = 0;
    let lastTs: number | null = null;
    let demoTabVisited = false;

    function draw() {
        const ctx = canvas?.getContext('2d');
        if (ctx) drawCanvas(ctx, sim);
    }

    // Load ONNX runtime + model on first visit to the demo tab
    async function loadModel() {
        modelStatus = 'loading';
        try {
            ort = await import('onnxruntime-web');
            ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
            ort.env.wasm.numThreads = 1;
            const res = await fetch(`${API_BASE}/api/lunar-lander/model`);
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            const buf = await res.arrayBuffer();
            session = await ort.InferenceSession.create(buf, {
                executionProviders: ['wasm'],
            });
            modelStatus = 'ready';
        } catch (err) {
            modelError = err instanceof Error ? err.message : String(err);
            modelStatus = 'error';
        }
    }

    function selectTab(tab: Tab) {
        activeTab = tab;
        if (tab === 'play' && !demoTabVisited) {
            demoTabVisited = true;
            loadModel();
        }
    }

    // Draw the current frame whenever the demo tab's canvas mounts
    $effect(() => {
        if (canvas) draw();
    });

    onDestroy(() => {
        cancelAnimationFrame(animFrame);
        session?.release().catch(() => {});
    });

    function animate(ts: number) {
        if (lastTs === null) lastTs = ts;
        const elapsed = Math.min((ts - lastTs) / 1000, 0.1);
        lastTs = ts;
        accum += elapsed * simSpeed;

        while (accum >= DT) {
            if (!sim.done) {
                sim = physicsStep(sim, pendingAction);

                // Kick off async inference for the next step (pipelined)
                if (!inferenceInProgress && ort && session) {
                    inferenceInProgress = true;
                    runInference(ort, session, getObservation(sim))
                        .then(a => { pendingAction = a; inferenceInProgress = false; })
                        .catch(() => { inferenceInProgress = false; });
                }
            }
            accum -= DT;
        }

        draw();

        if (sim.done) {
            simStatus = 'done';
            simOutcome = sim.outcome;
        } else {
            animFrame = requestAnimationFrame(animate);
        }
    }

    function resetSim() {
        cancelAnimationFrame(animFrame);
        sim = initialState();
        pendingAction = { thrust: 0, torque: 0 };
        inferenceInProgress = false;
        accum = 0;
        lastTs = null;
        simOutcome = 'running';
    }

    function handleLaunch() {
        resetSim();
        simStatus = 'running';
        animFrame = requestAnimationFrame(animate);
    }

    function handleReset() {
        resetSim();
        simStatus = 'idle';
        draw();
    }
</script>

<div class="flex flex-col p-2 bg-white dark:bg-[#0D0C0C] rounded-xl overflow-x-hidden">
    <TabSwitcher
        active={activeTab}
        onSelect={selectTab}
        tabs={[
            { id: 'code', label: 'Source Code' },
            { id: 'play', label: 'Interactive Demo' },
        ]}
    />

    <div class="flex-1 overflow-x-auto">
        {#if activeTab === 'code'}
            <CodeTab files={project.files} />
        {:else}
            <div class="flex flex-col items-center gap-4 p-4">
                <!-- Simulation canvas -->
                <canvas
                    bind:this={canvas}
                    width={VIEWPORT_W}
                    height={VIEWPORT_H}
                    class="rounded-xl border border-gray-100 dark:border-[#1C1A1B] w-full max-w-150"
                    style:aspect-ratio="{VIEWPORT_W} / {VIEWPORT_H}"
                ></canvas>

                <!-- Controls -->
                <div class="flex flex-col items-center gap-3 w-full max-w-150">
                    {#if modelStatus === 'loading'}
                        <div class="flex items-center gap-2 text-[#86868b] text-sm">
                            <Fa icon={faSpinner} class="animate-spin" />
                            Loading ONNX model from server...
                        </div>
                    {/if}

                    {#if modelStatus === 'error'}
                        <div class="w-full p-3 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg text-sm">
                            <span class="font-semibold">Failed to load model: </span>{modelError}
                        </div>
                    {/if}

                    {#if modelStatus === 'ready'}
                        <div class="flex gap-3">
                            <button
                                onclick={handleLaunch}
                                disabled={simStatus === 'running'}
                                class="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                            >
                                {#if simStatus === 'running'}
                                    <Fa icon={faSpinner} class="animate-spin" />
                                    Running...
                                {:else}
                                    <Fa icon={faPlay} />
                                    {simStatus === 'idle' ? 'Launch' : 'Launch Again'}
                                {/if}
                            </button>
                            {#if simStatus !== 'idle'}
                                <button
                                    onclick={handleReset}
                                    class="px-4 py-2.5 bg-gray-100 dark:bg-[#1C1A1B] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Fa icon={faRotateRight} />
                                    Reset
                                </button>
                            {/if}
                            <div class="flex items-center bg-gray-100 dark:bg-[#1C1A1B] p-1 rounded-lg">
                                {#each [1, 2, 4] as speed (speed)}
                                    <button
                                        onclick={() => (simSpeed = speed)}
                                        class="px-3 py-1.5 rounded-md text-sm font-semibold transition-all {simSpeed === speed
                                            ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
                                        title="{speed}× simulation speed"
                                    >
                                        {speed}×
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    {#if simStatus === 'done'}
                        <p class="text-sm font-semibold {simOutcome === 'landed' ? 'text-green-600 dark:text-green-400' : simOutcome === 'timeout' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}">
                            {simOutcome === 'landed' ? '✓ Successful landing!' : simOutcome === 'timeout' ? '⏱ Ran out of time' : '✗ Crashed'}
                        </p>
                    {/if}

                    <p class="text-xs text-[#86868b] text-center max-w-xs">
                        PPO policy downloaded from the backend and run locally via ONNX Runtime Web.
                    </p>
                </div>
            </div>
        {/if}
    </div>
</div>
