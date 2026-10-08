import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeBuildId, precacheList, stampServiceWorker } from "./sw-stamp";

const template = readFileSync(path.resolve(process.cwd(), "tools/sw/sw.template.js"), "utf8");
const base = {
  template,
  bundleFiles: [
    "assets/index-AAA111.js",
    "assets/routes-BBB222.js",
    "assets/styles-CCC333.css",
    "assets/logo-DDD444.png",
  ],
  publicFiles: {
    "manifest.webmanifest": '{"name":"Reading Buddy"}',
    "offline.html": "<p>offline</p>",
    "icons/icon-192.png": new Uint8Array([1, 2, 3]),
  },
};

describe("service worker build stamping", () => {
  it("gives the same id for the same build, whatever order the files are listed in", () => {
    const a = computeBuildId(base);
    expect(computeBuildId({ ...base, bundleFiles: [...base.bundleFiles].reverse() })).toBe(a);
    expect(
      computeBuildId({
        ...base,
        publicFiles: Object.fromEntries(Object.entries(base.publicFiles).reverse()),
      }),
    ).toBe(a);
  });

  it("changes the id when any built file changes (Rollup puts a content hash in each name)", () => {
    const a = computeBuildId(base);
    expect(
      computeBuildId({
        ...base,
        bundleFiles: base.bundleFiles.map((f) => f.replace("AAA111", "AAA999")),
      }),
    ).not.toBe(a);
    expect(
      computeBuildId({ ...base, bundleFiles: [...base.bundleFiles, "assets/new-EEE555.js"] }),
    ).not.toBe(a);
  });

  it("changes the id when a public file's contents change (manifest, offline page, icons)", () => {
    const a = computeBuildId(base);
    expect(
      computeBuildId({
        ...base,
        publicFiles: { ...base.publicFiles, "manifest.webmanifest": '{"name":"Reading Buddy 2"}' },
      }),
    ).not.toBe(a);
    expect(
      computeBuildId({
        ...base,
        publicFiles: { ...base.publicFiles, "icons/icon-192.png": new Uint8Array([1, 2, 4]) },
      }),
    ).not.toBe(a);
  });

  it("changes the id when the service worker code itself changes", () => {
    expect(computeBuildId({ ...base, template: template + "\n// tweak" })).not.toBe(
      computeBuildId(base),
    );
  });

  it("fills in both placeholders, and the output differs between releases (so browsers see an update)", () => {
    const one = stampServiceWorker(base);
    const two = stampServiceWorker({
      ...base,
      bundleFiles: base.bundleFiles.map((f) => f.replace("BBB222", "BBB999")),
    });
    expect(one.code).not.toContain("__RB_");
    expect(one.code).toContain(`const BUILD_ID = "${one.buildId}"`);
    expect(one.code).not.toBe(two.code);
    expect(one.buildId).toMatch(/^[a-f0-9]{12}$/);
  });

  it("precaches only built scripts and styles, as absolute URLs", () => {
    expect(precacheList(base.bundleFiles)).toEqual([
      "/assets/index-AAA111.js",
      "/assets/routes-BBB222.js",
      "/assets/styles-CCC333.css",
    ]);
    expect(precacheList(["index.html", "assets/map-X.js.map", "other/x.js"])).toEqual([]);
  });

  it("refuses to stamp a template whose placeholders were removed (so stamping can't be silently switched off)", () => {
    expect(() =>
      stampServiceWorker({ ...base, template: template.replace('"__RB_BUILD_ID__"', '"fixed"') }),
    ).toThrow(/placeholders/);
    expect(() =>
      stampServiceWorker({ ...base, template: template.replace('["__RB_PRECACHE__"]', "[]") }),
    ).toThrow(/placeholders/);
  });

  it("the shipped template is not a fixed version any more", () => {
    expect(template).not.toMatch(/VERSION\s*=\s*"rb-v1"/);
    expect(template).toContain("__RB_BUILD_ID__");
  });
});
