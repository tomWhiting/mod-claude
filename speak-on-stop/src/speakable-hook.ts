#!/usr/bin/env bun
/**
 * speakable-hook - Claude Code Stop hook for TTS
 *
 * Reads Claude Code hook stdin, extracts the last assistant message from
 * the transcript, and sends to the speakable TTS endpoint.
 *
 * The server handles both humanization AND context derivation (subject/working_on)
 * in a single API call for efficiency.
 *
 * Usage (as Claude Code hook):
 *   Configure in .claude/settings.json or .claude/settings.local.json:
 *   {
 *     "hooks": {
 *       "Stop": [{
 *         "matcher": "",
 *         "hooks": ["/path/to/speakable-hook"]
 *       }]
 *     }
 *   }
 *
 * Compile to binary:
 *   bun build --compile speakable-hook.ts --outfile speakable
 */

const SPEAKABLE_URL =
  process.env.SPEAKABLE_URL || "http://localhost:8766/api/speakable";

// Debug logging - disabled by default, set SPEAKABLE_HOOK_DEBUG=1 to enable
const DEBUG = process.env.SPEAKABLE_HOOK_DEBUG === "1";
const DEBUG_FILE = `${process.env.HOME}/.ablative/audio/speakable-hook-debug.log`;

interface HookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  stop_hook_active?: boolean;
}

interface SpeakablePayload {
  text: string;
  session_id?: string;
  cwd?: string;
}

interface TranscriptEntry {
  type?: string;
  message?: {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  };
}

async function debugLog(label: string, data: unknown): Promise<void> {
  if (!DEBUG) return;

  try {
    const fs = await import("fs");
    const dir = DEBUG_FILE.substring(0, DEBUG_FILE.lastIndexOf("/"));
    fs.mkdirSync(dir, { recursive: true });

    const timestamp = new Date().toISOString();
    const separator = "=".repeat(60);
    let content = `\n${separator}\n[${timestamp}] ${label}\n${separator}\n`;

    if (typeof data === "object") {
      content += JSON.stringify(data, null, 2);
    } else {
      content += String(data);
    }
    content += "\n";

    fs.appendFileSync(DEBUG_FILE, content);
  } catch {
    // Silently fail
  }
}

async function getLastAssistantMessage(
  transcriptPath: string,
): Promise<string | null> {
  try {
    const fs = await import("fs");
    const path = await import("path");

    const resolvedPath = transcriptPath.startsWith("~")
      ? transcriptPath.replace("~", process.env.HOME || "")
      : transcriptPath;

    const absolutePath = path.resolve(resolvedPath);

    if (!fs.existsSync(absolutePath)) {
      await debugLog("TRANSCRIPT NOT FOUND", absolutePath);
      return null;
    }

    const content = fs.readFileSync(absolutePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());

    let lastAssistantText: string | null = null;

    for (const line of lines) {
      try {
        const entry: TranscriptEntry = JSON.parse(line);

        if (entry.type === "assistant" && entry.message?.content) {
          const textParts: string[] = [];

          for (const block of entry.message.content) {
            if (block.type === "text" && block.text) {
              textParts.push(block.text);
            }
          }

          if (textParts.length > 0) {
            lastAssistantText = textParts.join("\n");
          }
        }
      } catch {
        // Skip malformed lines
        continue;
      }
    }

    return lastAssistantText;
  } catch (error) {
    await debugLog("TRANSCRIPT READ ERROR", error);
    return null;
  }
}

async function sendToSpeakable(payload: SpeakablePayload): Promise<void> {
  try {
    await debugLog("SENDING TO SPEAKABLE", payload);

    const response = await fetch(SPEAKABLE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      await debugLog("SPEAKABLE ERROR", error);
      return;
    }

    const result = await response.json();
    await debugLog("SPEAKABLE RESPONSE", result);
  } catch (error) {
    await debugLog("SPEAKABLE SEND ERROR", error);
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}

async function main(): Promise<void> {
  await debugLog("HOOK STARTED", { time: new Date().toISOString() });

  // Read stdin
  if (process.stdin.isTTY) {
    await debugLog("EXIT", "stdin is tty");
    process.exit(0);
  }

  const stdinContent = await readStdin();
  if (!stdinContent) {
    await debugLog("EXIT", "no stdin content");
    process.exit(0);
  }

  let input: HookInput;
  try {
    input = JSON.parse(stdinContent);
  } catch (error) {
    await debugLog("EXIT", `JSON parse error: ${error}`);
    process.exit(0);
  }

  await debugLog("HOOK INPUT", input);

  // Don't run if this is already a continuation from a stop hook
  if (input.stop_hook_active) {
    await debugLog("EXIT", "stop_hook_active is true");
    process.exit(0);
  }

  const { session_id, transcript_path, cwd } = input;

  if (!transcript_path) {
    await debugLog("EXIT", "no transcript_path");
    process.exit(0);
  }

  // Get last assistant message from transcript
  const lastMessage = await getLastAssistantMessage(transcript_path);
  await debugLog("LAST MESSAGE", lastMessage?.slice(0, 500) || null);

  if (!lastMessage) {
    await debugLog("EXIT", "no last_message found");
    process.exit(0);
  }

  // Build payload - server handles humanization AND context derivation
  const payload: SpeakablePayload = {
    text: lastMessage,
    session_id: session_id || "",
    cwd: cwd || "",
  };

  await debugLog("PAYLOAD", payload);

  // Send to TTS endpoint (server does all the AI processing)
  await sendToSpeakable(payload);

  await debugLog("HOOK COMPLETED", "sent to speakable endpoint");
  process.exit(0);
}

main();
