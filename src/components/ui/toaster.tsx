"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { isTypingInInput } from "@/components/shortcuts/use-hotkeys";
import { cn } from "@/lib/utils";
import { dismissToast, getCurrentToast, getServerToast, showErrorToast, subscribeToasts } from "./toaster-utils";
import type { ToastItem } from "./toaster-types";

const DEFAULT_DURATION = 6000;

/**
 * The snackbar at the bottom left. Mount once inside the dashboard's ShortcutsProvider;
 * call showToast from anywhere. With shortcuts on, Z presses the toast's action (Undo).
 */
export function Toaster({ shortcutsEnabled = true }: { shortcutsEnabled?: boolean }) {
	const toast = useSyncExternalStore(subscribeToasts, getCurrentToast, getServerToast);
	if (!toast) return null;
	return <ToastView key={toast.id} toast={toast} shortcutsEnabled={shortcutsEnabled} />;
}

function ToastView({ toast, shortcutsEnabled }: { toast: ToastItem; shortcutsEnabled: boolean }) {
	const [paused, setPaused] = useState(false);
	const ranAction = useRef(false);

	useEffect(() => {
		if (paused) return;
		const timer = window.setTimeout(() => dismissToast(toast.id), toast.duration ?? DEFAULT_DURATION);
		return () => window.clearTimeout(timer);
	}, [paused, toast.id, toast.duration]);

	const runAction = useCallback(() => {
		const action = toast.action;
		if (!action || ranAction.current) return;
		ranAction.current = true;
		dismissToast(toast.id);
		void Promise.resolve()
			.then(() => action.onAction())
			.catch(() => showErrorToast(`Couldn't ${action.label.toLowerCase()}`));
	}, [toast]);

	useEffect(() => {
		if (!toast.action || !shortcutsEnabled) return;
		let previousKey = "";
		let previousAt = 0;
		function onKeyDown(event: KeyboardEvent) {
			const key = event.key.toLowerCase();
			const afterG = previousKey === "g" && Date.now() - previousAt < 800;
			previousKey = key;
			previousAt = Date.now();
			// "g z" is the go-to-Snoozed sequence, not an undo.
			if (key !== "z" || afterG || event.metaKey || event.ctrlKey || event.altKey) return;
			if (isTypingInInput(event.target)) return;
			event.preventDefault();
			runAction();
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [toast.action, shortcutsEnabled, runAction]);

	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-0 z-[150] flex justify-center p-4 md:justify-start md:p-6">
			<div
				role={toast.tone === "error" ? "alert" : "status"}
				aria-live={toast.tone === "error" ? "assertive" : "polite"}
				onMouseEnter={() => setPaused(true)}
				onMouseLeave={() => setPaused(false)}
				onFocus={() => setPaused(true)}
				onBlur={() => setPaused(false)}
				className={cn(
					"pc-toast pointer-events-auto flex min-h-12 w-full max-w-md items-center gap-3 rounded-xl py-2 pl-4 pr-2 text-sm shadow-xl",
					toast.tone === "error" ? "bg-red-700 text-white" : "bg-neutral-900 text-neutral-50",
				)}
			>
				<span className="min-w-0 flex-1 truncate">{toast.message}</span>
				{toast.action && (
					<button
						type="button"
						onClick={runAction}
						className={cn(
							"flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 font-semibold outline-none focus-visible:ring-2",
							toast.tone === "error" ? "text-white hover:bg-white/10" : "text-blue-300 hover:bg-neutral-50/10 focus-visible:ring-blue-300",
						)}
					>
						{toast.action.label}
						{shortcutsEnabled && (
							<kbd className="hidden rounded border border-current/30 px-1 font-sans text-[11px] font-medium leading-4 opacity-70 md:inline">Z</kbd>
						)}
					</button>
				)}
				<button
					type="button"
					onClick={() => dismissToast(toast.id)}
					aria-label="Dismiss"
					className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg opacity-70 outline-none hover:bg-neutral-50/10 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
