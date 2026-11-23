import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { API_BASE } from '../api';

// Hidden page at /secret (not in the nav). Two passwords live on the backend:
// the admin one can leave notes and delete anything, Ava's can read the notes
// and reply to them. Replies sit under the note they answer (one level deep).
// Logging in returns a token that's kept in localStorage for 30 days.

type Role = 'admin' | 'ava';
interface Message {
    id: number;
    body: string;
    created_at: string;
    author: Role;
    parent_id: number | null;
}

// Older backend versions don't send author/parent_id; treat those as admin notes.
const normalize = (m: Partial<Message> & { id: number; body: string; created_at: string }): Message => ({
    ...m,
    author: m.author ?? 'admin',
    parent_id: m.parent_id ?? null,
});

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const TOKEN_KEY = 'secret_token';
const ROLE_KEY = 'secret_role';

function load(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}

const inputClass = 'bg-white dark:bg-[#0D0C0C] rounded-2xl px-4 py-3 text-sm outline-none border border-transparent focus:border-[#86868b] transition-colors';
const buttonClass = 'bg-[#1d1d1f] dark:bg-[#f5f5f7] text-[#f5f5f7] dark:text-[#1d1d1f] rounded-2xl px-6 py-3 text-sm font-semibold disabled:opacity-50 transition-opacity';

export function Secret() {
    const [token, setToken] = useState<string | null>(() => load(TOKEN_KEY));
    const [role, setRole] = useState<Role | null>(() => load(ROLE_KEY) as Role | null);
    const [password, setPassword] = useState('');
    const [messages, setMessages] = useState<Message[] | null>(null);
    const [draft, setDraft] = useState('');
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyDraft, setReplyDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const logout = useCallback(() => {
        try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ROLE_KEY); } catch { /* ignore */ }
        setToken(null);
        setRole(null);
        setMessages(null);
    }, []);

    // Calls the backend with the token; an expired/invalid token logs you out.
    const api = useCallback(async (path: string, init: RequestInit = {}) => {
        const res = await fetch(`${API_BASE}/api/secret${path}`, {
            ...init,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
            logout();
            throw new Error('Please log in again.');
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
        return data;
    }, [token, logout]);

    useEffect(() => {
        if (!token) return;
        api('/messages').then(rows => setMessages(rows.map(normalize))).catch(e => setError(e.message));
    }, [token, api]);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/secret/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Login failed.');
            try { localStorage.setItem(TOKEN_KEY, data.token); localStorage.setItem(ROLE_KEY, data.role); } catch { /* ignore */ }
            setPassword('');
            setToken(data.token);
            setRole(data.role);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed.');
        } finally {
            setBusy(false);
        }
    };

    const handlePost = async (e: FormEvent) => {
        e.preventDefault();
        if (!draft.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const msg = normalize(await api('/messages', { method: 'POST', body: JSON.stringify({ body: draft }) }));
            setMessages(m => [msg, ...(m ?? [])]);
            setDraft('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not post.');
        } finally {
            setBusy(false);
        }
    };

    const handleReply = async (e: FormEvent, parentId: number) => {
        e.preventDefault();
        if (!replyDraft.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const msg = normalize(await api('/messages', {
                method: 'POST',
                body: JSON.stringify({ body: replyDraft, parent_id: parentId }),
            }));
            setMessages(m => [msg, ...(m ?? [])]);
            setReplyDraft('');
            setReplyingTo(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send reply.');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (msg: Message) => {
        if (!confirm(msg.parent_id === null ? 'Delete this note and its replies?' : 'Delete this reply?')) return;
        try {
            await api(`/messages/${msg.id}`, { method: 'DELETE' });
            // Deleting a note also removes its replies on the backend.
            setMessages(m => (m ?? []).filter(x => x.id !== msg.id && x.parent_id !== msg.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not delete.');
        }
    };

    const canDelete = (m: Message) => role === 'admin' || m.author === role;
    const authorName = (m: Message) => (m.author === role ? 'You' : m.author === 'ava' ? 'Ava' : 'Ethan');
    const notes = (messages ?? []).filter(m => m.parent_id === null);
    const repliesTo = (id: number) =>
        (messages ?? []).filter(m => m.parent_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at));

    if (!token) {
        return (
            <div className="max-w-sm mx-auto px-6 py-24">
                <h1 className="text-4xl font-semibold tracking-tight mb-2 text-center">🔒</h1>
                <p className="text-[#86868b] mb-8 text-center">This area is password protected.</p>
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        autoFocus
                        required
                        className={inputClass}
                    />
                    <button type="submit" disabled={busy} className={buttonClass}>
                        {busy ? 'Checking…' : 'Enter'}
                    </button>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto px-6 py-16">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-4xl font-semibold tracking-tight">
                    {role === 'ava' ? 'Hi Ava 💛' : 'Notes for Ava'}
                </h1>
                <button onClick={logout} className="text-sm text-[#86868b] hover:underline">Log out</button>
            </div>
            <p className="text-[#86868b] mb-10">
                {role === 'ava'
                    ? 'Some little notes, just for you. Hit Reply to write back 💌'
                    : 'She sees these when she logs in with her password, and can reply to any of them.'}
            </p>

            {role === 'admin' && (
                <form onSubmit={handlePost} className="flex flex-col gap-3 mb-10">
                    <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        rows={4}
                        maxLength={5000}
                        placeholder="Write something cute…"
                        className={`${inputClass} resize-none`}
                    />
                    <button type="submit" disabled={busy || !draft.trim()} className={buttonClass}>
                        {busy ? 'Saving…' : 'Leave Message'}
                    </button>
                </form>
            )}

            {error && <p className="text-sm text-red-500 text-center mb-6">{error}</p>}

            {messages === null ? (
                <p className="text-[#86868b] text-center">Loading…</p>
            ) : notes.length === 0 ? (
                <p className="text-[#86868b] text-center">No messages yet.</p>
            ) : (
                <ul className="flex flex-col gap-4">
                    {notes.map(m => {
                        const replies = repliesTo(m.id);
                        return (
                            <li key={m.id} className="bg-white dark:bg-[#0D0C0C] rounded-3xl p-6">
                                <p className="whitespace-pre-wrap wrap-break-word">{m.body}</p>
                                <div className="flex items-center justify-between gap-4 mt-4 text-xs text-[#86868b]">
                                    <span>{formatDate(m.created_at)}</span>
                                    <div className="flex gap-4">
                                        {replyingTo !== m.id && (
                                            <button
                                                onClick={() => { setReplyingTo(m.id); setReplyDraft(''); }}
                                                className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] hover:underline"
                                            >
                                                Reply
                                            </button>
                                        )}
                                        {canDelete(m) && (
                                            <button onClick={() => handleDelete(m)} className="hover:text-red-500">Delete</button>
                                        )}
                                    </div>
                                </div>

                                {replies.length > 0 && (
                                    <ul className="flex flex-col gap-2 mt-4">
                                        {replies.map(r => (
                                            <li
                                                key={r.id}
                                                className={`rounded-2xl px-4 py-3 ${
                                                    r.author === 'ava'
                                                        ? 'bg-amber-50 dark:bg-amber-400/10'
                                                        : 'bg-[#f5f5f7] dark:bg-[#1C1A1B]'
                                                }`}
                                            >
                                                <div className="flex items-baseline justify-between gap-3 text-xs text-[#86868b] mb-1">
                                                    <span>
                                                        <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{authorName(r)}</span>
                                                        {' · '}{formatDate(r.created_at)}
                                                    </span>
                                                    {canDelete(r) && (
                                                        <button onClick={() => handleDelete(r)} className="hover:text-red-500">Delete</button>
                                                    )}
                                                </div>
                                                <p className="text-sm whitespace-pre-wrap wrap-break-word">{r.body}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {replyingTo === m.id && (
                                    <form onSubmit={e => handleReply(e, m.id)} className="flex flex-col gap-2 mt-4">
                                        <textarea
                                            value={replyDraft}
                                            onChange={e => setReplyDraft(e.target.value)}
                                            rows={3}
                                            maxLength={5000}
                                            autoFocus
                                            placeholder={role === 'ava' ? 'Write back…' : 'Add to the thread…'}
                                            className={`${inputClass} resize-none bg-[#f5f5f7]! dark:bg-[#1C1A1B]!`}
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setReplyingTo(null)}
                                                className="px-4 py-2 text-sm text-[#86868b] hover:underline"
                                            >
                                                Cancel
                                            </button>
                                            <button type="submit" disabled={busy || !replyDraft.trim()} className={`${buttonClass} py-2!`}>
                                                {busy ? 'Sending…' : 'Send'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
