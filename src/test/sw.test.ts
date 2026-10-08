// Runs the real service worker template (stamped like a build would) in a fake worker environment.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { stampServiceWorker } from "../../tools/sw-stamp";

const template = readFileSync(path.resolve(process.cwd(), "tools/sw/sw.template.js"), "utf8");
const ORIGIN = "https://reading.example";

const keyOf = (r: string | { url: string }) => {
  const u = new URL(typeof r === "string" ? r : r.url, ORIGIN);
  return u.origin === ORIGIN ? u.pathname : u.href;
};

class FakeCache {
  store = new Map<string, Response>();
  constructor(private fetcher: (u: string) => Promise<Response>) {}
  async addAll(urls: string[]) {
    const all = await Promise.all(urls.map((u) => this.fetcher(u)));
    if (all.some((r) => !r.ok)) throw new TypeError("addAll: a request failed"); // all-or-nothing, like the real thing
    urls.forEach((u, i) => this.store.set(keyOf(u), all[i]!));
  }
  async put(req: string | { url: string }, res: Response) {
    this.store.set(keyOf(req), res);
  }
  async match(req: string | { url: string }) {
    return this.store.get(keyOf(req));
  }
  async keys() {
    return [...this.store.keys()].map((k) => ({ url: new URL(k, ORIGIN).href }));
  }
  async delete(req: string | { url: string }) {
    return this.store.delete(keyOf(req));
  }
}
class FakeCaches {
  map = new Map<string, FakeCache>();
  constructor(private fetcher: (u: string) => Promise<Response>) {}
  async open(name: string) {
    if (!this.map.has(name)) this.map.set(name, new FakeCache(this.fetcher));
    return this.map.get(name)!;
  }
  async keys() {
    return [...this.map.keys()];
  }
  async delete(name: string) {
    return this.map.delete(name);
  }
  async match(req: string | { url: string }, opts?: { cacheName?: string }) {
    for (const [name, c] of this.map) {
      if (opts?.cacheName && name !== opts.cacheName) continue;
      const hit = await c.match(req);
      if (hit) return hit;
    }
    return undefined;
  }
}

type Listener = (e: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
function bootWorker(opts: {
  bundleFiles: string[];
  online?: boolean;
  failing?: Set<string>;
  existing?: string[];
}) {
  const online = { value: opts.online ?? true };
  const failing = opts.failing ?? new Set<string>();
  const fetched: string[] = [];
  const fetcher = async (u: string | { url: string }) => {
    const k = keyOf(u);
    fetched.push(k);
    if (!online.value) throw new TypeError("offline");
    return new Response(failing.has(k) ? "no" : `body:${k}`, {
      status: failing.has(k) ? 404 : 200,
    });
  };
  const caches = new FakeCaches(fetcher as never);
  for (const name of opts.existing ?? [])
    void caches.map.set(name, new FakeCache(fetcher as never));
  const listeners: Record<string, Listener> = {};
  const state = { skipWaitingCalled: 0, claimed: 0 };
  const self = {
    addEventListener: (t: string, fn: Listener) => (listeners[t] = fn),
    skipWaiting: () => void state.skipWaitingCalled++,
    clients: { claim: async () => void state.claimed++ },
    location: { origin: ORIGIN },
  };
  const { code, buildId } = stampServiceWorker({
    template,
    bundleFiles: opts.bundleFiles,
    publicFiles: { "manifest.webmanifest": "{}" },
  });
  new Function("self", "caches", "fetch", "Response", "URL", code)(
    self,
    caches,
    fetcher,
    Response,
    URL,
  );
  const run = async (type: string, extra: Record<string, unknown> = {}) => {
    const pending: Promise<unknown>[] = [];
    listeners[type]?.({ waitUntil: (p: Promise<unknown>) => pending.push(p), ...extra });
    await Promise.all(pending);
  };
  return { caches, state, run, online, failing, fetched, listeners, buildId };
}

const BUILD_1 = ["assets/index-AAA.js", "assets/styles-CCC.css"];
const BUILD_2 = ["assets/index-ZZZ.js", "assets/styles-CCC.css"];
const names = async (c: FakeCaches) => (await c.keys()).sort();

describe("service worker: cache cleanup only touches Reading Buddy's own caches", () => {
  it("deletes stale Reading Buddy caches (this scheme and the legacy rb-v1 names) but leaves everything else alone", async () => {
    const old = bootWorker({ bundleFiles: BUILD_1 });
    const next = bootWorker({
      bundleFiles: BUILD_2,
      existing: [
        `reading-buddy-${old.buildId}-shell`, // previous release
        `reading-buddy-${old.buildId}-assets`,
        "rb-v1-shell", // first release's names
        "rb-v1-assets",
        "rb-v1-update-test-fonts",
        "reading-buddy-fonts", // ours, kept across releases
        // not ours — must survive:
        "transformers-cache",
        "workbox-precache-v2-https://reading.example/",
        "my-other-app-v2",
        "rbac-session-cache", // starts with "rb" but isn't ours
        "rb-notes", // "rb-" but not the rb-v<number> legacy pattern
      ],
    });
    await next.run("install");
    await next.run("activate");
    expect(await names(next.caches)).toEqual(
      [
        `reading-buddy-${next.buildId}-assets`,
        `reading-buddy-${next.buildId}-shell`,
        "reading-buddy-fonts",
        "transformers-cache",
        "workbox-precache-v2-https://reading.example/",
        "my-other-app-v2",
        "rbac-session-cache",
        "rb-notes",
      ].sort(),
    );
    expect(next.state.claimed).toBe(1);
  });

  it("never reads from another cache either (it asks for its own shell cache by name)", async () => {
    const w = bootWorker({ bundleFiles: BUILD_1, online: false, existing: ["transformers-cache"] });
    // A foreign cache holds an "/offline.html" — the worker must not serve it.
    await (await w.caches.open("transformers-cache")).put("/offline.html", new Response("FOREIGN"));
    const res = await respond(w, { url: `${ORIGIN}/`, method: "GET", mode: "navigate" });
    expect(res).toBeUndefined(); // nothing of ours cached yet → falls to Response.error(), not the foreign page
  });
});

async function respond(
  w: ReturnType<typeof bootWorker>,
  req: { url: string; method: string; mode?: string },
): Promise<string | undefined> {
  let promise: Promise<Response> | undefined;
  w.listeners["fetch"]?.({
    request: req,
    respondWith: (p: Promise<Response>) => (promise = p),
    waitUntil: () => {},
  });
  if (!promise) return undefined;
  const r = await promise;
  return r.type === "error" ? undefined : await r.text();
}

describe("service worker: updates never interrupt a session", () => {
  let w: ReturnType<typeof bootWorker>;
  beforeEach(() => {
    w = bootWorker({ bundleFiles: BUILD_1 });
  });

  it("installing a new version does not take over by itself", async () => {
    await w.run("install");
    expect(w.state.skipWaitingCalled).toBe(0);
  });

  it("takes over only when the app asks, and ignores other messages", async () => {
    await w.run("install");
    w.listeners["message"]!({ data: { type: "SOMETHING_ELSE" } });
    w.listeners["message"]!({ data: null });
    expect(w.state.skipWaitingCalled).toBe(0);
    w.listeners["message"]!({ data: { type: "SKIP_WAITING" } });
    expect(w.state.skipWaitingCalled).toBe(1);
  });

  it("installing a new version leaves the running version's caches untouched until it activates", async () => {
    const running = bootWorker({ bundleFiles: BUILD_1 });
    await running.run("install");
    await running.run("activate");
    const before = await names(running.caches);
    // Same cache storage, new version installs (but doesn't activate):
    const next = bootWorker({ bundleFiles: BUILD_2, existing: before });
    await next.run("install");
    const afterInstall = await names(next.caches);
    for (const n of before) expect(afterInstall).toContain(n); // nothing of the running version was removed
    expect(afterInstall.length).toBeGreaterThan(before.length); // the new version's caches sit alongside
    await next.run("activate");
    for (const n of before.filter((n) => n.includes(running.buildId)))
      expect(await names(next.caches)).not.toContain(n);
  });

  it("each release uses its own cache names, so a release can't overwrite what the running one serves", async () => {
    const a = bootWorker({ bundleFiles: BUILD_1 });
    const b = bootWorker({ bundleFiles: BUILD_2 });
    expect(a.buildId).not.toBe(b.buildId);
    await a.run("install");
    await b.run("install");
    expect((await names(a.caches)).some((n) => n.includes(b.buildId))).toBe(false);
  });

  it("a failed install (something couldn't be fetched) leaves the current version in charge and caches nothing half-way", async () => {
    const bad = bootWorker({ bundleFiles: BUILD_2, failing: new Set(["/assets/index-ZZZ.js"]) });
    await expect(bad.run("install")).rejects.toThrow();
    expect(bad.state.skipWaitingCalled).toBe(0);
    const assets = bad.caches.map.get(`reading-buddy-${bad.buildId}-assets`);
    expect(assets?.store.size ?? 0).toBe(0);
  });

  it("precaches the exact built files plus the shell, and serves the cached start page when offline", async () => {
    await w.run("install");
    expect([...w.caches.map.get(`reading-buddy-${w.buildId}-assets`)!.store.keys()].sort()).toEqual(
      ["/assets/index-AAA.js", "/assets/styles-CCC.css"],
    );
    expect(await respond(w, { url: `${ORIGIN}/`, method: "GET", mode: "navigate" })).toBe("body:/"); // online: network
    w.online.value = false;
    expect(await respond(w, { url: `${ORIGIN}/`, method: "GET", mode: "navigate" })).toBe("body:/"); // offline: our cached copy
  });

  it("never handles recordings, other origins or non-GET requests", async () => {
    await w.run("install");
    expect(
      await respond(w, { url: "blob:https://reading.example/abc", method: "GET" }),
    ).toBeUndefined();
    expect(
      await respond(w, { url: "https://api.example.com/data", method: "GET" }),
    ).toBeUndefined();
    expect(
      await respond(w, { url: `${ORIGIN}/`, method: "POST", mode: "navigate" }),
    ).toBeUndefined();
  });
});
