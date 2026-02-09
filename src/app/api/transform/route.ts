import os from "node:os";
import path from "node:path";

import JSZip from "jszip";
import { NextRequest } from "next/server";
import sharp from "sharp";

import { OutputFormat, TransformOptions, parseTransformOptions } from "@/lib/image-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUTPUT_MIME: Record<OutputFormat, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
};

const OUTPUT_EXT: Record<OutputFormat, string> = {
  webp: "webp",
  avif: "avif",
  jpeg: "jpg",
  png: "png",
};

interface FileTransformSuccess {
  status: "ok";
  index: number;
  originalName: string;
  safeBaseName: string;
  format: OutputFormat;
  inputBytes: number;
  outputBytes: number;
  data: Buffer;
}

interface FileTransformFailure {
  status: "error";
  index: number;
  originalName: string;
  reason: string;
}

type FileTransformResult = FileTransformSuccess | FileTransformFailure;

interface RuntimeLimits {
  maxInputFileMb: number;
  maxTotalInputMb: number;
  maxBatchFiles: number;
  concurrency: number;
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw <= 0) {
    return fallback;
  }
  return Math.floor(raw);
}

function readPositiveNumberEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw <= 0) {
    return fallback;
  }
  return raw;
}

function getRuntimeLimits(): RuntimeLimits {
  const cpuBased = Math.max(1, Math.min(os.cpus().length, 8));

  return {
    maxInputFileMb: readPositiveNumberEnv("MAX_INPUT_FILE_MB", 0),
    maxTotalInputMb: readPositiveNumberEnv("MAX_TOTAL_INPUT_MB", 0),
    maxBatchFiles: readPositiveIntEnv("MAX_BATCH_FILES", 250),
    concurrency: readPositiveIntEnv("TRANSFORM_CONCURRENCY", cpuBased),
  };
}

function sanitizeBaseName(fileName: string): string {
  const rawBase = path.parse(fileName).name || "image";
  return (
    rawBase
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "image"
  );
}

function parseOptionsField(optionsField: FormDataEntryValue | null): TransformOptions | Response {
  if (typeof optionsField !== "string" || optionsField.trim().length === 0) {
    return parseTransformOptions({});
  }

  try {
    const parsed = JSON.parse(optionsField);
    return parseTransformOptions(parsed);
  } catch {
    return toErrorResponse(400, "Campo options invalido. Debe ser JSON.");
  }
}

function toErrorResponse(status: number, error: string): Response {
  return Response.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function isImageLike(file: File): boolean {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|avif|gif|tiff?|bmp|heic|heif)$/i.test(file.name);
}

function contentDisposition(fileName: string): string {
  return `attachment; filename="${fileName}"`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const output: R[] = new Array(items.length);
  let nextIndex = 0;

  const workerCount = Math.max(1, Math.min(limit, items.length || 1));

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      output[current] = await mapper(items[current], current);
    }
  });

  await Promise.all(workers);
  return output;
}

async function transformOne(
  file: File,
  index: number,
  options: TransformOptions,
): Promise<FileTransformResult> {
  try {
    if (!isImageLike(file)) {
      throw new Error("Archivo no soportado. Solo imagenes.");
    }

    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input, {
      failOn: "none",
      limitInputPixels: false,
    }).metadata();

    if (!metadata.format) {
      throw new Error("El archivo no parece una imagen valida.");
    }

    let image = sharp(input, {
      failOn: "none",
      limitInputPixels: false,
    }).rotate();

    if (options.width || options.height) {
      image = image.resize({
        width: options.width ?? undefined,
        height: options.height ?? undefined,
        fit: options.fit,
        withoutEnlargement: options.withoutEnlargement,
        background: options.background ?? undefined,
      });
    }

    if (options.rotate !== 0) {
      image = image.rotate(options.rotate);
    }

    if (options.brightness !== 1 || options.saturation !== 1 || options.hue !== 0) {
      image = image.modulate({
        brightness: options.brightness,
        saturation: options.saturation,
        hue: options.hue,
      });
    }

    if (options.contrast !== 1) {
      // Linear adjustment for contrast: y = slope * x + intercept
      // To keep 128 as the pivot point
      const slope = options.contrast;
      const intercept = -(128 * slope) + 128;
      image = image.linear(slope, intercept);
    }

    if (options.gamma) {
      image = image.gamma(options.gamma);
    }

    if (options.grayscale) {
      image = image.grayscale();
    }

    if (options.sepia) {
      image = image.grayscale().tint({ r: 112, g: 66, b: 20 });
    }

    if (options.flip) {
      image = image.flip();
    }

    if (options.flop) {
      image = image.flop();
    }

    if (options.blur > 0) {
      image = image.blur(options.blur);
    }

    if (options.sharpen) {
      image = image.sharpen();
    }

    if (!options.stripMetadata) {
      image = image.withMetadata();
    }

    if (options.format === "webp") {
      image = image.webp({
        quality: options.quality,
        effort: options.lossless ? 6 : 4,
        lossless: options.lossless,
      });
    } else if (options.format === "avif") {
      image = image.avif({
        quality: options.quality,
        effort: options.lossless ? 8 : 4,
        lossless: options.lossless,
      });
    } else if (options.format === "jpeg") {
      image = image.jpeg({
        quality: options.quality,
        mozjpeg: true,
      });
    } else {
      image = image.png({
        compressionLevel: 9,
        quality: options.lossless ? 100 : options.quality,
        palette: false,
      });
    }

    const data = await image.toBuffer();

    return {
      status: "ok",
      index,
      originalName: file.name,
      safeBaseName: sanitizeBaseName(file.name),
      format: options.format,
      inputBytes: input.length,
      outputBytes: data.length,
      data,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Error desconocido";
    return {
      status: "error",
      index,
      originalName: file.name,
      reason,
    };
  }
}

function buildErrorReport(
  failures: FileTransformFailure[],
  successes: FileTransformSuccess[],
  options: TransformOptions,
): string {
  const lines: string[] = [];
  lines.push("WebP Lab transform report");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Processed: ${successes.length}`);
  lines.push(`Failed: ${failures.length}`);
  lines.push("");
  lines.push(`Output format: ${options.format}`);
  lines.push(`Quality: ${options.quality}`);
  lines.push("");

  if (failures.length > 0) {
    lines.push("Failures:");
    failures.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.originalName} -> ${item.reason}`);
    });
  }

  return lines.join("\n");
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const limits = getRuntimeLimits();
    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return toErrorResponse(400, "No images received.");
    }

    if (files.length > limits.maxBatchFiles) {
      return toErrorResponse(
        413,
        `Batch too large. Max ${limits.maxBatchFiles} files allowed (MAX_BATCH_FILES).`,
      );
    }

    if (limits.maxInputFileMb > 0) {
      const maxPerFileBytes = limits.maxInputFileMb * 1024 * 1024;
      const tooLarge = files.find((file) => file.size > maxPerFileBytes);
      if (tooLarge) {
        return toErrorResponse(
          413,
          `File ${tooLarge.name} exceeds ${limits.maxInputFileMb} MB (MAX_INPUT_FILE_MB).`,
        );
      }
    }

    if (limits.maxTotalInputMb > 0) {
      const totalInputBytes = files.reduce((sum, file) => sum + file.size, 0);
      const maxTotalBytes = limits.maxTotalInputMb * 1024 * 1024;
      if (totalInputBytes > maxTotalBytes) {
        return toErrorResponse(
          413,
          `Batch exceeds ${limits.maxTotalInputMb} MB total (MAX_TOTAL_INPUT_MB).`,
        );
      }
    }

    const optionsParsed = parseOptionsField(formData.get("options"));
    if (optionsParsed instanceof Response) {
      return optionsParsed;
    }
    const options = optionsParsed;

    const results = await mapWithConcurrency(
      files,
      limits.concurrency,
      async (file, index) => transformOne(file, index, options),
    );

    const successes = results.filter(
      (item): item is FileTransformSuccess => item.status === "ok",
    );
    const failures = results.filter(
      (item): item is FileTransformFailure => item.status === "error",
    );

    if (successes.length === 0) {
      return Response.json(
        {
          error: "No images could be transformed.",
          failures: failures.map((f) => ({
            file: f.originalName,
            reason: f.reason,
          })),
        },
        {
          status: 422,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const totalInputBytes = successes.reduce((sum, item) => sum + item.inputBytes, 0);
    const totalOutputBytes = successes.reduce((sum, item) => sum + item.outputBytes, 0);
    const commonHeaders = {
      "Cache-Control": "no-store",
      "X-Processed-Files": String(successes.length),
      "X-Failed-Files": String(failures.length),
      "X-Total-Input-Bytes": String(totalInputBytes),
      "X-Total-Output-Bytes": String(totalOutputBytes),
    };

    if (successes.length === 1 && failures.length === 0) {
      const single = successes[0];
      const fileName = `${single.safeBaseName}.${OUTPUT_EXT[single.format]}`;
      return new Response(new Uint8Array(single.data), {
        headers: {
          ...commonHeaders,
          "Content-Type": OUTPUT_MIME[single.format],
          "Content-Disposition": contentDisposition(fileName),
        },
      });
    }

    const zip = new JSZip();
    successes.forEach((item, index) => {
      const ext = OUTPUT_EXT[item.format];
      const itemName = `${item.safeBaseName}-${index + 1}.${ext}`;
      zip.file(itemName, item.data);
    });

    const manifest = {
      generatedAt: new Date().toISOString(),
      options,
      totals: {
        processed: successes.length,
        failed: failures.length,
        inputBytes: totalInputBytes,
        outputBytes: totalOutputBytes,
      },
      items: results.map((item) =>
        item.status === "ok"
          ? {
            status: item.status,
            originalName: item.originalName,
            inputBytes: item.inputBytes,
            outputBytes: item.outputBytes,
            outputExt: OUTPUT_EXT[item.format],
          }
          : {
            status: item.status,
            originalName: item.originalName,
            reason: item.reason,
          },
      ),
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    if (failures.length > 0) {
      zip.file("errors.txt", buildErrorReport(failures, successes, options));
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        ...commonHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": contentDisposition("webp-lab-results.zip"),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return toErrorResponse(500, `Could not process the request. ${message}`);
  }
}
