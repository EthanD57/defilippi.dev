<script lang="ts">
    const skills = [
        'Python', 'Java', 'PostgreSQL', 'Rust', 'TypeScript', 'React', 'JavaScript', 'C', 'ML',
        'Software Testing', 'Software Testing Automation', 'Docker',
    ];

    const socials = [
        { href: 'https://github.com/EthanD57', icon: 'github', alt: 'Github Logo' },
        { href: 'https://linkedin.com/in/ethan-defilippi', icon: 'linkedin', alt: 'LinkedIn Logo' },
    ];
</script>

<div class="max-w-3xl mx-auto px-6 py-16">

    <!-- Photo & Name -->
    <div class="flex flex-col items-center gap-6 mb-16">
        <h1 class="text-4xl font-semibold tracking-tight">Ethan Defilippi</h1>
    </div>

    <!-- About Me -->
    <section class="mb-16">
        <h2 class="text-2xl font-semibold mb-4">About Me</h2>
        <div class="bg-white text-black dark:bg-[#0D0C0C] rounded-3xl p-8 dark:text-white">
            <p>Hello, I’m Ethan! I am a University of Pittsburgh graduate and a junior full-stack Java developer at PNC with a passion
                for backend architecture and systems programming. I love diving into the details of data and
                performance, primarily working with Python, Rust, Java, C, and PostgreSQL. </p>
        </div>
    </section>

    <!-- Skills -->
    <section>
        <h2 class="text-2xl font-semibold mb-4">Skills</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            {#each skills as skill (skill)}
                <div class="flex items-center justify-center text-center bg-white text-black dark:bg-[#0D0C0C] dark:text-white rounded-2xl px-5 py-4">
                    {skill}
                </div>
            {/each}
        </div>
    </section>

    <!-- Socials -->
    <section class="mt-16">
        <h2 class="text-2xl font-semibold mb-4">Socials</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            {#each socials as social (social.href)}
                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external links -->
                <a href={social.href} target="_blank" rel="noopener noreferrer"
                    class="flex items-center justify-center bg-white dark:bg-[#0D0C0C] rounded-2xl px-5 py-6 hover:shadow-md transition-shadow">
                    <img src="https://skillicons.dev/icons?i={social.icon}" alt={social.alt} />
                </a>
            {/each}
        </div>
    </section>

</div>
