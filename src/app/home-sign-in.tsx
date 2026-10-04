"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { submitLogin, submitMfaCode } from "@/app/(auth)/login/utils";
import { TurnstileField } from "@/components/auth/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHomeAuth } from "./home-auth";
import type { HomeSignInProps } from "./types";

// Pillcrow fork: the sign-in form on the home page. Same requests as /login (including the
// second-factor step), so the two cannot behave differently.

const PRIMARY = "h-11 w-full rounded-full px-6 transition-transform active:scale-[0.98]";

export function HomeSignIn({ appName, needsSetup, signedIn }: HomeSignInProps) {
	const router = useRouter();
	// A session kept only in this browser's storage is found after the page loads.
	const clientUser = useHomeAuth();
	const user = signedIn ?? (clientUser ? { name: clientUser.name, email: clientUser.email } : null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [opening, setOpening] = useState(false);
	const [turnstileReset, setTurnstileReset] = useState(0);
	const [challengeToken, setChallengeToken] = useState<string | null>(null);
	const [code, setCode] = useState("");

	function finish(redirect?: string) {
		setOpening(true);
		router.replace(redirect ?? "/inbox");
		router.refresh();
	}

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const { ok, data } = await submitLogin(new FormData(event.currentTarget));
			if (!ok) {
				setError(data.error ?? "That email and password don't match.");
				setTurnstileReset((value) => value + 1);
				return;
			}
			if (data.mfaRequired && data.challengeToken) {
				setChallengeToken(data.challengeToken);
				return;
			}
			finish(data.redirect);
		} catch (submitError) {
			setError(
				submitError instanceof DOMException && submitError.name === "TimeoutError"
					? "Signing in took too long. Please try again."
					: "Couldn't reach the server. Please try again.",
			);
			setTurnstileReset((value) => value + 1);
		} finally {
			setLoading(false);
		}
	}

	async function onSubmitCode(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!challengeToken) return;
		setLoading(true);
		setError(null);
		try {
			const { ok, data } = await submitMfaCode(challengeToken, code);
			if (!ok) {
				setError(data.error ?? "That code didn't match.");
				// An expired challenge goes back to the password step.
				if (data.error?.includes("expired")) {
					setChallengeToken(null);
					setCode("");
				}
				return;
			}
			finish(data.redirect);
		} catch {
			setError("Couldn't reach the server. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	if (needsSetup) {
		return (
			<HomeCard>
				<p className="text-center text-sm leading-6 text-neutral-600">{appName} has no administrator yet. Create the first account to start using it.</p>
				<Button asChild className={`${PRIMARY} mt-5`}>
					<Link href="/setup">
						Set up {appName}
						<ArrowRight className="h-4 w-4" />
					</Link>
				</Button>
			</HomeCard>
		);
	}

	if (user) {
		return (
			<HomeCard>
				<div className="flex items-center gap-3">
					<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-900">
						{(user.name || user.email).trim().charAt(0).toUpperCase()}
					</span>
					<div className="min-w-0">
						<p className="truncate text-sm font-medium text-neutral-900">{user.name || user.email}</p>
						{user.name && <p className="truncate text-sm text-neutral-500">{user.email}</p>}
					</div>
				</div>
				<Button className={`${PRIMARY} mt-5`} disabled={opening} onClick={() => finish()}>
					{opening ? "Opening…" : "Open your inbox"}
					{!opening && <ArrowRight className="h-4 w-4" />}
				</Button>
				<Link href="/login?add=1" className="mt-3 block text-center text-sm text-neutral-500 hover:text-neutral-800">
					Sign in with another account
				</Link>
			</HomeCard>
		);
	}

	if (challengeToken) {
		return (
			<HomeCard>
				<form onSubmit={onSubmitCode} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="home-code">Code from your authenticator app</Label>
						<Input
							id="home-code"
							name="code"
							value={code}
							onChange={(event) => setCode(event.target.value)}
							inputMode="numeric"
							autoComplete="one-time-code"
							autoFocus
							placeholder="123 456"
							className="h-11 rounded-xl"
							required
						/>
						<p className="text-xs text-neutral-500">A recovery code works here too.</p>
					</div>
					{error && <HomeError>{error}</HomeError>}
					<Button type="submit" className={PRIMARY} disabled={loading || opening}>
						{opening ? "Opening…" : loading ? "Checking…" : "Verify"}
					</Button>
					<button
						type="button"
						className="w-full text-center text-sm text-neutral-500 hover:text-neutral-800"
						onClick={() => {
							setChallengeToken(null);
							setCode("");
							setError(null);
						}}
					>
						Back
					</button>
				</form>
			</HomeCard>
		);
	}

	return (
		<HomeCard>
			<form method="post" onSubmit={onSubmit} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="home-email">Email</Label>
					<Input id="home-email" name="email" type="email" autoComplete="email" className="h-11 rounded-xl" required />
				</div>
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="home-password">Password</Label>
						<Link href="/forgot-password" className="text-xs font-medium text-blue-700 hover:underline">
							Forgot password?
						</Link>
					</div>
					<Input id="home-password" name="password" type="password" autoComplete="current-password" className="h-11 rounded-xl" required />
				</div>
				{error && <HomeError>{error}</HomeError>}
				<TurnstileField resetSignal={turnstileReset} />
				<Button type="submit" className={`${PRIMARY} mt-2`} disabled={loading || opening}>
					{opening ? "Opening your inbox…" : loading ? "Signing in…" : "Sign in"}
					{!loading && !opening && <ArrowRight className="h-4 w-4" />}
				</Button>
			</form>
		</HomeCard>
	);
}

function HomeCard({ children }: { children: ReactNode }) {
	return (
		<div className="pc-home-card relative rounded-[1.75rem] bg-white/75 p-6 shadow-xl shadow-neutral-900/5 ring-1 ring-neutral-200/70 backdrop-blur-xl sm:p-7">
			{children}
		</div>
	);
}

function HomeError({ children }: { children: ReactNode }) {
	return (
		<p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
			{children}
		</p>
	);
}
