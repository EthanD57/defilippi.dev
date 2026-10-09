<script lang="ts">
    import { onMount } from 'svelte';
    import { faPlay, faSpinner } from '@fortawesome/free-solid-svg-icons';
    import type { Project } from '../projects';
    import { API_BASE } from '../api';
    import Fa from './Fa.svelte';
    import CodeTab from './CodeTab.svelte';
    import TabSwitcher from './TabSwitcher.svelte';
    import WordleAssistPanel from './WordleAssistPanel.svelte';

    interface GuessResult {
        guess: string;
        score: number[];
    }

    interface GameResult {
        success: boolean;
        word: string;
        model: string;
        won: boolean;
        num_guesses: number;
        guesses: GuessResult[];
        error?: string;
        note?: string | null;
    }

    type Tab = 'code' | 'play' | 'solve';

    let { project }: { project: Project } = $props();

    let models = $state<string[]>([]);
    let selectedModel = $state('entropy_maximization');
    let word = $state('');
    let loading = $state(false);
    let result = $state<GameResult | null>(null);
    let error = $state<string | null>(null);
    let activeTab = $state<Tab>('code');
    let solveOpened = $state(false);

    onMount(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/wordle/models`);
            const data = await response.json();
            if (data.models) models = data.models;
        } catch (err) {
            console.error('Failed to fetch models:', err);
        }
    });

    async function handlePlayGame() {
        loading = true;
        error = null;
        result = null;

        try {
            const response = await fetch(`${API_BASE}/api/wordle/play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word: word || undefined,
                    model: selectedModel,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                error = data.error || 'Unknown error occurred';
                return;
            }

            result = data;
        } catch (err) {
            error = `Error: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
            loading = false;
        }
    }

    function selectTab(tab: Tab) {
        activeTab = tab;
        if (tab === 'solve') solveOpened = true;
    }
</script>

<div class="flex flex-col p-2 bg-white dark:bg-[#0D0C0C] rounded-xl overflow-x-hidden">
    <TabSwitcher
        compact
        active={activeTab}
        onSelect={selectTab}
        tabs={[
            { id: 'code', label: 'Source Code' },
            { id: 'play', label: 'Interactive Demo' },
            { id: 'solve', label: "Solve Today's" },
        ]}
    />

    <div class="flex-1 overflow-x-auto">
        {#if activeTab === 'code'}
            <CodeTab files={project.files} />
        {:else if activeTab === 'play'}
            <div class="h-full overflow-y-auto p-6">
                <!-- Controls -->
                <div class="space-y-4">
                    <div>
                        <label for="wordle-model" class="block text-sm font-semibold mb-2">Model</label>
                        <select
                            id="wordle-model"
                            bind:value={selectedModel}
                            disabled={loading}
                            class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] bg-white dark:bg-[#1C1A1B] text-gray-900 dark:text-white disabled:opacity-50"
                        >
                            {#each models as model (model)}
                                <option value={model}>{model.replace(/_/g, ' ').toUpperCase()}</option>
                            {/each}
                        </select>
                    </div>

                    <div>
                        <label for="wordle-word" class="block text-sm font-semibold mb-2">
                            Word (optional - any 5 letters, random if blank)
                        </label>
                        <input
                            id="wordle-word"
                            type="text"
                            bind:value={() => word, (v) => (word = v.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase())}
                            disabled={loading}
                            maxlength={5}
                            placeholder="e.g., CRANE"
                            class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] bg-white dark:bg-[#1C1A1B] text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50"
                        />
                    </div>

                    <button
                        onclick={handlePlayGame}
                        disabled={loading || (word.length > 0 && word.length < 5)}
                        class="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {#if loading}
                            <Fa icon={faSpinner} class="animate-spin" />
                            Running...
                        {:else}
                            <Fa icon={faPlay} />
                            Play Game
                        {/if}
                    </button>
                </div>

                <!-- Error Display -->
                {#if error}
                    <div class="p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg">
                        <p class="font-semibold">Error</p>
                        <p>{error}</p>
                    </div>
                {/if}

                <!-- Results Display -->
                {#if result}
                    <div class="space-y-4 border-t border-gray-200 dark:border-[#1C1A1B] pt-4">
                        <div class="bg-gray-50 dark:bg-[#1C1A1B] p-4 rounded-lg space-y-2">
                            <div class="flex justify-between">
                                <span class="font-semibold">Word:</span>
                                <span class="font-mono text-lg">{result.word.toUpperCase()}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-semibold">Model:</span>
                                <span>{result.model.replace(/_/g, ' ')}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-semibold">Guesses:</span>
                                <span class="font-semibold {result.won ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                    {result.num_guesses}/6 {result.won ? '✓ Won' : '✗ Lost'}
                                </span>
                            </div>
                            {#if result.note}
                                <p class="text-sm text-gray-500 dark:text-gray-400">{result.note}</p>
                            {/if}
                        </div>

                        <!-- Guess History -->
                        <div>
                            <h3 class="font-semibold mb-3">Guess History</h3>
                            <div class="space-y-2">
                                {#each result.guesses as guess, idx (idx)}
                                    <div class="flex items-center gap-2">
                                        <span class="text-sm text-gray-500 w-6">#{idx + 1}</span>
                                        <div class="flex gap-1">
                                            {#each guess.guess.split('') as letter, letterIdx (letterIdx)}
                                                {@const score = guess.score[letterIdx]}
                                                <div class="{score === 2 ? 'bg-green-500' : score === 1 ? 'bg-yellow-500' : 'bg-gray-400'} w-8 h-8 flex items-center justify-center text-white font-bold rounded text-sm">
                                                    {letter.toUpperCase()}
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Kept mounted once opened so switching tabs doesn't lose an in-progress game -->
        {#if solveOpened}
            <div class={activeTab === 'solve' ? 'h-full' : 'hidden'}>
                <WordleAssistPanel />
            </div>
        {/if}
    </div>
</div>
