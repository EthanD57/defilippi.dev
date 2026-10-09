<script lang="ts">
    import '../app.css';
    import { page } from '$app/state';
    import { resolve } from '$app/paths';
    import BackgroundLogos from '#lib/components/BackgroundLogos.svelte';
    import ThemeSwitch from '#lib/components/ThemeSwitch.svelte';

    let { children } = $props();

    const links = [
        { href: '/', label: 'Portfolio' },
        { href: '/about', label: 'About' },
        { href: '/contact', label: 'Contact' },
    ] as const;
</script>

<div class="min-h-screen transition-colors duration-500 bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans">
    <BackgroundLogos />
    <nav class="sticky top-0 z-50 h-12 flex items-center justify-between px-8 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10">
        <div class="flex items-center gap-6">
            {#each links as link (link.href)}
                {@const isActive = page.url.pathname === resolve(link.href)}
                <a
                    href={resolve(link.href)}
                    aria-current={isActive ? 'page' : undefined}
                    class="text-sm tracking-tight transition-colors {isActive ? 'font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]' : 'font-normal text-[#86868b]'}"
                >
                    {link.label}
                </a>
            {/each}
        </div>
        <ThemeSwitch />
    </nav>
    {@render children()}
</div>
