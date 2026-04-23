import { useState } from 'react';
import { projects } from './projects';
import Switch from './components/Switch.tsx'
import BackgroundLogos from "./components/BackgroundLogos.tsx";
import ProjectModal from './components/ProjectModal.tsx';

function App() {
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    // Helper to find the full project object based on the ID
    const activeProject = projects.find(p => p.id === activeProjectId);

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
                <p className="z-10 text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto">This website is currently undergoing a backend overhaul!</p>
                <p className="z-10 text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto">Please excuse the lack of content for now...</p>
            </header>

            <section className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        onClick={() => {
                            setActiveProjectId(project.id);
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
                        <ProjectModal project={activeProject}/>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;