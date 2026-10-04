import type { BulkMessageAction } from "@/app/api/messages/bulk/types";
import type { Message } from "@/hooks/types";

export type MessageMoveTarget = {
	action: BulkMessageAction;
	folderId?: string;
};

export type MessageMoveAnnouncement = {
	/** Every message that moved (a conversation row expands to its messages). */
	messageIds: string[];
	/** The list rows as they were before the move: where they came from, and how many to name. */
	rows: Array<Pick<Message, "status" | "folderId">>;
	action: BulkMessageAction;
	folderName?: string;
	grouped: boolean;
};
