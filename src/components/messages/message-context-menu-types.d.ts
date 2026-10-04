import type { ReactElement } from "react";
import type { LucideIcon } from "lucide-react";
import type { BulkMessageAction } from "@/app/api/messages/bulk/types";
import type { Message } from "@/hooks/types";
import type { MessageFolderConfig } from "./types";

/** A custom folder chosen as a move target; the name is for the "Moved to …" snackbar. */
export type MoveFolderTarget = {
	id: string;
	name: string;
};

export type MessageRowMenuAction = (action: BulkMessageAction, folder?: MoveFolderTarget) => Promise<void>;

export type MessageRowContextMenuProps = {
	/** The row element; it receives data-state="open" while its menu is open. */
	children: ReactElement;
	/** The row as displayed, including its optimistic read and starred state. */
	message: Message;
	config: MessageFolderConfig;
	href: string;
	selected: boolean;
	/** How many rows are selected on the page; a selected row's menu acts on all of them when there are several. */
	selectionCount: number;
	hasUnreadSelection: boolean;
	onOpen: () => void;
	onAction: MessageRowMenuAction;
	onSelectionAction: MessageRowMenuAction;
	onToggleStar: () => void;
	onSelectedChange: (selected: boolean) => void;
	onClearSelection: () => void;
};

export type MessageRowMenuContentProps = Omit<MessageRowContextMenuProps, "children"> & {
	onSnoozeCustom: () => void;
	onBlockSender: () => void;
};

export type MoveDestination = {
	action: BulkMessageAction;
	label: string;
	icon: LucideIcon;
};

export type BlockSenderDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	address: string;
	onConfirm: () => Promise<void>;
};
