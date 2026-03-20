import { Buffer } from "node:buffer";
import os from "node:os";
import path from "node:path";

import JSZip from "jszip";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { optimize } from "svgo";

import { OutputFormat, TransformOptions, parseTransformOptions } from "@/lib/image-tools";
import { decodeHeicToPngBuffer, encodeHeicFromImageBuffer } from "@/lib/heic-tools";
import { removeBackgroundImage } from "@/lib/remove-bg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUTPUT_MIME: Record<OutputFormat, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
};

const OUTPUT_EXT: Record<OutputFormat, string> = {
  webp: "webp",
  avif: "avif",
  jpeg: "jpg",
  png: "png",
  heic: "heic",
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

interface SharedTransformAssets {
  backgroundAsset: Buffer | null;
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

function resolveRenamePattern(pattern: string, originalName: string, options: TransformOptions, width?: number, height?: number): string {
  const base = path.parse(originalName).name;
  const now = new Date().toISOString().split('T')[0];

  return pattern
    .replace(/\[name\]/g, base)
    .replace(/\[width\]/g, String(width || 'auto'))
    .replace(/\[height\]/g, String(height || 'auto'))
    .replace(/\[format\]/g, options.format)
    .replace(/\[date\]/g, now);
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

function isHeicInput(file: File): boolean {
  return file.type === "image/heic" || file.type === "image/heif" || /\.(heic|heif)$/i.test(file.name);
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
  assets: SharedTransformAssets,
): Promise<FileTransformResult> {
  try {
    if (!isImageLike(file)) {
      throw new Error("Archivo no soportado. Solo imagenes.");
    }

    const isSvg = file.type === "image/svg+xml" || file.name.endsWith(".svg");
    let input: Buffer = Buffer.from(await file.arrayBuffer());
    let removeBgMimeType = file.type || "application/octet-stream";
    let removeBgFileName = file.name;

    if (isHeicInput(file)) {
      input = await decodeHeicToPngBuffer(input);
      removeBgMimeType = "image/png";
      removeBgFileName = `${sanitizeBaseName(file.name)}.png`;
    }

    if (isSvg && options.format === "png") {
      const result = optimize(input.toString(), {
        multipass: true,
        plugins: ['preset-default']
      });
      if (result.data) input = Buffer.from(result.data);
    }

    if (options.removeBackground && isSvg) {
      input = await sharp(input, {
        failOn: "none",
        limitInputPixels: false,
      }).png().toBuffer();
      removeBgMimeType = "image/png";
      removeBgFileName = `${sanitizeBaseName(file.name)}.png`;
    }

    const sourceMetadata = await sharp(input, {
      failOn: "none",
      limitInputPixels: false,
    }).metadata();

    if (!sourceMetadata.format) {
      throw new Error("El archivo no parece una imagen valida.");
    }

    if (options.removeBackground) {
      input = await removeBackgroundImage({
        fileName: removeBgFileName,
        input,
        mimeType: removeBgMimeType,
        width: sourceMetadata.width,
        height: sourceMetadata.height,
      });
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
        position: options.smartCrop ? sharp.strategy.entropy : undefined,
        withoutEnlargement: options.withoutEnlargement,
        background: options.removeBackground ? undefined : options.background ?? undefined,
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

    if (options.removeBackground && options.backgroundMode !== "transparent") {
      const subjectLayer = await image.ensureAlpha().png().toBuffer({ resolveWithObject: true });
      const { width = sourceMetadata.width, height = sourceMetadata.height } = subjectLayer.info;

      if (!width || !height) {
        throw new Error("No se pudo calcular el tamaño final del recorte.");
      }

      if (options.backgroundMode === "image") {
        if (!assets.backgroundAsset) {
          throw new Error("Has elegido un fondo por imagen, pero no has cargado ninguna imagen de fondo.");
        }

        image = sharp(assets.backgroundAsset, {
          failOn: "none",
          limitInputPixels: false,
        })
          .rotate()
          .resize({
            width,
            height,
            fit: "cover",
          })
          .ensureAlpha()
          .composite([
            {
              input: subjectLayer.data,
              left: 0,
              top: 0,
            },
          ]);
      } else {
        image = sharp({
          create: {
            width,
            height,
            channels: 4,
            background: options.background ?? "#ffffff",
          },
        }).composite([
          {
            input: subjectLayer.data,
            left: 0,
            top: 0,
          },
        ]);
      }
    }

    if (options.watermarkText) {
      const svgWatermark = Buffer.from(`
        <svg width="800" height="200">
          <style>
            .text { 
              fill: white; 
              font-size: 48px; 
              font-weight: bold; 
              font-family: sans-serif;
              filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
            }
          </style>
          <text x="50%" y="50%" text-anchor="middle" class="text" opacity="${options.watermarkOpacity}">
            ${options.watermarkText}
          </text>
        </svg>
      `);
      image = image.composite([{
        input: svgWatermark,
        gravity: 'center',
        blend: 'over'
      }]);
    }

    if (!options.stripMetadata) {
      image = image.withMetadata();
    }

    if (options.format === "jpeg") {
      image = image.flatten({
        background: options.background ?? "#ffffff",
      });
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
    } else if (options.format === "png") {
      image = image.png({
        compressionLevel: 9,
        quality: options.lossless ? 100 : options.quality,
        palette: false,
      });
    }

    const data =
      options.format === "heic"
        ? await encodeHeicFromImageBuffer(
          await image.png({
            compressionLevel: 9,
            palette: false,
          }).toBuffer(),
          {
            quality: options.quality,
            lossless: options.lossless,
          },
        )
        : await image.toBuffer();

    // Determine final name
    const safeBaseName = sanitizeBaseName(file.name);
    const finalBaseName = options.renamePattern
      ? resolveRenamePattern(options.renamePattern, file.name, options, options.width || sourceMetadata.width, options.height || sourceMetadata.height)
      : safeBaseName;

    return {
      status: "ok",
      index,
      originalName: file.name,
      safeBaseName: finalBaseName,
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
    const backgroundAssetEntry = formData.get("backgroundAsset");

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

    const globalOptionsField = formData.get("options");
    const fileOptionsFields = formData.getAll("fileOptions");

    const globalOptionsParsed = globalOptionsField ? parseOptionsField(globalOptionsField) : parseTransformOptions({});
    if (globalOptionsParsed instanceof Response) return globalOptionsParsed;

    let sharedAssets: SharedTransformAssets = {
      backgroundAsset: null,
    };

    if (backgroundAssetEntry instanceof File && backgroundAssetEntry.size > 0) {
      if (!isImageLike(backgroundAssetEntry)) {
        return toErrorResponse(400, "La imagen de fondo no tiene un formato compatible.");
      }

      sharedAssets = {
        backgroundAsset: Buffer.from(await backgroundAssetEntry.arrayBuffer()),
      };
    }

    const results = await mapWithConcurrency(
      files,
      limits.concurrency,
      async (file, index) => {
        let fileOpts = globalOptionsParsed;
        if (fileOptionsFields[index]) {
          const parsed = parseOptionsField(fileOptionsFields[index]);
          if (!(parsed instanceof Response)) fileOpts = parsed;
        }
        return transformOne(file, index, fileOpts, sharedAssets);
      }
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
      options: globalOptionsParsed,
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
      zip.file("errors.txt", buildErrorReport(failures, successes, globalOptionsParsed));
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
