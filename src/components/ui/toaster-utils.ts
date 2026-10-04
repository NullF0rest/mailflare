import type { ToastInput, ToastItem } from "./toaster-types";

// Pillcrow fork: one snackbar at a time, like a mail client's "Conversation archived. Undo".
// A new toast replaces the current one, so a burst of actions never stacks up.

let current: ToastItem | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

export function showToast(input: ToastInput): number {
	current = { ...input, id: nextId++ };
	emit();
	return current.id;
}

export function showErrorToast(message: string) {
	return showToast({ message, tone: "error" });
}

export function dismissToast(id?: number) {
	if (!current || (id !== undefined && current.id !== id)) return;
	current = null;
	emit();
}

export function subscribeToasts(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getCurrentToast() {
	return current;
}

export function getServerToast() {
	return null;
}
