import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faPython, faJs } from '@fortawesome/free-brands-svg-icons';
import { faFileLines, faFile } from '@fortawesome/free-solid-svg-icons';

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