import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import path from "node:path";

const REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg";
const PNG_MAX_PIXELS = 10_000_000;
const MAX_RETRIES = 2;
const PYTHON_COMMANDS = ["python", "py"];
const PYTHON_SCRIPT_PATH = path.join(process.cwd(), "src", "lib", "remove-bg-fallback.py");

interface RemoveBackgroundInput {
  fileName: string;
  input: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickOutputFormat(width?: number, height?: number): "png" | "webp" {
  const pixels = (width ?? 0) * (height ?? 0);
  return pixels > PNG_MAX_PIXELS ? "webp" : "png";
}

function parseApiError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      errors?: Array<{ code?: string; title?: string }>;
    };
    const firstError = parsed.errors?.[0];
    if (firstError?.title) {
      return `remove.bg (${status}): ${firstError.title}`;
    }
    if (firstError?.code) {
      return `remove.bg (${status}): ${firstError.code}`;
    }
  } catch {
    // Ignore invalid JSON and fall back to plain text below.
  }

  const message = body.trim();
  if (message.length > 0) {
    return `remove.bg (${status}): ${message}`;
  }

  return `remove.bg devolvio un error (${status}).`;
}

function runPythonFallback(command: string, input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [PYTHON_SCRIPT_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdoutChunks));
        return;
      }

      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
      reject(new Error(stderr || `El fallback local terminó con código ${code}.`));
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

async function removeBackgroundWithPython(input: Buffer): Promise<Buffer> {
  let lastError: Error | null = null;

  for (const command of PYTHON_COMMANDS) {
    try {
      const result = await runPythonFallback(command, input);
      if (result.length === 0) {
        throw new Error("El fallback local no devolvió datos.");
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw new Error(
    lastError?.message ||
      'No se pudo usar el fallback local. Instala Python y ejecuta `python -m pip install "rembg[cpu]"`.',
  );
}

export async function removeBackgroundImage({
  fileName,
  input,
  mimeType,
  width,
  height,
}: RemoveBackgroundInput): Promise<Buffer> {
  const apiKey = process.env.REMOVE_BG_API_KEY?.trim();
  if (apiKey) {
    const format = pickOutputFormat(width, height);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const formData = new FormData();
      formData.append("size", "auto");
      formData.append("format", format);
      formData.append(
        "image_file",
        new File([new Uint8Array(input)], fileName, {
          type: mimeType,
        }),
      );

      const response = await fetch(REMOVE_BG_URL, {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
        },
        body: formData,
        cache: "no-store",
      });

      if (response.ok) {
        return Buffer.from(await response.arrayBuffer());
      }

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfterHeader = Number(response.headers.get("Retry-After"));
        const retryAfterMs = (Number.isFinite(retryAfterHeader) ? retryAfterHeader : 1) * 1000;
        await wait(retryAfterMs);
        continue;
      }

      if (attempt === MAX_RETRIES) {
        break;
      }
    }
  }

  return removeBackgroundWithPython(input);
}
