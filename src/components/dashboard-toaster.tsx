"use client";

import { useShortcuts } from "@/components/shortcuts";
import { Toaster } from "@/components/ui/toaster";

/** Pillcrow fork: the snackbar for the mail views; Z undoes only while keyboard shortcuts are on. */
export function DashboardToaster() {
	const { shortcutsEnabled } = useShortcuts();
	return <Toaster shortcutsEnabled={shortcutsEnabled} />;
}
