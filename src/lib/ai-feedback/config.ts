// Optional AI feedback for adults, through the Cloudflare Worker below (VITE_AI_FEEDBACK_URL overrides it for local
// testing). With both empty, AI feedback is off: nothing is ever uploaded and the app says so.
// The address isn't a secret; the API key lives only in the Worker's secrets. Setup: docs/ai-feedback-setup.md.
const WORKER_URL = "https://reading-buddy-ai-feedback.marianonye.workers.dev";

const fromEnv = (import.meta.env["VITE_AI_FEEDBACK_URL"] as string | undefined) ?? "";

export const AI_FEEDBACK_URL: string = (fromEnv || WORKER_URL).replace(/\/+$/, "");

export const aiFeedbackConfigured = () => AI_FEEDBACK_URL !== "";
