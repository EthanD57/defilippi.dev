<!-- Renders a Font Awesome icon definition as inline SVG (replaces @fortawesome/react-fontawesome) -->
<script lang="ts">
    import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

    let { icon, class: className = '' }: { icon: IconDefinition; class?: string } = $props();

    const [width, height, , , pathData] = $derived(icon.icon);
    const paths = $derived(Array.isArray(pathData) ? pathData : [pathData]);
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 {width} {height}"
    class="fa-icon {className}"
    style:width="{width / height}em"
    aria-hidden="true"
    focusable="false"
>
    {#each paths as d (d)}
        <path fill="currentColor" {d} />
    {/each}
</svg>

<style>
    .fa-icon {
        display: inline-block;
        height: 1em;
        overflow: visible;
        vertical-align: -0.125em;
    }
</style>
