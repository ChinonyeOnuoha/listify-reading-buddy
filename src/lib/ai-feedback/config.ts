// Optional AI feedback for adults. Off until the Cloudflare Worker is deployed and its address is set below (or in
// VITE_AI_FEEDBACK_URL for local testing): while both are empty, nothing is ever uploaded and the app says so.
// The address isn't a secret; the API key lives only in the Worker's secrets. Setup: docs/ai-feedback-setup.md.
const WORKER_URL = "";

const fromEnv = (import.meta.env["VITE_AI_FEEDBACK_URL"] as string | undefined) ?? "";

export const AI_FEEDBACK_URL: string = (fromEnv || WORKER_URL).replace(/\/+$/, "");

export const aiFeedbackConfigured = () => AI_FEEDBACK_URL !== "";
