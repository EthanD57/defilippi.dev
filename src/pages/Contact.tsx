import { useActionState } from 'react';

type Status = { success: boolean; error: boolean } | null;

async function submitForm(_prev: Status, formData: FormData): Promise<Status> {
    const res = await fetch('https://formspree.io/f/mbdblzwb', {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
    });
    return res.ok ? { success: true, error: false } : { success: false, error: true };
}

export function Contact() {
    const [status, action, pending] = useActionState(submitForm, null);

    return (
        <div className="max-w-xl mx-auto px-6 py-16">
            <h1 className="text-4xl font-semibold tracking-tight mb-2">Contact</h1>
            <p className="text-[#86868b] mb-10">Send me a message and I'll get back to you.</p>

            <form action={action} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        name="name"
                        required
                        className="bg-white dark:bg-[#0D0C0C] rounded-2xl px-4 py-3 text-sm outline-none border border-transparent focus:border-[#86868b] transition-colors"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
                    <input
                        type="email"
                        name="email"
                        required
                        className="bg-white dark:bg-[#0D0C0C] rounded-2xl px-4 py-3 text-sm outline-none border border-transparent focus:border-[#86868b] transition-colors"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        className="bg-white dark:bg-[#0D0C0C] rounded-2xl px-4 py-3 text-sm outline-none border border-transparent focus:border-[#86868b] transition-colors"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Message <span className="text-red-500">*</span></label>
                    <textarea
                        name="message"
                        required
                        rows={6}
                        className="bg-white dark:bg-[#0D0C0C] rounded-2xl px-4 py-3 text-sm outline-none border border-transparent focus:border-[#86868b] transition-colors resize-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={pending}
                    className="mt-2 bg-[#1d1d1f] dark:bg-[#f5f5f7] text-[#f5f5f7] dark:text-[#1d1d1f] rounded-2xl px-6 py-3 text-sm font-semibold disabled:opacity-50 transition-opacity"
                >
                    {pending ? 'Sending…' : 'Send Message'}
                </button>

                {status?.success && (
                    <p className="text-sm text-green-600 dark:text-green-400 text-center">Message sent!</p>
                )}
                {status?.error && (
                    <p className="text-sm text-red-500 text-center">Something went wrong. Please try again.</p>
                )}
            </form>
        </div>
    );
}
