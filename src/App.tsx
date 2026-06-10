import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { NavLink, Route, Routes } from 'react-router-dom';
import type { ProjectSummary, Project } from './projects';
import { fetchProjectSummaries, fetchProjectDetail } from './api';
import Switch from './components/Switch.tsx'
import BackgroundLogos from "./components/BackgroundLogos.tsx";
import WordleBotModal from './components/WordleBotModal.tsx';
import LunarLanderModal from './components/LunarLanderModal.tsx';
import { About } from './pages/About.tsx';
import { Contact } from './pages/Contact.tsx';

function App() {
    const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [pendingTitle, setPendingTitle] = useState('');

    useEffect(() => {
        fetchProjectSummaries().then(setSummaries).catch(console.error);
    }, []);

    const handleCardClick = async (summary: ProjectSummary) => {
        setPendingTitle(summary.title);
        setLoadingDetail(true);
        try {
            const project = await fetchProjectDetail(summary.slug);
            setActiveProject(project);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const closeModal = () => {
        setActiveProject(null);
        setLoadingDetail(false);
        setPendingTitle('');
    };

    const home = (
        <>
            <header className="py-24 px-6 text-center">
                <h1 className="z-10 text-5xl md:text-6xl font-semibold tracking-tight mb-4">Ethan Defilippi Technical Showcase</h1>
                <p className="z-10 text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto">Click a project to interact.</p>
                <p className="z-10 text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto">I am slowly adapting/making projects for this site.</p>
                <p className="z-10 text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto">Please excuse the lack of content for now!</p>
            </header>

            <section className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {summaries.map((summary) => (
                    <div
                        key={summary.id}
                        onClick={() => handleCardClick(summary)}
                        className="group z-10 bg-white dark:bg-[#0D0C0C] rounded-4xl p-10 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                    >
                        <h3 className="text-2xl font-semibold mb-2">{summary.title}</h3>
                        <p className="text-[#86868b]">{summary.description}</p>
                    </div>
                ))}
            </section>

            {(activeProject !== null || loadingDetail) && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-10 bg-black/20 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#0D0C0C] w-full max-w-6xl h-[85vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-8 py-5 border-b border-gray-100 dark:border-[#1C1A1B] flex justify-between items-center bg-white dark:bg-[#0D0C0C]">
                            <h2 className="text-xl font-semibold">{activeProject?.title ?? pendingTitle}</h2>
                            <button onClick={closeModal} className="bg-gray-100 dark:bg-[#1C1A1B] rounded-full h-8 w-8">✕</button>
                        </div>
                        {activeProject
                            ? activeProject.slug.includes('lunar')
                                ? <LunarLanderModal project={activeProject} />
                                : <WordleBotModal project={activeProject} />
                            : (
                                <div className="flex-1 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-gray-400" />
                                </div>
                            )
                        }
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="min-h-screen transition-colors duration-500 bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans">
            <BackgroundLogos />
            <nav className="sticky top-0 z-50 h-12 flex items-center justify-between px-8 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-6">
                    <NavLink to="/" end className={({ isActive }) => `text-sm tracking-tight transition-colors ${isActive ? 'font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]' : 'font-normal text-[#86868b]'}`}>Portfolio</NavLink>
                    <NavLink to="/about" className={({ isActive }) => `text-sm tracking-tight transition-colors ${isActive ? 'font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]' : 'font-normal text-[#86868b]'}`}>About</NavLink>
                    <NavLink to="/contact" className={({ isActive }) => `text-sm tracking-tight transition-colors ${isActive ? 'font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]' : 'font-normal text-[#86868b]'}`}>Contact</NavLink>
                </div>
                <Switch />
            </nav>
            <Routes>
                <Route path="/" element={home} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
            </Routes>
        </div>
    );
}

export default App;