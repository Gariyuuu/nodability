import { anthropic, SONNET_MODEL } from "@/lib/anthropic";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { extractTasks } from "@/lib/categorize";
import { NODABILITY_SYSTEM_PROMPT } from "@/lib/prompts";
import {
  deleteCategoryByName,
  deleteTaskByTitle,
  getOrCreateCategory,
  insertTask,
  listCategories,
  listTasks,
} from "@/lib/tasks";
import { insertMessage, listRecentMessages } from "@/lib/messages";

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response("unauthorized", { status: 401 });
    }
    throw err;
  }

  let message: unknown;
  try {
    ({ message } = await req.json());
  } catch {
    return new Response("invalid JSON body", { status: 400 });
  }
  if (!message || typeof message !== "string") {
    return new Response("message is required", { status: 400 });
  }

  // Everything from here on can fail (Haiku extraction, Supabase writes, building the
  // Sonnet stream) — catch it so a failure returns a clean error response instead of an
  // unhandled 500 that the chat UI would otherwise try to stream as if it were a reply.
  try {
    const [categories, recentMessages] = await Promise.all([
      listCategories(userId),
      listRecentMessages(userId, 20),
    ]);

    const conversationHistory = recentMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const extraction = await extractTasks(
      message,
      categories.map((c) => c.name),
      conversationHistory,
    );

    const actionLines: string[] = [];

    for (const task of extraction.tasks) {
      const category = await getOrCreateCategory(userId, task.category);
      await insertTask(userId, {
        title: task.title,
        categoryId: category.id,
        startDate: task.start_date,
        endDate: task.end_date,
        dueTime: task.due_time,
      });
      let when = "";
      if (task.start_date && task.end_date && task.end_date !== task.start_date) {
        when = ` (${task.start_date} to ${task.end_date})`;
      } else if (task.start_date) {
        when = ` (due ${task.start_date}${task.due_time ? ` ${task.due_time}` : ""})`;
      }
      actionLines.push(`Added task "${task.title}" to ${category.name}${when}.`);
    }

    for (const categoryName of extraction.delete_categories) {
      const result = await deleteCategoryByName(userId, categoryName);
      actionLines.push(
        result.found
          ? `Deleted category "${result.categoryName}" and its ${result.deletedTaskCount} task(s).`
          : `Could not find a category matching "${categoryName}" to delete.`,
      );
    }

    for (const taskToDelete of extraction.delete_tasks) {
      const result = await deleteTaskByTitle(userId, taskToDelete.title, taskToDelete.category);
      actionLines.push(
        result.found
          ? `Deleted task(s): ${result.deletedTitles.join(", ")}.`
          : `Could not find a task matching "${taskToDelete.title}"${
              taskToDelete.category ? ` in ${taskToDelete.category}` : ""
            } to delete.`,
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const openTasks = (await listTasks(userId)).filter((t) => t.status === "open");
    const contextBlock =
      openTasks.length === 0
        ? "No open tasks currently stored."
        : openTasks
            .map((t) => {
              let when = "";
              if (t.start_date && t.end_date && t.end_date !== t.start_date) {
                when = ` (${t.start_date} to ${t.end_date})`;
              } else if (t.start_date) {
                when = ` (due ${t.start_date}${t.due_time ? ` ${t.due_time}` : ""})`;
              }
              return `- [${t.category_name ?? "Uncategorized"}] ${t.title}${when}`;
            })
            .join("\n");

    const actionsBlock =
      actionLines.length > 0 ? `\n\nActions just taken:\n${actionLines.map((l) => `- ${l}`).join("\n")}` : "";

    const stream = anthropic.messages.stream({
      model: SONNET_MODEL,
      max_tokens: 1024,
      system: NODABILITY_SYSTEM_PROMPT,
      messages: [
        ...conversationHistory,
        {
          role: "user",
          content: `Today's date: ${today}\n\nCurrent open tasks (for grounding your answer — do not invent anything not listed here):\n${contextBlock}${actionsBlock}\n\nUser message: ${message}`,
        },
      ],
    });

    const encoder = new TextEncoder();
    let fullReply = "";

    const readable = new ReadableStream({
      async start(controller) {
        stream.on("text", (delta) => {
          fullReply += delta;
          controller.enqueue(encoder.encode(delta));
        });
        stream.on("error", (err) => controller.error(err));
        await stream.finalMessage();
        controller.close();

        await insertMessage(userId, "user", message);
        await insertMessage(userId, "assistant", fullReply);
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("chat route failed:", err instanceof Error ? err.message : err);
    return new Response("Something went wrong reaching the assistant. Please try again.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
