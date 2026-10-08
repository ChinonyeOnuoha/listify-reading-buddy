import { createHash } from "node:crypto";

export type StampInput = {
  /** Contents of tools/sw/sw.template.js */
  template: string;
  /** File names in the client bundle, e.g. "assets/index-B2frFwmi.js". Rollup puts a content hash in each. */
  bundleFiles: string[];
  /** Files from public/ (path → contents). Their contents are part of the version, so editing the manifest or icons updates the app. */
  publicFiles: Record<string, string | Uint8Array>;
};

const ID = '"__RB_BUILD_ID__"';
const LIST = '["__RB_PRECACHE__"]';

/** Scripts and styles to precache, as URLs. */
export const precacheList = (bundleFiles: string[]) =>
  bundleFiles
    .filter((f) => f.startsWith("assets/") && /\.(js|css)$/.test(f))
    .map((f) => `/${f}`)
    .sort();

/** Same build → same id; any change to a built file name, a public file's contents or the template → a different id. */
export function computeBuildId({ template, bundleFiles, publicFiles }: StampInput): string {
  const h = createHash("sha256");
  h.update(template);
  for (const f of [...bundleFiles].sort()) h.update(`bundle:${f}\n`);
  for (const f of Object.keys(publicFiles).sort()) {
    h.update(`public:${f}:`);
    h.update(publicFiles[f]!);
    h.update("\n");
  }
  return h.digest("hex").slice(0, 12);
}

/** Fill the template's placeholders. Throws if they're missing, so a refactor can't silently turn stamping off. */
export function stampServiceWorker(input: StampInput): {
  code: string;
  buildId: string;
  precache: string[];
} {
  if (!input.template.includes(ID) || !input.template.includes(LIST)) {
    throw new Error(
      "sw.template.js no longer contains the __RB_BUILD_ID__ / __RB_PRECACHE__ placeholders the build fills in.",
    );
  }
  const buildId = computeBuildId(input);
  const precache = precacheList(input.bundleFiles);
  const code = input.template
    .replace(ID, JSON.stringify(buildId))
    .replace(LIST, JSON.stringify(precache));
  return { code, buildId, precache };
}
