import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  readCachedPlaylistVideos,
  writeCachedPlaylistVideos,
} from "../src/lib/playlistVideosCache.ts";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vods-plcache-"));

const video = (id) => ({
  id,
  title: `Vídeo ${id}`,
  thumbnail: "x",
  channelId: "UC_A",
  channelTitle: "Canal A",
  descr: "",
  duration: "00:01",
});

test("escribe y lee los vídeos completos de una playlist", () => {
  const videos = [video("v1"), video("v2")];
  writeCachedPlaylistVideos("PL_OK", videos, dir);
  assert.deepEqual(readCachedPlaylistVideos("PL_OK", dir), videos);
});

test("un fichero ausente devuelve null", () => {
  assert.equal(readCachedPlaylistVideos("PL_MISSING", dir), null);
});

test("un JSON corrupto devuelve null y no lanza", () => {
  fs.writeFileSync(path.join(dir, "PL_BROKEN.json"), "{no es json", "utf-8");
  assert.equal(readCachedPlaylistVideos("PL_BROKEN", dir), null);
});

test("un array con entradas inválidas devuelve null", () => {
  fs.writeFileSync(path.join(dir, "PL_BAD.json"), JSON.stringify([{ nope: 1 }]), "utf-8");
  assert.equal(readCachedPlaylistVideos("PL_BAD", dir), null);
});

test("sobrescribir refresca los vídeos de la lista", () => {
  writeCachedPlaylistVideos("PL_UPDATE", [video("old")], dir);
  writeCachedPlaylistVideos("PL_UPDATE", [video("new1"), video("new2")], dir);
  assert.deepEqual(
    readCachedPlaylistVideos("PL_UPDATE", dir).map((v) => v.id),
    ["new1", "new2"]
  );
});

test("no se escribe nada para una lista vacía", () => {
  writeCachedPlaylistVideos("PL_EMPTY", [], dir);
  assert.equal(readCachedPlaylistVideos("PL_EMPTY", dir), null);
});

test("ids con path traversal se ignoran", () => {
  writeCachedPlaylistVideos("../escape", [video("v1")], dir);
  assert.equal(readCachedPlaylistVideos("../escape", dir), null);
  assert.equal(fs.existsSync(path.join(dir, "..", "escape.json")), false);
});
