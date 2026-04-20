import {useState, useEffect} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlay, faSpinner} from '@fortawesome/free-solid-svg-icons';
import type {Project, ProjectFile, ProjectFolder} from "../projects.ts";
import FileTree from "./FileTree.tsx";
import {Prism as SyntaxHighlighter} from "react-syntax-highlighter";
import {oneDark} from "react-syntax-highlighter/dist/esm/styles/prism";

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

interface ProjectRunnerProps {
    project: Project,
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

export default function ProjectModal({project}: ProjectRunnerProps) {
    const [models, setModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState('entropy_maximization');
    const [word, setWord] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GameResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'code' | 'play'>('code');
    const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

    const WORDLE_BOT_URL = 'https://nodejs-server-production-283e.up.railway.app';
    const flatFiles = flattenFiles(project.files);

    useEffect(() => {
        setSelectedFile(findFirstFile(project.files));
    }, [project.files, project.id]);

    useEffect(() => {
        const fetchModels = async () => {
            console.log("Fetching from:", (`${WORDLE_BOT_URL}/api/wordle/models`));
            try {
                const response = await fetch(`${WORDLE_BOT_URL}/api/wordle/models`);
                const data = await response.json();
                if (data.models) {
                    setModels(data.models);
                }
            } catch (err) {
                console.error('Failed to fetch models:', err);
            }
        };

        fetchModels();
    }, [WORDLE_BOT_URL]);

    const handlePlayGame = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch(`${WORDLE_BOT_URL}/api/wordle/play`, {
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

            {/* Conditional Rendering based on Tab */}
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
                                        language={selectedFile?.language || 'python'}
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
                    <div className="h-full overflow-y-auto p-6">
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
                                        <FontAwesomeIcon icon={faSpinner} className="animate-spin"/>
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faPlay}/>
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
                                        <span className={`font-semibold ${result.won ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
                                                        let bgColor = 'bg-gray-400';
                                                        if (score === 1) bgColor = 'bg-yellow-500';
                                                        if (score === 2) bgColor = 'bg-green-500';
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
                )}
            </div>
        </div>
    );
}
