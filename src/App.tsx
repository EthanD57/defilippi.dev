import { useState } from 'react';
import { projects } from './projects';
import type { ProjectFile, ProjectFolder } from './projects';
import Switch from './components/Switch.tsx'
import FileTree from './FileTree';

//Makes the code windows look like IDEs
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faDumpsterFire} from "@fortawesome/free-solid-svg-icons";
import BackgroundLogos from "./BackgroundLogos.tsx";

function App() {
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    // State holds the selected file object directly so nested files work without a recursive search
    const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

    // Helper to find the full project object based on the ID
    const activeProject = projects.find(p => p.id === activeProjectId);

    // Recursively finds the first ProjectFile in a tree (skips folders)
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

    return (
        <div className="min-h-screen transition-colors duration-500 bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans">
            <BackgroundLogos />
            <nav className="sticky top-0 z-50 h-12 flex items-center justify-between px-8 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10">
                <span className="text-sm font-semibold tracking-tight">Portfolio</span>
                <Switch />
            </nav>
            <header className="py-24 px-6 text-center">
                <h1 className="z-10 text-5xl md:text-6xl font-semibold tracking-tight mb-4">Ethan Defilippi Technical Showcase</h1>
                <p className="z-10 text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto">Click a project to interact.</p>
                <p className="z-10 text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto">This website is under construction as of April 10, 2026</p>
                <p className="z-10 text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto"><span><FontAwesomeIcon icon={faDumpsterFire}/></span> -- Dumpster Fire (Current Website State) </p>
            </header>

            <section className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        onClick={() => {
                            setActiveProjectId(project.id);
                            setSelectedFile(findFirstFile(project.files)); // Reset to first file on open
                        }}
                        className="group z-10 bg-white dark:bg-[#0D0C0C] rounded-4xl p-10 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                    >
                        <h3 className="text-2xl font-semibold mb-2">{project.title}</h3>
                        <p className="text-[#86868b]">{project.description}</p>
                    </div>
                ))}
            </section>

            {/* --- THE INTERACTIVE SQUIRCLE WINDOW --- */}
            {activeProject && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-10 bg-black/20 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#0D0C0C] w-full max-w-6xl h-[85vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden">

                        {/* Window Header */}
                        <div className="px-8 py-5 border-b border-gray-100 dark:border-[#1C1A1B] flex justify-between items-center bg-white dark:bg-[#0D0C0C]">
                            <h2 className="text-xl font-semibold">{activeProject.title}</h2>
                            <button onClick={() => setActiveProjectId(null)} className="bg-gray-100 dark:bg-[#1C1A1B] rounded-full h-8 w-8">✕</button>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* SIDEBAR: File Tree */}
                            <aside className="w-min border-r border-gray-100 bg-gray-50/50 dark:bg-[#0D0C0C] dark:border-[#0D0C0C] p-6 overflow-y-visible overflow-x-hidden">
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 ">Files</h4>
                                <aside className="w-min border-r border-gray-100 dark:border-[#0D0C0C] bg-gray-50/50 dark:bg-[#1C1A1B] p-6 overflow-hidden">
                                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Project Files</h4>
                                    <FileTree
                                        items={activeProject.files}
                                        onFileClick={(file) => setSelectedFile(file)}
                                        selectedFile={selectedFile?.name ?? null}
                                    />
                                </aside>
                            </aside>

                            {/* MAIN CONTENT: Dynamic Code Viewer */}
                            <main className="flex-1 min-w-0 flex flex-col bg-white dark:bg-[#0D0C0C]">
                                <div className="flex-1 overflow-auto bg-[#282c34]"> {/* One Dark background color */}
                                    <div style={{ width: 'max-content', minWidth: '100%', paddingRight: '12px', boxSizing: 'border-box'}}>
                                    <SyntaxHighlighter
                                        language={selectedFile?.language || 'python'}  /* I will inevitably forget this, so this stops a crash */
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

                                {/* IFRAME: External Output */}
                                <div className="h-1/3 border-t border-gray-100 bg-black relative">
                                    <iframe src={activeProject.iframeUrl} className="w-full h-full border-none"/>
                                </div>
                            </main>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;