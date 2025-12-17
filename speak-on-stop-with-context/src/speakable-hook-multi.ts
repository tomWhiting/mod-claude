#!/usr/bin/env bun
/**
 * speakable-hook-multi - Test version that grabs last N messages
 *
 * This is a test version to experiment with multi-message context.
 * Run directly with: bun speakable-hook-multi.ts <transcript_path>
 */

interface TranscriptEntry {
  type?: string;
  message?: {
    role?: string;
    content?: string | Array<{
      type?: string;
      text?: string;
      name?: string;
    }>;
  };
}

interface ExtractedMessage {
  role: "user" | "assistant";
  text: string;
}

/**
 * Extract the last N meaningful messages from a transcript
 * Filters out tool_use, tool_result, and thinking blocks
 */
async function getLastNMessages(
  transcriptPath: string,
  count: number = 4,
): Promise<ExtractedMessage[]> {
  const fs = await import("fs");
  const path = await import("path");

  const resolvedPath = transcriptPath.startsWith("~")
    ? transcriptPath.replace("~", process.env.HOME || "")
    : transcriptPath;

  const absolutePath = path.resolve(resolvedPath);

  if (!fs.existsSync(absolutePath)) {
    console.error("Transcript not found:", absolutePath);
    return [];
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  const messages: ExtractedMessage[] = [];

  for (const line of lines) {
    try {
      const entry: TranscriptEntry = JSON.parse(line);

      if (!entry.message) continue;

      const role = entry.message.role || entry.type;
      const msgContent = entry.message.content;

      if (role === "user") {
        // User messages: content is either a string or array with tool_result
        if (typeof msgContent === "string" && msgContent.trim()) {
          messages.push({
            role: "user",
            text: msgContent.trim(),
          });
        }
        // Skip tool_result entries (user role but content is array with tool_result)
      } else if (role === "assistant") {
        // Assistant messages: content is array of blocks
        if (Array.isArray(msgContent)) {
          const textParts: string[] = [];

          for (const block of msgContent) {
            // Only grab actual text blocks, skip thinking, tool_use, etc.
            if (block.type === "text" && block.text) {
              textParts.push(block.text);
            }
          }

          if (textParts.length > 0) {
            messages.push({
              role: "assistant",
              text: textParts.join("\n"),
            });
          }
        }
      }
    } catch {
      // Skip malformed lines
      continue;
    }
  }

  // Return the last N messages
  return messages.slice(-count);
}

/**
 * Format messages for context
 */
function formatMessagesForContext(messages: ExtractedMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      // Truncate very long messages
      const text = msg.text.length > 2000 ? msg.text.slice(0, 2000) + "..." : msg.text;
      return `[${role}]:\n${text}`;
    })
    .join("\n\n---\n\n");
}

async function main(): Promise<void> {
  const transcriptPath = process.argv[2];

  if (!transcriptPath) {
    console.error("Usage: bun speakable-hook-multi.ts <transcript_path>");
    console.error("");
    console.error("Example:");
    console.error("  bun speakable-hook-multi.ts ~/.claude/projects/.../session.jsonl");
    process.exit(1);
  }

  console.log("=== Testing multi-message extraction ===\n");
  console.log("Transcript:", transcriptPath);
  console.log("");

  // Test with different counts
  for (const count of [1, 2, 4]) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Last ${count} message(s):`);
    console.log("=".repeat(60));

    const messages = await getLastNMessages(transcriptPath, count);

    console.log(`Found ${messages.length} message(s)\n`);

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      console.log(`--- Message ${i + 1} (${msg.role}) ---`);
      console.log(`Length: ${msg.text.length} chars`);
      console.log(`Preview: ${msg.text.slice(0, 200)}...`);
      console.log("");
    }

    if (messages.length > 0) {
      console.log("--- Formatted context ---");
      const formatted = formatMessagesForContext(messages);
      console.log(`Total context length: ${formatted.length} chars`);
      console.log("");
    }
  }
}

main();
