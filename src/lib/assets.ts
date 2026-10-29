/** Public files must follow the app's hosting prefix, including Pages subpaths. */
export function assetUrl(path: string) {
  return (import.meta.env?.BASE_URL ?? "./") + path.replace(/^\.?\//, "");
}
