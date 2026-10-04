import type { ReactElement } from "react";

export type AddressContextMenuProps = {
	/** The element showing the address; it becomes the menu's trigger. */
	children: ReactElement;
	mailboxId: string;
	address: string;
	name?: string | null;
	onEditContact: () => void;
};
