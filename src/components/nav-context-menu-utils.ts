import { authFetch } from "@/lib/auth/client";
import type { FolderColor } from "@/lib/folders/types";
import type { CustomFolder } from "./dashboard-nav-types";

async function readError(response: Response, fallback: string) {
	const data = (await response.json().catch(() => ({}))) as { error?: unknown };
	return typeof data.error === "string" ? data.error : fallback;
}

/** Tells every folder list (sidebar, Move to menus, the folder page title) to reload. */
export function announceFoldersChanged() {
	window.dispatchEvent(new Event("mailflare:folders-changed"));
}

export async function markAllAsRead(mailboxId: string, folderId?: string): Promise<number> {
	const response = await authFetch("/api/messages/read-all", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ mailboxId, folderId }),
	});
	if (!response.ok) throw new Error(await readError(response, "Couldn't mark these emails as read"));
	const data = (await response.json()) as { count?: number };
	// The list and the unread counts both reload on this one event.
	window.dispatchEvent(new Event("mailflare:messages-changed"));
	return data.count ?? 0;
}

export async function updateFolder(folderId: string, patch: { name?: string; color?: FolderColor }): Promise<CustomFolder> {
	const response = await authFetch(`/api/folders/${encodeURIComponent(folderId)}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(patch),
	});
	if (!response.ok) throw new Error(await readError(response, "Couldn't update the folder"));
	const folder = (await response.json()) as CustomFolder;
	announceFoldersChanged();
	return folder;
}

export async function deleteFolder(folderId: string) {
	const response = await authFetch(`/api/folders/${encodeURIComponent(folderId)}`, { method: "DELETE" });
	if (!response.ok) throw new Error(await readError(response, "Couldn't delete the folder"));
	announceFoldersChanged();
	// The list and the unread counts both reload on this one event.
	window.dispatchEvent(new Event("mailflare:messages-changed"));
}

export function describeMarkedRead(count: number) {
	if (count === 0) return "Nothing left to mark as read";
	return count === 1 ? "Marked 1 email as read" : `Marked ${count} emails as read`;
}
