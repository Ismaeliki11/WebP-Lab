export const OUTPUT_FORMATS = ["webp", "avif", "jpeg", "png"] as const;
export const RESIZE_FITS = ["cover", "contain", "fill", "inside", "outside"] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];
export type ResizeFit = (typeof RESIZE_FITS)[number];

export interface TransformOptions {
  format: OutputFormat;
  quality: number;
  width: number | null;
  height: number | null;
  fit: ResizeFit;
  rotate: number; // Allow any degree for pro editor
  grayscale: boolean;
  blur: number;
  sharpen: boolean;
  flip: boolean;
  flop: boolean;
  stripMetadata: boolean;
  withoutEnlargement: boolean;
  background: string | null;
  lossless: boolean;
  // Professional Adjustments
  brightness: number;
  saturation: number;
  hue: number;
  contrast: number;
  gamma: number | null;
  sepia: boolean;
  // Advanced Features
  smartCrop: boolean;
  watermarkText: string | null;
  watermarkOpacity: number;
  renamePattern: string | null;
}

export interface TransformPreset {
  id: string;
  label: string;
  description: string;
  options: Partial<TransformOptions>;
}

export const DEFAULT_OPTIONS: TransformOptions = {
  format: "webp",
  quality: 82,
  width: null,
  height: null,
  fit: "inside",
  rotate: 0,
  grayscale: false,
  blur: 0,
  sharpen: false,
  flip: false,
  flop: false,
  stripMetadata: true,
  withoutEnlargement: true,
  background: null,
  lossless: false,
  brightness: 1,
  saturation: 1,
  hue: 0,
  contrast: 1,
  gamma: null,
  sepia: false,
  smartCrop: false,
  watermarkText: null,
  watermarkOpacity: 0.5,
  renamePattern: null,
};

export const PRESETS: TransformPreset[] = [
  {
    id: "webp-web",
    label: "WebP Web",
    description: "Good balance for web delivery.",
    options: {
      format: "webp",
      quality: 82,
      withoutEnlargement: true,
      stripMetadata: true,
    },
  },
  {
    id: "avif-ultra",
    label: "AVIF Ultra",
    description: "Maximum compression, slower encode.",
    options: {
      format: "avif",
      quality: 62,
      stripMetadata: true,
      withoutEnlargement: true,
    },
  },
  {
    id: "social-1200",
    label: "Social 1200",
    description: "Best fit for social cards and previews.",
    options: {
      format: "webp",
      quality: 80,
      width: 1200,
      height: 630,
      fit: "cover",
      stripMetadata: true,
    },
  },
  {
    id: "archive-lossless",
    label: "Archive",
    description: "Lossless conversion for quality-critical files.",
    options: {
      format: "png",
      lossless: true,
      quality: 100,
      stripMetadata: false,
    },
  },
];

const ROTATE_VALUES = new Set([0, 90, 180, 270]);
const COLOR_HEX = /^#(?:[0-9a-fA-F]{3}){1,2}(?:[0-9a-fA-F]{2})?$/;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
  }

  return fallback;
}

function toPositiveIntOrNull(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

function toBackgroundColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return COLOR_HEX.test(trimmed) ? trimmed : null;
}

function isOutputFormat(value: unknown): value is OutputFormat {
  return OUTPUT_FORMATS.includes(value as OutputFormat);
}

function isResizeFit(value: unknown): value is ResizeFit {
  return RESIZE_FITS.includes(value as ResizeFit);
}

export function parseTransformOptions(raw: unknown): TransformOptions {
  const source =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  const qualityInput = Number(source.quality);
  const rotateInput = Number(source.rotate);
  const blurInput = Number(source.blur);
  const brightnessInput = Number(source.brightness);
  const saturationInput = Number(source.saturation);
  const hueInput = Number(source.hue);
  const contrastInput = Number(source.contrast);
  const gammaInput = source.gamma === null || source.gamma === undefined ? null : Number(source.gamma);
  const watermarkOpacityInput = Number(source.watermarkOpacity);

  return {
    format: isOutputFormat(source.format) ? source.format : DEFAULT_OPTIONS.format,
    quality: Number.isFinite(qualityInput)
      ? Math.round(clamp(qualityInput, 1, 100))
      : DEFAULT_OPTIONS.quality,
    width: toPositiveIntOrNull(source.width),
    height: toPositiveIntOrNull(source.height),
    fit: isResizeFit(source.fit) ? source.fit : DEFAULT_OPTIONS.fit,
    rotate: Number.isFinite(rotateInput) ? rotateInput : DEFAULT_OPTIONS.rotate,
    grayscale: toBool(source.grayscale, DEFAULT_OPTIONS.grayscale),
    blur: Number.isFinite(blurInput) ? clamp(blurInput, 0, 20) : DEFAULT_OPTIONS.blur,
    sharpen: toBool(source.sharpen, DEFAULT_OPTIONS.sharpen),
    flip: toBool(source.flip, DEFAULT_OPTIONS.flip),
    flop: toBool(source.flop, DEFAULT_OPTIONS.flop),
    stripMetadata: toBool(source.stripMetadata, DEFAULT_OPTIONS.stripMetadata),
    withoutEnlargement: toBool(source.withoutEnlargement, DEFAULT_OPTIONS.withoutEnlargement),
    background: toBackgroundColor(source.background),
    lossless: toBool(source.lossless, DEFAULT_OPTIONS.lossless),
    brightness: Number.isFinite(brightnessInput) ? clamp(brightnessInput, 0, 3) : DEFAULT_OPTIONS.brightness,
    saturation: Number.isFinite(saturationInput) ? clamp(saturationInput, 0, 3) : DEFAULT_OPTIONS.saturation,
    hue: Number.isFinite(hueInput) ? hueInput : DEFAULT_OPTIONS.hue,
    contrast: Number.isFinite(contrastInput) ? clamp(contrastInput, 0, 3) : DEFAULT_OPTIONS.contrast,
    gamma: Number.isFinite(gammaInput) ? clamp(gammaInput!, 1, 3) : null,
    sepia: toBool(source.sepia, DEFAULT_OPTIONS.sepia),
    smartCrop: toBool(source.smartCrop, DEFAULT_OPTIONS.smartCrop),
    watermarkText: typeof source.watermarkText === "string" ? source.watermarkText : DEFAULT_OPTIONS.watermarkText,
    watermarkOpacity: Number.isFinite(watermarkOpacityInput) ? clamp(watermarkOpacityInput, 0, 1) : DEFAULT_OPTIONS.watermarkOpacity,
    renamePattern: typeof source.renamePattern === "string" ? source.renamePattern : DEFAULT_OPTIONS.renamePattern,
  };
}

export function applyPreset(
  base: TransformOptions,
  preset: TransformPreset,
): TransformOptions {
  return parseTransformOptions({
    ...base,
    ...preset.options,
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}
