<script lang="ts">
    type Status = { success: boolean; error: boolean } | null;

    let status = $state<Status>(null);
    let pending = $state(false);

    async function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
        event.preventDefault();
        pending = true;
        try {
            const res = await fetch('https://formspree.io/f/mbdblzwb', {
                method: 'POST',
                body: new FormData(event.currentTarget),
                headers: { Accept: 'application/json' },
            });
            status = res.ok ? { success: true, error: false } : { success: false, error: true };
        } catch {
            status = { success: false, error: true };
        } finally {
            pending = false;
        }
    }

    const inputClass = 'bg-white dark:bg-[#0D0C0C] rounded-2xl px-4 py-3 text-sm outline-none border border-transparent focus:border-[#86868b] transition-colors';
</script>

<div class="max-w-xl mx-auto px-6 py-16">
    <h1 class="text-4xl font-semibold tracking-tight mb-2">Contact</h1>
    <p class="text-[#86868b] mb-10">Send me a message and I'll get back to you.</p>

    <form onsubmit={handleSubmit} class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
            <label for="name" class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
            <input id="name" type="text" name="name" required class={inputClass} />
        </div>

        <div class="flex flex-col gap-1">
            <label for="email" class="text-sm font-medium">Email <span class="text-red-500">*</span></label>
            <input id="email" type="email" name="email" required class={inputClass} />
        </div>

        <div class="flex flex-col gap-1">
            <label for="phone" class="text-sm font-medium">Phone Number</label>
            <input id="phone" type="tel" name="phone" class={inputClass} />
        </div>

        <div class="flex flex-col gap-1">
            <label for="message" class="text-sm font-medium">Message <span class="text-red-500">*</span></label>
            <textarea id="message" name="message" required rows={6} class="{inputClass} resize-none"></textarea>
        </div>

        <button
            type="submit"
            disabled={pending}
            class="mt-2 bg-[#1d1d1f] dark:bg-[#f5f5f7] text-[#f5f5f7] dark:text-[#1d1d1f] rounded-2xl px-6 py-3 text-sm font-semibold disabled:opacity-50 transition-opacity"
        >
            {pending ? 'Sending…' : 'Send Message'}
        </button>

        {#if status?.success}
            <p class="text-sm text-green-600 dark:text-green-400 text-center">Message sent!</p>
        {/if}
        {#if status?.error}
            <p class="text-sm text-red-500 text-center">Something went wrong. Please try again.</p>
        {/if}
    </form>
</div>
