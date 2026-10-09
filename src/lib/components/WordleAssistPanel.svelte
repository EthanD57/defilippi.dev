<script lang="ts">
    import { faSpinner, faRotateLeft, faArrowRotateRight } from '@fortawesome/free-solid-svg-icons';
    import { API_BASE } from '../api';
    import Fa from './Fa.svelte';

    interface Turn {
        guess: string;
        score: number[];
    }

    interface AssistResult {
        success: boolean;
        solved?: boolean;
        next_guess?: string | null;
        remaining_count?: number;
        remaining_words?: string[];
        error?: string;
    }

    const MAX_TURNS = 6;
    const EMPTY_SCORE = [0, 0, 0, 0, 0];

    // The bot always opens with CRANE, so a fresh game doesn't need a round trip to the server
    const OPENING_SUGGESTION: AssistResult = {
        success: true,
        solved: false,
        next_guess: 'crane',
        remaining_count: 12972,
        remaining_words: [],
    };

    function tileColor(score: number): string {
        if (score === 2) return 'bg-green-500';
        if (score === 1) return 'bg-yellow-500';
        return 'bg-gray-400';
    }

    let history = $state<Turn[]>([]);
    let word = $state('CRANE');
    let score = $state<number[]>([...EMPTY_SCORE]);
    let suggestion = $state<AssistResult | null>(OPENING_SUGGESTION);
    let loading = $state(false);
    let error = $state<string | null>(null);

    // Ask the bot for its next guess given every turn played so far.
    // Only commits the new history if the bot accepts it, so bad colors can be fixed and resubmitted.
    function applySuggestion(nextHistory: Turn[], data: AssistResult) {
        history = nextHistory;
        suggestion = data;
        word = (data.next_guess ?? '').toUpperCase();
        score = [...EMPTY_SCORE];
    }

    async function requestSuggestion(nextHistory: Turn[]) {
        error = null;
        if (nextHistory.length === 0) {
            applySuggestion(nextHistory, OPENING_SUGGESTION);
            return;
        }

        loading = true;
        try {
            const response = await fetch(`${API_BASE}/api/wordle/assist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: nextHistory }),
            });

            // Railway can answer with an HTML error page while the bot is waking up or redeploying
            let data: AssistResult;
            try {
                data = JSON.parse(await response.text());
            } catch {
                error = "The bot didn't respond properly. It may be waking up, so give it a few seconds and try again.";
                return;
            }

            if (!data.success) {
                error = data.error || 'Unknown error occurred';
                return;
            }

            applySuggestion(nextHistory, data);
        } catch (err) {
            error = `Error: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
            loading = false;
        }
    }

    const handleSubmit = () => requestSuggestion([...history, { guess: word.toLowerCase(), score: [...score] }]);
    const handleUndo = () => requestSuggestion(history.slice(0, -1));
    const handleReset = () => requestSuggestion([]);

    const solved = $derived(suggestion?.solved ?? false);
    const outOfGuesses = $derived(!solved && history.length >= MAX_TURNS);
    const gameOver = $derived(solved || outOfGuesses);
    const canSubmit = $derived(!loading && !gameOver && /^[A-Z]{5}$/.test(word));
</script>

<div class="h-full overflow-y-auto p-6 space-y-6">
    <p class="text-sm text-gray-500 dark:text-gray-400">
        Playing today's Wordle? Type the word you guessed, tap each tile until it matches the colors
        Wordle gave you, then submit. The entropy bot will suggest your next guess.
    </p>

    <!-- Played turns -->
    {#if history.length > 0}
        <div class="space-y-2">
            {#each history as turn, idx (idx)}
                <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-500 w-6">#{idx + 1}</span>
                    <div class="flex gap-1">
                        {#each turn.guess.split('') as letter, letterIdx (letterIdx)}
                            <div class="{tileColor(turn.score[letterIdx])} w-8 h-8 flex items-center justify-center text-white font-bold rounded text-sm">
                                {letter.toUpperCase()}
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Suggestion + current turn input -->
    {#if gameOver}
        <div class="p-4 rounded-lg font-semibold {solved ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'}">
            {solved ? `Solved in ${history.length}/${MAX_TURNS}! ✓` : 'Out of guesses ✗'}
        </div>
    {:else}
        <div class="space-y-4">
            {#if suggestion?.next_guess}
                <div class="bg-gray-50 dark:bg-[#1C1A1B] p-4 rounded-lg space-y-2">
                    <div class="flex justify-between">
                        <span class="font-semibold">Suggested guess:</span>
                        <span class="font-mono text-lg">{suggestion.next_guess.toUpperCase()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-semibold">Possible answers left:</span>
                        <span>{suggestion.remaining_count?.toLocaleString()}</span>
                    </div>
                    {#if suggestion.remaining_words && suggestion.remaining_words.length > 0}
                        <p class="text-sm text-gray-500 dark:text-gray-400 break-words">
                            {suggestion.remaining_words.map(w => w.toUpperCase()).join(', ')}
                        </p>
                    {/if}
                </div>
            {/if}

            <div>
                <label for="assist-guess" class="block text-sm font-semibold mb-2">
                    Guess #{history.length + 1}
                </label>
                <input
                    id="assist-guess"
                    type="text"
                    bind:value={() => word, (v) => (word = v.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase())}
                    disabled={loading}
                    maxlength={5}
                    placeholder="e.g., CRANE"
                    class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] bg-white dark:bg-[#1C1A1B] text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50"
                />
            </div>

            <div>
                <span class="block text-sm font-semibold mb-2">Tap tiles to set colors</span>
                <div class="flex gap-2">
                    {#each EMPTY_SCORE, idx (idx)}
                        <button
                            type="button"
                            onclick={() => (score[idx] = (score[idx] + 1) % 3)}
                            disabled={loading}
                            aria-label="Tile {idx + 1}"
                            class="{tileColor(score[idx])} w-12 h-12 flex items-center justify-center text-white font-bold rounded text-lg transition-colors disabled:opacity-50"
                        >
                            {word[idx] ?? ''}
                        </button>
                    {/each}
                </div>
            </div>

            <button
                onclick={handleSubmit}
                disabled={!canSubmit}
                class="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
                {#if loading}
                    <Fa icon={faSpinner} class="animate-spin" />
                    Thinking...
                {:else}
                    Submit Colors
                {/if}
            </button>
        </div>
    {/if}

    <div class="flex gap-2">
        <button
            onclick={handleUndo}
            disabled={loading || history.length === 0}
            class="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] disabled:opacity-50 flex items-center justify-center gap-2"
        >
            <Fa icon={faRotateLeft} />
            Undo
        </button>
        <button
            onclick={handleReset}
            disabled={loading || history.length === 0}
            class="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] disabled:opacity-50 flex items-center justify-center gap-2"
        >
            <Fa icon={faArrowRotateRight} />
            Reset
        </button>
    </div>

    {#if error}
        <div class="p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg">
            <p class="font-semibold">Error</p>
            <p>{error}</p>
        </div>
    {/if}
</div>
