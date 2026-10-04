import { z } from "zod";
import { FOLDER_COLOR_VALUES } from "@/lib/folders/colors";

/** A rename, a new colour, or both. */
export const folderUpdateSchema = z
	.object({
		name: z.string().trim().min(1).max(80).optional(),
		color: z.enum(FOLDER_COLOR_VALUES).optional(),
	})
	.refine((value) => value.name !== undefined || value.color !== undefined, { message: "Nothing to update" });
