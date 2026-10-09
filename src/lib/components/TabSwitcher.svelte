<!-- Segmented control used for the tabs at the top of each project modal -->
<script lang="ts" generics="T extends string">
    let { tabs, active, onSelect, compact = false }: {
        tabs: { id: T; label: string }[];
        active: T;
        onSelect: (id: T) => void;
        compact?: boolean;
    } = $props();
</script>

<div class="flex justify-center p-2 dark:border-[#1C1A1B]">
    <div class="flex bg-gray-100 dark:bg-[#1C1A1B] p-1 rounded-xl">
        {#each tabs as tab (tab.id)}
            <button
                onclick={() => onSelect(tab.id)}
                class="{compact ? 'px-3 sm:px-6' : 'px-6'} py-1.5 rounded-lg text-sm transition-all {active === tab.id ? 'bg-white dark:bg-gray-600 shadow-sm' : 'opacity-50'}"
            >
                {tab.label}
            </button>
        {/each}
    </div>
</div>
