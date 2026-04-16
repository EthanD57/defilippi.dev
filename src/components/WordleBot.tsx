import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faSpinner } from '@fortawesome/free-solid-svg-icons';

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
}

export default function WordleBot() {
    const [models, setModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState('entropy_maximization');
    const [word, setWord] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GameResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    // Fetch available models on mount
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/wordle/models`);
                const data = await response.json();
                if (data.models) {
                    setModels(data.models);
                }
            } catch (err) {
                console.error('Failed to fetch models:', err);
            }
        };

        fetchModels();
    }, [BACKEND_URL]);

    const handlePlayGame = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch(`${BACKEND_URL}/api/wordle/play`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    word: word || undefined,
                    model: selectedModel,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Unknown error occurred');
                return;
            }

            setResult(data);
        } catch (err) {
            setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 bg-white dark:bg-[#0D0C0C] rounded-xl">
            {/* Controls */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold mb-2">Model</label>
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] bg-white dark:bg-[#1C1A1B] text-gray-900 dark:text-white disabled:opacity-50"
                    >
                        {models.map((model) => (
                            <option key={model} value={model}>
                                {model.replace(/_/g, ' ').toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2">
                        Word (optional - random if blank)
                    </label>
                    <input
                        type="text"
                        value={word}
                        onChange={(e) => setWord(e.target.value.slice(0, 5).toUpperCase())}
                        disabled={loading}
                        maxLength={5}
                        placeholder="e.g., CRANE"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] bg-white dark:bg-[#1C1A1B] text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50"
                    />
                </div>

                <button
                    onClick={handlePlayGame}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            Running...
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faPlay} />
                            Play Game
                        </>
                    )}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg">
                    <p className="font-semibold">Error</p>
                    <p>{error}</p>
                </div>
            )}

            {/* Results Display */}
            {result && (
                <div className="space-y-4 border-t border-gray-200 dark:border-[#1C1A1B] pt-4">
                    <div className="bg-gray-50 dark:bg-[#1C1A1B] p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                            <span className="font-semibold">Word:</span>
                            <span className="font-mono text-lg">{result.word.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Model:</span>
                            <span>{result.model.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Guesses:</span>
                            <span
                                className={`font-semibold ${
                                    result.won ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                }`}
                            >
                {result.num_guesses}/6 {result.won ? '✓ Won' : '✗ Lost'}
              </span>
                        </div>
                    </div>

                    {/* Guess History */}
                    <div>
                        <h3 className="font-semibold mb-3">Guess History</h3>
                        <div className="space-y-2">
                            {result.guesses.map((guess, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500 w-6">#{idx + 1}</span>
                                    <div className="flex gap-1">
                                        {guess.guess.split('').map((letter, letterIdx) => {
                                            const score = guess.score[letterIdx];
                                            let bgColor = 'bg-gray-400'; // Wrong (0)
                                            if (score === 1) bgColor = 'bg-yellow-500'; // Wrong position (1)
                                            if (score === 2) bgColor = 'bg-green-500'; // Correct (2)

                                            return (
                                                <div
                                                    key={letterIdx}
                                                    className={`${bgColor} w-8 h-8 flex items-center justify-center text-white font-bold rounded text-sm`}
                                                >
                                                    {letter.toUpperCase()}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}