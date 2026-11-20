import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faPython, faJs, faReact } from '@fortawesome/free-brands-svg-icons';
import { faFileLines, faFile } from '@fortawesome/free-solid-svg-icons';
import mazeSolverSource from './components/MazeSolverModal.tsx?raw';

export { faPython, faJs };

export const iconMap: Record<string, IconDefinition> = {
    python: faPython,
    js: faJs,
    javascript: faJs,
    markdown: faFileLines,
    md: faFileLines,
    text: faFile,
    txt: faFile,
    plaintext: faFile,
};

export interface ProjectFile {
    name: string;
    language: string;
    icon: IconDefinition;
    type: 'file';
    content: string;
}

export interface ProjectFolder {
    name: string;
    type: 'folder';
    children: (ProjectFile | ProjectFolder)[];
}

export interface Project {
    id: string;
    slug: string;
    title: string;
    description: string;
    files: (ProjectFile | ProjectFolder)[];
}

export interface ProjectSummary {
    id: string;
    slug: string;
    title: string;
    description: string;
}

// Front-end-only projects that don't live in the backend database.
// The Source Code tab shows the component file itself.

export const mazeSolverProject: Project = {
    id: 'maze-solver',
    slug: 'maze-solver',
    title: 'A* Maze Solver',
    description: 'Generate a random maze and watch an A* pathfinding bot solve it. Runs entirely in the browser.',
    files: [
        {
            name: 'MazeSolverModal.tsx',
            language: 'tsx',
            icon: faReact,
            type: 'file',
            content: mazeSolverSource,
        },
    ],
};
