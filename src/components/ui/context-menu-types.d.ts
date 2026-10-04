import type * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import type { LucideIcon } from "lucide-react";

export type ContextMenuItemProps = ContextMenuPrimitive.ContextMenuItemProps & {
	icon?: LucideIcon;
	/** Keys shown at the right edge, space separated ("g i"). */
	shortcut?: string;
	destructive?: boolean;
};

export type ContextMenuSubTriggerProps = ContextMenuPrimitive.ContextMenuSubTriggerProps & {
	icon?: LucideIcon;
};
