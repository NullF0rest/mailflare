import type { ReactNode } from "react";
import type { CustomFolder } from "./dashboard-nav-types";

export type NavContextMenuProps = {
	children: ReactNode;
	href: string;
	label: string;
	mailboxId: string | undefined;
	/** Unread count shown beside the link; "Mark all as read" is offered when it is above zero. */
	unread?: number;
	/** A custom folder can also be renamed, recoloured and deleted. */
	folder?: CustomFolder;
	onFolderChange?: (folder: CustomFolder) => void;
	onFolderDelete?: (folderId: string) => void;
};

export type RenameFolderDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	folder: CustomFolder;
	onRenamed: (folder: CustomFolder) => void;
};

export type DeleteFolderDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	folder: CustomFolder;
	onDeleted: () => void;
};
