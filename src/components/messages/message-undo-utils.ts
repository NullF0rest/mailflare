import type { BulkMessageAction } from "@/app/api/messages/bulk/types";
import type { Message } from "@/hooks/types";
import { showToast } from "@/components/ui/toaster-utils";
import type { MessageMoveAnnouncement, MessageMoveTarget } from "./message-undo-types";
import { runBulkMessageAction } from "./utils";

// Pillcrow fork: every move from the list says what happened and offers Undo, the way
// Gmail's "Conversation archived. Undo" does. Undo is a plain move back, so it is only
// offered when every moved row came from the same place and that place is a status the
// bulk API can restore. Spam is left out both ways: reporting or clearing spam trains the
// filter, and an undo would train it a second time.

const MOVE_ACTIONS = new Set<BulkMessageAction>(["archive", "trash", "spam", "inbox", "folder"]);

export function isMoveAction(action: BulkMessageAction) {
	return MOVE_ACTIONS.has(action);
}

/** Where the rows came from, as the move that would put them back; null when that is not one place. */
export function getUndoTarget(rows: Array<Pick<Message, "status" | "folderId">>, action: BulkMessageAction): MessageMoveTarget | null {
	if (rows.length === 0 || action === "spam") return null;
	const [first] = rows;
	if (rows.some((row) => row.status !== first.status || (row.folderId ?? null) !== (first.folderId ?? null))) return null;
	if (first.status === "received") return first.folderId ? { action: "folder", folderId: first.folderId } : { action: "inbox" };
	if (first.status === "archived") return { action: "archive" };
	if (first.status === "trash") return { action: "trash" };
	return null;
}

export function describeMessageMove(action: BulkMessageAction, count: number, grouped: boolean, folderName?: string) {
	const noun = grouped ? (count === 1 ? "Conversation" : "conversations") : count === 1 ? "Message" : "messages";
	const subject = count === 1 ? noun : `${count} ${noun}`;
	if (action === "archive") return `${subject} archived`;
	if (action === "trash") return `${subject} moved to Trash`;
	if (action === "spam") return `${subject} reported as spam`;
	if (action === "inbox") return `${subject} moved to Inbox`;
	if (action === "folder") return `${subject} moved to ${folderName ?? "folder"}`;
	return `${subject} updated`;
}

/** Shows the snackbar for a move that already happened, with Undo when the move can be reversed. */
export function announceMessageMove({ messageIds, rows, action, folderName, grouped }: MessageMoveAnnouncement) {
	if (!isMoveAction(action) || messageIds.length === 0) return;
	const undo = getUndoTarget(rows, action);
	showToast({
		message: describeMessageMove(action, rows.length || messageIds.length, grouped, folderName),
		action: undo
			? {
				label: "Undo",
				onAction: async () => {
					await runBulkMessageAction(messageIds, undo.action, true, undo.folderId);
					showToast({ message: "Action undone", duration: 3000 });
				},
			}
			: undefined,
	});
}
