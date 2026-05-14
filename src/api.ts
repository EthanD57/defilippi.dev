import { iconMap, faJs } from './projects';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { Project, ProjectSummary, ProjectFile, ProjectFolder } from './projects';

export const API_BASE: string =
    (import.meta.env.VITE_API_URL as string | undefined) ?? '';

const SUMMARY_CACHE_KEY = 'project_summaries_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

const detailCache = new Map<string, Project>();

interface CachedSummaries {
    data: ProjectSummary[];
    timestamp: number;
}

function getCachedSummaries(): ProjectSummary[] | null {
    try {
        const raw = sessionStorage.getItem(SUMMARY_CACHE_KEY);
        if (!raw) return null;
        const cached: CachedSummaries = JSON.parse(raw);
        if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
            sessionStorage.removeItem(SUMMARY_CACHE_KEY);
            return null;
        }
        return cached.data;
    } catch {
        return null;
    }
}

function setCachedSummaries(data: ProjectSummary[]): void {
    try {
        const payload: CachedSummaries = { data, timestamp: Date.now() };
        sessionStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(payload));
    } catch {
        // sessionStorage unavailable — silent no-op
    }
}

function iconForLanguage(language: string | null | undefined): IconDefinition {
    return iconMap[(language ?? '').toLowerCase()] ?? faJs;
}

interface RawFile {
    filename: string;
    file_path: string | null;
    language: string | null;
    content: string;
}

function buildFileTree(flatFiles: RawFile[]): (ProjectFile | ProjectFolder)[] {
    const root: (ProjectFile | ProjectFolder)[] = [];
    const folderMap = new Map<string, ProjectFolder>();

    for (const f of flatFiles) {
        // Use file_path as the canonical path; fall back to filename for root-level files
        const path = f.file_path?.trim() || f.filename;
        const parts = path.split('/').filter(Boolean);

        // Create any missing ancestor folders
        let currentList = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const folderKey = parts.slice(0, i + 1).join('/');
            let folder = folderMap.get(folderKey);
            if (!folder) {
                folder = { name: parts[i], type: 'folder', children: [] };
                folderMap.set(folderKey, folder);
                currentList.push(folder);
            }
            currentList = folder.children;
        }

        currentList.push({
            name: f.filename,
            language: f.language ?? '',
            icon: iconForLanguage(f.language),
            type: 'file',
            content: f.content ?? '',
        });
    }

    return root;
}

export async function fetchProjectSummaries(): Promise<ProjectSummary[]> {
    const cached = getCachedSummaries();
    if (cached) return cached;
    const res = await fetch(`${API_BASE}/api/projects`);
    if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
    const data: ProjectSummary[] = await res.json();
    setCachedSummaries(data);
    return data;
}

export async function fetchProjectDetail(slug: string): Promise<Project> {
    const cached = detailCache.get(slug);
    if (cached) return cached;
    const res = await fetch(`${API_BASE}/api/projects/${slug}`);
    if (!res.ok) throw new Error(`Failed to fetch project "${slug}": ${res.status}`);
    const raw = await res.json() as Record<string, unknown>;
    const project: Project = {
        id: String(raw.id),
        slug: raw.slug as string,
        title: raw.title as string,
        description: raw.description as string,
        files: buildFileTree((raw.files as RawFile[]) ?? []),
    };
    detailCache.set(slug, project);
    return project;
}
