<script lang="ts">
    import { onMount } from 'svelte';
    import { faSpinner } from '@fortawesome/free-solid-svg-icons';
    import type { ProjectSummary, Project } from '#lib/projects.ts';
    import { fetchProjectSummaries, fetchProjectDetail } from '#lib/api.ts';
    import Fa from '#lib/components/Fa.svelte';
    import WordleBotModal from '#lib/components/WordleBotModal.svelte';
    import LunarLanderModal from '#lib/components/LunarLanderModal.svelte';

    let summaries = $state.raw<ProjectSummary[]>([]);
    let activeProject = $state.raw<Project | null>(null);
    let loadingDetail = $state(false);
    let pendingTitle = $state('');

    onMount(() => {
        fetchProjectSummaries().then((s) => (summaries = s)).catch(console.error);
    });

    async function handleCardClick(summary: ProjectSummary) {
        pendingTitle = summary.title;
        loadingDetail = true;
        try {
            activeProject = await fetchProjectDetail(summary.slug);
        } catch (err) {
            console.error(err);
        } finally {
            loadingDetail = false;
        }
    }

    function closeModal() {
        activeProject = null;
        loadingDetail = false;
        pendingTitle = '';
    }
</script>

<header class="py-24 px-6 text-center">
    <h1 class="z-10 text-5xl md:text-6xl font-semibold tracking-tight mb-4">Ethan Defilippi Technical Showcase</h1>
    <p class="z-10 text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto">Click a project to interact.</p>
    <p class="z-10 text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto">I am slowly adapting/making projects for this site.</p>
    <p class="z-10 text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto">Please excuse the lack of content for now!</p>
</header>

<section class="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each summaries as summary (summary.id)}
        <button
            type="button"
            onclick={() => handleCardClick(summary)}
            class="group z-10 text-left bg-white dark:bg-[#0D0C0C] rounded-4xl p-10 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
        >
            <h3 class="text-2xl font-semibold mb-2">{summary.title}</h3>
            <p class="text-[#86868b]">{summary.description}</p>
        </button>
    {/each}
</section>

{#if activeProject !== null || loadingDetail}
    <div class="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-10 bg-black/20 backdrop-blur-md">
        <div class="bg-white dark:bg-[#0D0C0C] w-full max-w-6xl h-[85vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
            <div class="px-8 py-5 border-b border-gray-100 dark:border-[#1C1A1B] flex justify-between items-center bg-white dark:bg-[#0D0C0C]">
                <h2 class="text-xl font-semibold">{activeProject?.title ?? pendingTitle}</h2>
                <button onclick={closeModal} aria-label="Close" class="bg-gray-100 dark:bg-[#1C1A1B] rounded-full h-8 w-8">✕</button>
            </div>
            {#if activeProject}
                {#key activeProject.id}
                    {#if activeProject.slug.includes('lunar')}
                        <LunarLanderModal project={activeProject} />
                    {:else}
                        <WordleBotModal project={activeProject} />
                    {/if}
                {/key}
            {:else}
                <div class="flex-1 flex items-center justify-center">
                    <Fa icon={faSpinner} class="animate-spin text-4xl text-gray-400" />
                </div>
            {/if}
        </div>
    </div>
{/if}
