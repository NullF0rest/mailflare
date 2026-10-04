// Pillcrow fork: the brand an install shows until an admin sets its own under Admin → Branding.
export const DEFAULT_APP_NAME = "Pillcrow Mail";
export const DEFAULT_APP_DESCRIPTION = "Email by Pillcrow";

// Upstream's column default for app_settings.app_name. A settings row created for any other
// reason (a Resend key, the AI agent) carries it, so it is read as "not customized".
export const UPSTREAM_APP_NAME = "Mailflare";

// AGPL-3.0 §13: people using a modified copy over the network are offered its source.
export const SOURCE_URL = "https://github.com/NullF0rest/mailflare";
export const UPSTREAM_URL = "https://github.com/hieunc229/mailflare";
export const PILLCROW_URL = "https://pillcrow.com";

// Salon's lavender: deepened on light grounds so it carries text, bright on dark ones.
export const DEFAULT_ACCENT = "#5640aa";
export const DEFAULT_ACCENT_DARK = "#a899e3";
