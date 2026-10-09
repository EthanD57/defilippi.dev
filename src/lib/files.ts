import type { ProjectFile, ProjectFolder } from './projects';

export function findFirstFile(items: (ProjectFile | ProjectFolder)[]): ProjectFile | null {
    for (const item of items) {
        if (item.type === 'file') return item;
        const found = findFirstFile(item.children);
        if (found) return found;
    }
    return null;
}

export function flattenFiles(
    items: (ProjectFile | ProjectFolder)[],
    prefix = '',
): { file: ProjectFile; path: string }[] {
    const result: { file: ProjectFile; path: string }[] = [];
    for (const item of items) {
        if (item.type === 'file') result.push({ file: item, path: prefix + item.name });
        else result.push(...flattenFiles(item.children, prefix + item.name + '/'));
    }
    return result;
}
