import OpenAI from "openai";

// Self-hosted, OpenAI-compatible model platform (replaces the Anthropic API — see
// DECISIONS.md for why). Uses the standard `openai` SDK against a custom base URL.
export const aiClient = new OpenAI({
  apiKey: process.env.AI_PLATFORM_API_KEY,
  baseURL: "https://api.gariyuuu.com/v1",
});

// The platform currently exposes exactly one model, "Yuu no Sekai", used for both the
// cheap background extraction/categorization call and the capable conversational reply.
// Kept as two separate constants (rather than collapsing to one) so the two call sites
// stay conceptually distinct in code, in case a second model is added to the platform later.

// Model used for background extraction/categorization, runs on every message.
export const EXTRACTION_MODEL = "Yuu no Sekai";

// Model used for the actual conversational reply.
export const CHAT_MODEL = "Yuu no Sekai";
