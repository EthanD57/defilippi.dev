import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit({
            // SPA mode: every route falls back to 200.html (see netlify.toml)
            adapter: adapter({ pages: 'dist', fallback: '200.html' }),
        }),
    ],
    optimizeDeps: {
        exclude: ['onnxruntime-web'],
    },
});
