export function resolveMarkdownImageUrl(src: string, basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "") {
  if (!basePath || !src.startsWith("/") || src.startsWith("//")) return src;

  const normalizedBasePath = basePath.replace(/\/$/, "");
  return src.startsWith(`${normalizedBasePath}/`) ? src : `${normalizedBasePath}${src}`;
}
