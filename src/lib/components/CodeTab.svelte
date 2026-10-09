<!-- "Source Code" tab shared by the project modals: file picker + syntax-highlighted viewer -->
<script lang="ts">
    import Prism from 'prismjs';
    import 'prismjs/components/prism-python';
    import 'prismjs/components/prism-markdown';
    import 'prismjs/components/prism-json';
    import 'prismjs/components/prism-bash';
    import 'prismjs/components/prism-toml';
    import 'prismjs/components/prism-yaml';
    import 'prismjs/components/prism-typescript';
    import 'prism-themes/themes/prism-one-dark.css';
    import type { ProjectFile, ProjectFolder } from '../projects';
    import { findFirstFile, flattenFiles } from '../files';
    import FileTree from './FileTree.svelte';

    let { files }: { files: (ProjectFile | ProjectFolder)[] } = $props();

    let picked = $state.raw<ProjectFile | null>(null);
    const selectedFile = $derived(picked ?? findFirstFile(files));
    const flatFiles = $derived(flattenFiles(files));
    const selectedPath = $derived(
        selectedFile ? flatFiles.find(f => f.file === selectedFile)?.path ?? selectedFile.name : '',
    );

    const language = $derived(selectedFile?.language || 'python');
    // Prism escapes the source, so the output is safe for {@html}. Unknown languages render as plain text.
    const highlighted = $derived(
        Prism.highlight(selectedFile?.content || '', Prism.languages[language] ?? {}, language),
    );
</script>

<div class="flex flex-col md:flex-row h-full">
    <!-- Mobile: dropdown file selector -->
    <div class="md:hidden px-3 py-2 border-b border-gray-200 dark:border-[#1C1A1B] bg-gray-50 dark:bg-[#0D0C0C]">
        <select
            value={selectedPath}
            onchange={(e) => {
                const match = flatFiles.find(f => f.path === e.currentTarget.value);
                if (match) picked = match.file;
            }}
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#1C1A1B] bg-white dark:bg-[#1C1A1B] text-sm text-gray-900 dark:text-white"
        >
            {#each flatFiles as { path } (path)}
                <option value={path}>{path}</option>
            {/each}
        </select>
    </div>

    <!-- Desktop: sidebar file tree -->
    <aside class="hidden md:flex flex-col w-max shrink-0 border-r border-gray-100 dark:border-[#1C1A1B] bg-gray-50/50 dark:bg-[#0D0C0C] p-4 overflow-y-auto">
        <h4 class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Files</h4>
        <FileTree items={files} onFileClick={(file) => (picked = file)} {selectedFile} />
    </aside>

    <!-- Code viewer -->
    <main class="flex-1 min-w-0 flex flex-col bg-white dark:bg-[#0D0C0C] overflow-hidden">
        <div class="flex overflow-auto bg-[#282c34] rounded-xl m-2">
            <div class="w-max min-w-full pr-3 box-border">
                <!-- eslint-disable svelte/no-at-html-tags -- Prism escapes the source -->
                <pre
                    class="language-{language}"
                    style="margin: 0; padding: 24px; font-size: 14px; line-height: 1.5; background-color: transparent; overflow: visible; min-height: 100%; border-radius: 0;"
                ><code class="language-{language}">{@html highlighted}</code></pre>
                <!-- eslint-enable svelte/no-at-html-tags -->
            </div>
        </div>
    </main>
</div>
