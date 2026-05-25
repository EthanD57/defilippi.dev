import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
    const url = new URL(request.url);
    url.hostname = "portfolio-production-5952.up.railway.app";
    url.port = "";
    url.protocol = "https:";

    const newRequest = new Request(url.toString(), {
        method: request.method,
        headers: {
            ...Object.fromEntries(request.headers),
            "X-Api-Key": Netlify.env.get("API_SIGNATURE_TOKEN") ?? "",
        },
        body: request.body ?? undefined,
    });

    return fetch(newRequest);
};