import { brandThemeCss, readBrandEnv } from "@/lib/branding/env";
import { getEnvAsync } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Pillcrow fork: the brand colours, read from the BRAND_* env vars on every request so a
// changed Worker variable shows after a reload, with a short browser cache.
export async function GET() {
	const env = await getEnvAsync();
	return new Response(brandThemeCss(readBrandEnv(env)), {
		headers: {
			"Content-Type": "text/css; charset=utf-8",
			"Cache-Control": "public, max-age=300",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
