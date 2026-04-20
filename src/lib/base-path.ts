const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";

export const APP_BASE_PATH =
  rawBasePath === "/" ? "" : rawBasePath.replace(/\/$/, "");

export function withBasePath(targetPath: string): string {
  if (!targetPath.startsWith("/")) {
    throw new Error(`withBasePath expects an absolute path. Received: ${targetPath}`);
  }

  return `${APP_BASE_PATH}${targetPath}`;
}
