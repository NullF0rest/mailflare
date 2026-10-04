export type ToastAction = {
	label: string;
	/** Runs once; the toast closes as soon as it is pressed. */
	onAction: () => void | Promise<void>;
};

export type ToastInput = {
	message: string;
	action?: ToastAction;
	tone?: "default" | "error";
	/** Milliseconds before it closes on its own; hovering pauses it. */
	duration?: number;
};

export type ToastItem = ToastInput & { id: number };
