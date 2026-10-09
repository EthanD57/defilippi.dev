<script lang="ts">
    import type { ProjectFile, ProjectFolder } from '../projects';
    import Fa from './Fa.svelte';
    import FileTree from './FileTree.svelte';

    interface Props {
        items: (ProjectFile | ProjectFolder)[];
        onFileClick: (file: ProjectFile) => void;
        selectedFile: ProjectFile | null;
        depth?: number; // Tracks how far to indent
    }

    let { items, onFileClick, selectedFile, depth = 0 }: Props = $props();
</script>

<ul class="space-y-1">
    {#each items as item (item.name)}
        <li style:padding-left="{depth * 12}px">
            {#if item.type === 'folder'}
                <div>
                    <div class="flex items-center gap-2 p-2 text-gray-400 text-[11px] font-bold uppercase tracking-widest">
                        <span>📁</span> {item.name}
                    </div>
                    <!-- This is the Recursion: The component renders itself for the children -->
                    <FileTree items={item.children} {onFileClick} {selectedFile} depth={depth + 1} />
                </div>
            {:else}
                <button
                    type="button"
                    onclick={() => onFileClick(item)}
                    class="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm font-medium transition-colors w-min text-left {selectedFile === item
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}"
                >
                    <span><Fa icon={item.icon} /></span>{item.name}
                </button>
            {/if}
        </li>
    {/each}
</ul>
