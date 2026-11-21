import test from "node:test";
import assert from "node:assert/strict";
import { mergeChannelSegments, partitionByChannel } from "../src/lib/cacheMerge.ts";

const IDS = ["UC_A", "UC_B", "UC_C"];

const ch = (id) => ({ id, title: `Canal ${id}`, uploadsPlaylistId: `UP_${id}` });
const pl = (id, channelId) => ({ id, channelId, title: `Lista ${id}` });
const vid = (id, channelId) => ({ id, channelId, title: `Vídeo ${id}` });

function baseFixture() {
  return {
    channels: IDS.map(ch),
    playlists: [pl("p1", "UC_A"), pl("p2", "UC_B"), pl("p3", "UC_C")],
    videos: [vid("v1", "UC_A"), vid("v2", "UC_B"), vid("v3", "UC_C")],
  };
}

test("partitionByChannel separa los tres segmentos por channelId", () => {
  const segments = partitionByChannel(baseFixture(), IDS);
  assert.equal(segments.get("UC_A").playlists.length, 1);
  assert.equal(segments.get("UC_B").videos.length, 1);
  assert.equal(segments.get("UC_C").channels.length, 1);
});

test("si un canal falla, conserva su segmento y actualiza los otros dos", () => {
  const base = baseFixture();
  const updates = new Map([
    ["UC_A", { channel: ch("UC_A"), playlists: [pl("p1new", "UC_A")], videos: [vid("v1new", "UC_A")] }],
    ["UC_C", { channel: ch("UC_C"), playlists: [pl("p3new", "UC_C")], videos: [vid("v3new", "UC_C")] }],
  ]);

  const merged = mergeChannelSegments(base, updates, IDS);

  assert.deepEqual(merged.playlists.map((p) => p.id), ["p1new", "p2", "p3new"]);
  assert.deepEqual(merged.videos.map((v) => v.id), ["v1new", "v2", "v3new"]);
  assert.deepEqual(merged.channels.map((c) => c.id), IDS);
  // La base no se muta (función pura).
  assert.deepEqual(base.playlists.map((p) => p.id), ["p1", "p2", "p3"]);
});

test("si fallan todos los canales, el resultado es idéntico a la base", () => {
  const base = baseFixture();
  const merged = mergeChannelSegments(base, new Map(), IDS);
  assert.deepEqual(merged, base);
});

test("un canal nuevo sin datos previos queda con el segmento vacío", () => {
  const base = { channels: [], playlists: [], videos: [] };
  const updates = new Map([
    ["UC_A", { channel: ch("UC_A"), playlists: [pl("p1", "UC_A")], videos: [vid("v1", "UC_A")] }],
  ]);
  const merged = mergeChannelSegments(base, updates, IDS);
  assert.equal(merged.channels.length, 1);
  assert.equal(merged.playlists.length, 1);
  assert.equal(merged.videos.length, 1);
});

test("si no llega la ficha del canal, se conserva la anterior", () => {
  const base = baseFixture();
  const originalChannel = base.channels[0];
  const updates = new Map([
    ["UC_A", { channel: null, playlists: [pl("p1new", "UC_A")], videos: [vid("v1new", "UC_A")] }],
  ]);
  const merged = mergeChannelSegments(base, updates, IDS);
  assert.equal(merged.channels[0], originalChannel);
  assert.equal(merged.channels.length, 3);
});

test("los elementos sin canal configurado no se pierden al recomponer", () => {
  const base = baseFixture();
  base.playlists.push(pl("orphan", "UC_OLD"));
  base.videos.push(vid("orphan-v", "UC_OLD"));
  const merged = mergeChannelSegments(base, new Map(), IDS);
  assert.ok(merged.playlists.some((p) => p.id === "orphan"));
  assert.ok(merged.videos.some((v) => v.id === "orphan-v"));
});
