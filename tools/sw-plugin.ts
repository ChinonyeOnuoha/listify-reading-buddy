import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { stampServiceWorker } from "./sw-stamp";

const walk = (dir: string, base = dir, out: Record<string, Uint8Array> = {}) => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out[path.relative(base, full).split(path.sep).join("/")] = readFileSync(full);
  }
  return out;
};

/**
 * Emits /sw.js from tools/sw/sw.template.js with a build id derived from the real build output,
 * so every release that changes the app changes the service worker file and browsers detect the update.
 * Runs for production client builds only (the dev server never registers a service worker).
 */
export function serviceWorkerPlugin(): Plugin {
  let root = process.cwd();
  let publicDir: string | false = false;
  return {
    name: "reading-buddy-service-worker",
    apply: "build",
    configResolved(config) {
      root = config.root;
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const env = (this as unknown as { environment?: { name?: string } }).environment?.name;
      if (env && env !== "client") return;
      const bundleFiles = Object.keys(bundle);
      // The server build has no browser scripts or styles; only the client bundle gets a service worker.
      if (!bundleFiles.some((f) => f.startsWith("assets/") && /\.(js|css)$/.test(f))) return;

      const templatePath = path.resolve(root, "tools/sw/sw.template.js");
      if (!existsSync(templatePath))
        throw new Error(`Service worker template not found at ${templatePath}`);
      const publicFiles = publicDir && existsSync(publicDir) ? walk(publicDir) : {};
      delete publicFiles["sw.js"]; // a stale copy must never influence (or shadow) the stamped file

      const { code, buildId, precache } = stampServiceWorker({
        template: readFileSync(templatePath, "utf8"),
        bundleFiles,
        publicFiles,
      });
      this.emitFile({ type: "asset", fileName: "sw.js", source: code });
      this.info?.(`service worker stamped: build ${buildId}, ${precache.length} files precached`);
    },
  };
}
