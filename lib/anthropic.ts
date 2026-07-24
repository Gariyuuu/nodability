import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cheap model for background extraction/categorization, runs on every message.
export const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// Capable model for the actual conversational reply.
export const SONNET_MODEL = "claude-sonnet-5";
