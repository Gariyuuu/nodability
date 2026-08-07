import type OpenAI from "openai";
import { aiClient, EXTRACTION_MODEL } from "./ai-client";
import { EXTRACTION_INSTRUCTIONS } from "./prompts";

export interface ExtractedTask {
  title: string;
  category: string;
  start_date: string | null;
  end_date: string | null;
  due_time: string | null;
}

export interface TaskToDelete {
  title: string;
  category: string | null;
}

export interface ExtractionResult {
  tasks: ExtractedTask[];
  delete_categories: string[];
  delete_tasks: TaskToDelete[];
}

const EXTRACT_TOOL_NAME = "extract_tasks";

// OpenAI-style tool definition (translated from the platform's former Anthropic-style
// `input_schema` tool — the schemas differ: OpenAI wraps the JSON schema under
// `function.parameters` instead of a top-level `input_schema`).
const EXTRACT_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: EXTRACT_TOOL_NAME,
    description:
      "Record any new tasks extracted from the message, and any deletions the user asked for.",
    parameters: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              category: {
                type: "string",
                description: "Best matching existing category, or a new one if nothing fits.",
              },
              start_date: {
                type: ["string", "null"],
                description:
                  "ISO-8601 date (YYYY-MM-DD) the task starts or is due, if mentioned or implied, else null.",
              },
              end_date: {
                type: ["string", "null"],
                description:
                  "ISO-8601 date (YYYY-MM-DD) the task/event ends, only if it spans multiple days (e.g. a trip). Equal to start_date is NOT used here — leave null for single-day items.",
              },
              due_time: {
                type: ["string", "null"],
                description:
                  "24-hour time (HH:MM) if a specific time of day was mentioned (e.g. '5pm' -> '17:00'), else null.",
              },
            },
            required: ["title", "category", "start_date", "end_date", "due_time"],
          },
        },
        delete_categories: {
          type: "array",
          items: { type: "string" },
          description:
            "Names of whole categories the user explicitly asked to delete/remove (this also removes every task in them).",
        },
        delete_tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Title or partial title of the task the user asked to delete.",
              },
              category: {
                type: ["string", "null"],
                description: "Category to narrow the match, if the user mentioned one, else null.",
              },
            },
            required: ["title", "category"],
          },
          description: "Specific tasks the user explicitly asked to delete/remove.",
        },
      },
      required: ["tasks", "delete_categories", "delete_tasks"],
    },
  },
};

export async function extractTasks(
  userMessage: string,
  knownCategories: string[],
  recentMessages: { role: "user" | "assistant"; content: string }[] = [],
): Promise<ExtractionResult> {
  const today = new Date().toISOString().slice(0, 10);

  const recentTranscript = recentMessages
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const response = await aiClient.chat.completions.create({
    model: EXTRACTION_MODEL,
    max_tokens: 512,
    // Qwen3's default "thinking mode" burns ~10x more output tokens on tool-use calls
    // if left enabled — `reasoning` is a platform-specific extension not in the openai
    // npm package's TS types, so the whole params object is cast below.
    reasoning: { enabled: false },
    messages: [
      { role: "system", content: EXTRACTION_INSTRUCTIONS },
      {
        role: "user",
        content: `Today's date: ${today}\nKnown categories so far: ${
          knownCategories.join(", ") || "(none yet)"
        }\n\nRecent conversation (for resolving references like "it"/"that"/"the one I just deleted" in the user message below — do NOT extract tasks or deletions from this history itself, only use it to understand what the user means):\n${
          recentTranscript || "(none yet)"
        }\n\nUser message: ${userMessage}`,
      },
    ],
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "function", function: { name: EXTRACT_TOOL_NAME } },
    // `reasoning` above is a platform-specific extension the openai npm package's types don't declare
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);

  const toolCall = response.choices[0]?.message?.tool_calls?.find(
    (call) => call.type === "function" && call.function.name === EXTRACT_TOOL_NAME,
  );
  if (!toolCall || toolCall.type !== "function") {
    throw new Error("Model did not return the expected extract_tasks tool call");
  }

  return JSON.parse(toolCall.function.arguments) as ExtractionResult;
}
