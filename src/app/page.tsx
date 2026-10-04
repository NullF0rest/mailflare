import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import { hasAdminAccount } from "@/lib/auth/setup";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth/session";
import { PILLCROW_URL, SOURCE_URL } from "@/lib/branding/defaults";
import { getEnv } from "@/lib/cloudflare";
import { getHomeBranding } from "./home-server-utils";
import { HomeAuthProvider } from "./home-auth";
import { HomeSignIn } from "./home-sign-in";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const branding = await getHomeBranding();
	return {
		title: branding.appName,
		icons: { icon: "/api/branding/icon" },
	};
}

// Pillcrow fork: the home page is the client's front door, not a product pitch. A lit mark, the
// install's name and the sign-in form, over a slow light that takes the brand accent.
export default async function HomePage() {
	const branding = await getHomeBranding();
	const env = getEnv();
	const [needsSetup, signedIn] = await Promise.all([
		hasAdminAccount(env).then((hasAdmin) => !hasAdmin).catch(() => false),
		cookies()
			.then((store) => getUserFromSession(env, store.get(SESSION_COOKIE)?.value))
			.then((user) => (user && !user.disabled ? { name: user.name, email: user.email } : null))
			.catch(() => null),
	]);

	return (
		<HomeAuthProvider>
			<div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background text-neutral-900">
				<div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
					<div className="pc-home-grid absolute inset-0" />
					<div className="pc-home-orb pc-home-orb-a" />
					<div className="pc-home-orb pc-home-orb-b" />
					<div className="pc-home-orb pc-home-orb-c" />
				</div>

				<main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
					<div className="w-full max-w-sm">
						<div className="pc-home-rise flex flex-col items-center text-center">
							<span className="pc-home-mark relative flex h-16 w-16 items-center justify-center">
								<img src="/api/branding/icon" alt="" width={64} height={64} className="h-16 w-16 object-contain drop-shadow-lg" />
							</span>
							<h1 className="mt-7 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">{branding.appName}</h1>
						</div>
						<div className="pc-home-rise mt-8" style={{ "--pc-home-delay": "140ms" } as CSSProperties}>
							<HomeSignIn appName={branding.appName} needsSetup={needsSetup} signedIn={signedIn} />
						</div>
					</div>
				</main>

				<footer className="pc-home-rise px-4 pb-6 text-center text-[11px] text-neutral-400" style={{ "--pc-home-delay": "280ms" } as CSSProperties}>
					Powered by{" "}
					<a href={PILLCROW_URL} target="_blank" rel="noreferrer" className="text-neutral-500 hover:underline">Pillcrow</a>
					{" · "}built on Mailflare{" · "}
					<a href={SOURCE_URL} target="_blank" rel="noreferrer" className="text-neutral-500 hover:underline">Source</a>
				</footer>
			</div>
		</HomeAuthProvider>
	);
}
