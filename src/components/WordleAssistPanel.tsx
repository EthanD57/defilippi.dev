import {useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSpinner, faRotateLeft, faArrowRotateRight} from '@fortawesome/free-solid-svg-icons';
import { API_BASE } from '../api';

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

export default function WordleAssistPanel() {
    const [history, setHistory] = useState<Turn[]>([]);
    const [word, setWord] = useState('CRANE');
    const [score, setScore] = useState<number[]>(EMPTY_SCORE);
    const [suggestion, setSuggestion] = useState<AssistResult | null>(OPENING_SUGGESTION);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Ask the bot for its next guess given every turn played so far.
    // Only commits the new history if the bot accepts it, so bad colors can be fixed and resubmitted.
    const applySuggestion = (nextHistory: Turn[], data: AssistResult) => {
        setHistory(nextHistory);
        setSuggestion(data);
        setWord((data.next_guess ?? '').toUpperCase());
        setScore(EMPTY_SCORE);
    };

    const requestSuggestion = async (nextHistory: Turn[]) => {
        setError(null);
        if (nextHistory.length === 0) {
            applySuggestion(nextHistory, OPENING_SUGGESTION);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/wordle/assist`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({history: nextHistory}),
            });

            // Railway can answer with an HTML error page while the bot is waking up or redeploying
            let data: AssistResult;
            try {
                data = JSON.parse(await response.text());
            } catch {
                setError("The bot didn't respond properly. It may be waking up, so give it a few seconds and try again.");
                return;
            }

            if (!data.success) {
                setError(data.error || 'Unknown error occurred');
                return;
            }

            applySuggestion(nextHistory, data);
        } catch (err) {
            setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const cycleTile = (idx: number) => {
        setScore(prev => prev.map((s, i) => (i === idx ? (s + 1) % 3 : s)));
    };

    const handleSubmit = () => {
        requestSuggestion([...history, {guess: word.toLowerCase(), score}]);
    };

    const handleUndo = () => {
        requestSuggestion(history.slice(0, -1));
    };

    const handleReset = () => {
        requestSuggestion([]);
    };

    const solved = suggestion?.solved ?? false;
    const outOfGuesses = !solved && history.length >= MAX_TURNS;
    const gameOver = solved || outOfGuesses;
    const canSubmit = !loading && !gameOver && /^[A-Z]{5}$/.test(word);

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Playing today's Wordle? Type the word you guessed, tap each tile until it matches the colors
                Wordle gave you, then submit. The entropy bot will suggest your next guess.
            </p>

            {/* Played turns */}
            {history.length > 0 && (
                <div className="space-y-2">
                    {history.map((turn, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 w-6">#{idx + 1}</span>
                            <div className="flex gap-1">
                                {turn.guess.split('').map((letter, letterIdx) => (
                                    <div
                                        key={letterIdx}
                                        className={`${tileColor(turn.score[letterIdx])} w-8 h-8 flex items-center justify-center text-white font-bold rounded text-sm`}
                                    >
                                        {letter.toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Suggestion + current turn input */}
            {gameOver ? (
                <div className={`p-4 rounded-lg font-semibold ${solved ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'}`}>
                    {solved ? `Solved in ${history.length}/${MAX_TURNS}! ✓` : 'Out of guesses ✗'}
                </div>
            ) : (
                <div className="space-y-4">
                    {suggestion?.next_guess && (
                        <div className="bg-gray-50 dark:bg-[#1C1A1B] p-4 rounded-lg space-y-2">
                            <div className="flex justify-between">
                                <span className="font-semibold">Suggested guess:</span>
                                <span className="font-mono text-lg">{suggestion.next_guess.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold">Possible answers left:</span>
                                <span>{suggestion.remaining_count?.toLocaleString()}</span>
                            </div>
                            {suggestion.remaining_words && suggestion.remaining_words.length > 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                    {suggestion.remaining_words.map(w => w.toUpperCase()).join(', ')}
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold mb-2">
                            Guess #{history.length + 1}
                        </label>
                        <input
                            type="text"
                            value={word}
                            onChange={(e) => setWord(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase())}
                            disabled={loading}
                            maxLength={5}
                            placeholder="e.g., CRANE"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] bg-white dark:bg-[#1C1A1B] text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Tap tiles to set colors</label>
                        <div className="flex gap-2">
                            {EMPTY_SCORE.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => cycleTile(idx)}
                                    disabled={loading}
                                    aria-label={`Tile ${idx + 1}`}
                                    className={`${tileColor(score[idx])} w-12 h-12 flex items-center justify-center text-white font-bold rounded text-lg transition-colors disabled:opacity-50`}
                                >
                                    {word[idx] ?? ''}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin"/>
                                Thinking...
                            </>
                        ) : (
                            'Submit Colors'
                        )}
                    </button>
                </div>
            )}

            <div className="flex gap-2">
                <button
                    onClick={handleUndo}
                    disabled={loading || history.length === 0}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <FontAwesomeIcon icon={faRotateLeft}/>
                    Undo
                </button>
                <button
                    onClick={handleReset}
                    disabled={loading || history.length === 0}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <FontAwesomeIcon icon={faArrowRotateRight}/>
                    Reset
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg">
                    <p className="font-semibold">Error</p>
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
}
