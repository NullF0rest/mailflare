"use client";

import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContextMenuItemProps, ContextMenuSubTriggerProps } from "./context-menu-types";

// Pillcrow fork: the right-click menu shared by the message list, the sidebar and the reader.
// Styled like the app's dropdown menus so both read as one family, in light and dark.

const surfaceClass = "z-[160] min-w-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 text-neutral-800 shadow-xl outline-none pc-menu";
const itemClass = "group/item relative flex min-h-8 cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-neutral-100";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuGroup = ContextMenuPrimitive.Group;

export function ContextMenuContent({ className, ...props }: ContextMenuPrimitive.ContextMenuContentProps) {
	return (
		<ContextMenuPrimitive.Portal>
			<ContextMenuPrimitive.Content
				collisionPadding={8}
				className={cn(surfaceClass, "max-h-[var(--radix-context-menu-content-available-height)]", className)}
				{...props}
			/>
		</ContextMenuPrimitive.Portal>
	);
}

export function ContextMenuItem({ icon: Icon, shortcut, destructive, className, children, ...props }: ContextMenuItemProps) {
	return (
		<ContextMenuPrimitive.Item
			className={cn(itemClass, destructive && "text-red-600 data-[highlighted]:bg-red-50", className)}
			{...props}
		>
			{Icon && <Icon className={cn("h-4 w-4 shrink-0", destructive ? "text-red-500" : "text-neutral-500 group-data-[highlighted]/item:text-neutral-700")} />}
			<span className="min-w-0 flex-1 truncate">{children}</span>
			{shortcut && <ContextMenuShortcut keys={shortcut} />}
		</ContextMenuPrimitive.Item>
	);
}

export function ContextMenuCheckboxItem({ className, children, ...props }: ContextMenuPrimitive.ContextMenuCheckboxItemProps) {
	return (
		<ContextMenuPrimitive.CheckboxItem className={cn(itemClass, className)} {...props}>
			<span className="flex h-4 w-4 shrink-0 items-center justify-center">
				<ContextMenuPrimitive.ItemIndicator>
					<Check className="h-4 w-4 text-neutral-700" />
				</ContextMenuPrimitive.ItemIndicator>
			</span>
			<span className="min-w-0 flex-1 truncate">{children}</span>
		</ContextMenuPrimitive.CheckboxItem>
	);
}

export function ContextMenuSubTrigger({ icon: Icon, className, children, ...props }: ContextMenuSubTriggerProps) {
	return (
		<ContextMenuPrimitive.SubTrigger
			className={cn(itemClass, "data-[state=open]:bg-neutral-100", className)}
			{...props}
		>
			{Icon && <Icon className="h-4 w-4 shrink-0 text-neutral-500" />}
			<span className="min-w-0 flex-1 truncate">{children}</span>
			<ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
		</ContextMenuPrimitive.SubTrigger>
	);
}

export function ContextMenuSubContent({ className, ...props }: ContextMenuPrimitive.ContextMenuSubContentProps) {
	return (
		<ContextMenuPrimitive.Portal>
			<ContextMenuPrimitive.SubContent
				collisionPadding={8}
				className={cn(surfaceClass, "max-h-[var(--radix-context-menu-content-available-height)]", className)}
				{...props}
			/>
		</ContextMenuPrimitive.Portal>
	);
}

export function ContextMenuSeparator({ className, ...props }: ContextMenuPrimitive.ContextMenuSeparatorProps) {
	return <ContextMenuPrimitive.Separator className={cn("-mx-1.5 my-1.5 h-px bg-neutral-100", className)} {...props} />;
}

export function ContextMenuLabel({ className, ...props }: ContextMenuPrimitive.ContextMenuLabelProps) {
	return <ContextMenuPrimitive.Label className={cn("truncate px-2.5 pb-1 pt-1.5 text-xs font-medium text-neutral-500", className)} {...props} />;
}

export function ContextMenuShortcut({ keys }: { keys: string }) {
	return (
		<span className="ml-4 flex shrink-0 items-center gap-1">
			{keys.split(" ").map((key, index) => (
				<kbd
					key={`${key}-${index}`}
					className="min-w-5 rounded-md border border-neutral-200 bg-neutral-50 px-1 text-center font-sans text-[11px] leading-[18px] text-neutral-500"
				>
					{key}
				</kbd>
			))}
		</span>
	);
}
