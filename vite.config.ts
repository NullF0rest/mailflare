import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";

export default defineConfig({
	server: { allowedHosts: ["mailflare.local", "mail.dev"] },
	plugins: [
		vinext({ images: { optimizer: imagesOptimizer() } }),
		cloudflare({
			// Pillcrow fork: WRANGLER_CONFIG=clients/<slug>.wrangler.jsonc builds one client's install.
			configPath: process.env.WRANGLER_CONFIG || "./wrangler.jsonc",
			remoteBindings: process.env.CLOUDFLARE_REMOTE_BINDINGS === "true",
			viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
		}),
	],
});
