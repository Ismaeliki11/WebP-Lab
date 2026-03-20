import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const HEIF_DEC_NAME = process.platform === "win32" ? "heif-dec.exe" : "heif-dec";
const HEIF_ENC_NAME = process.platform === "win32" ? "heif-enc.exe" : "heif-enc";
const PROJECT_TOOL_DIRS = [
  path.join(process.cwd(), ".tools"),
  path.join(process.cwd(), ".codex-heif-bin"),
];

let cachedHeifEncoderPath: string | null = null;
let cachedHeifDecoderPath: string | null = null;

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveHeicEncoderPath(): Promise<string> {
  return resolveHeicToolPath(HEIF_ENC_NAME, cachedHeifEncoderPath);
}

async function resolveHeicToolPath(toolName: string, cachedValue: string | null): Promise<string> {
  if (cachedValue) {
    return cachedValue;
  }

  const envKey = toolName === HEIF_ENC_NAME ? "HEIF_ENC_PATH" : "HEIF_DEC_PATH";
  const configuredPath = process.env[envKey];
  if (configuredPath && (await pathExists(configuredPath))) {
    if (toolName === HEIF_ENC_NAME) {
      cachedHeifEncoderPath = configuredPath;
    } else {
      cachedHeifDecoderPath = configuredPath;
    }
    return configuredPath;
  }

  for (const rootDir of PROJECT_TOOL_DIRS) {
    const directCandidate = path.join(rootDir, toolName);
    if (await pathExists(directCandidate)) {
      if (toolName === HEIF_ENC_NAME) {
        cachedHeifEncoderPath = directCandidate;
      } else {
        cachedHeifDecoderPath = directCandidate;
      }
      return directCandidate;
    }

    const children = await readdir(rootDir, { withFileTypes: true }).catch(() => []);
    for (const child of children) {
      if (!child.isDirectory()) {
        continue;
      }

      const nestedCandidate = path.join(rootDir, child.name, toolName);
      if (await pathExists(nestedCandidate)) {
        if (toolName === HEIF_ENC_NAME) {
          cachedHeifEncoderPath = nestedCandidate;
        } else {
          cachedHeifDecoderPath = nestedCandidate;
        }
        return nestedCandidate;
      }
    }
  }

  const pathValue = process.env.PATH ?? "";
  for (const segment of pathValue.split(path.delimiter)) {
    if (!segment) {
      continue;
    }

    const candidate = path.join(segment, toolName);
    if (await pathExists(candidate)) {
      if (toolName === HEIF_ENC_NAME) {
        cachedHeifEncoderPath = candidate;
      } else {
        cachedHeifDecoderPath = candidate;
      }
      return candidate;
    }
  }

  throw new Error(
    `No se encontro ${toolName}. Define ${envKey} o coloca ${toolName} dentro de ${PROJECT_TOOL_DIRS[0]}.`,
  );
}

export async function resolveHeicDecoderPath(): Promise<string> {
  return resolveHeicToolPath(HEIF_DEC_NAME, cachedHeifDecoderPath);
}

interface EncodeHeicOptions {
  quality: number;
  lossless: boolean;
}

export async function encodeHeicFromImageBuffer(
  inputBuffer: Buffer,
  options: EncodeHeicOptions,
): Promise<Buffer> {
  const encoderPath = await resolveHeicToolPath(HEIF_ENC_NAME, cachedHeifEncoderPath);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "webp-lab-heic-"));
  const inputPath = path.join(tempDir, "input.png");
  const outputPath = path.join(tempDir, "output.heic");

  try {
    await writeFile(inputPath, inputBuffer);

    const args = ["-e", "x265"];
    if (options.lossless) {
      args.push("-L");
    } else {
      args.push("-q", String(options.quality));
    }

    args.push("-o", outputPath, inputPath);

    await execFileAsync(encoderPath, args, {
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });

    return await readFile(outputPath);
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "heif-enc no pudo generar el archivo HEIC.";
    throw new Error(`No se pudo generar HEIC. ${message}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function decodeHeicToPngBuffer(inputBuffer: Buffer): Promise<Buffer> {
  const decoderPath = await resolveHeicDecoderPath();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "webp-lab-heic-"));
  const inputPath = path.join(tempDir, "input.heic");
  const outputPath = path.join(tempDir, "output.png");

  try {
    await writeFile(inputPath, inputBuffer);

    await execFileAsync(
      decoderPath,
      ["--png-compression-level", "9", "-o", outputPath, inputPath],
      {
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
      },
    );

    return await readFile(outputPath);
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "heif-dec no pudo leer el archivo HEIC.";
    throw new Error(`No se pudo leer HEIC. ${message}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
