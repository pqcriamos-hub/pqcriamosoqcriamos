import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { isPublicLive, isReleaseRelated, scheduleReleaseBundle } from "../src/lib/release-schedule";

const now = Date.parse("2026-10-22T10:18:00Z");
const publishAt = "2026-10-22T22:00:00Z";
const episode = { id: "t01ep12", code: "T01EP12", artistId: "artista", publishAt };

describe("Estreia conjunta", () => {
  it("libera no horário exato e mantém conteúdo legado visível", () => {
    assert.equal(isPublicLive({ publishAt }, now), false);
    assert.equal(isPublicLive({ publishAt }, Date.parse(publishAt)), true);
    assert.equal(isPublicLive({}, now), true);
    assert.equal(isPublicLive({ published: false, publishAt }, Date.parse(publishAt)), false);
  });
  it("programa artista novo, obras e acervo relacionado juntos sem publicar rascunhos", () => {
    const result = scheduleReleaseBundle(episode, undefined,
      [{ id: "artista", published: false, portfolioItems: [{ id: "obra" }] }],
      [{ id: "geral", items: [{ id: "vinculado", episode: "T01EP12" }, { id: "outro", episode: "T01EP11" }, { id: "rascunho", episode: "T01EP12", published: false }] }],
      { artist: true, acervo: true }, now);
    assert.equal(result.artists[0].publishAt, publishAt);
    assert.equal(result.artists[0].published, false);
    assert.equal(result.artists[0].portfolioItems?.[0].publishAt, publishAt);
    assert.equal(result.cards[0].items?.[0].publishAt, publishAt);
    assert.equal(result.cards[0].items?.[1].publishAt, undefined);
    assert.equal(result.cards[0].items?.[2].published, false);
    assert.equal(result.cards[0].publishAt, undefined);
  });
  it("preserva artista e obras já no ar", () => {
    const result = scheduleReleaseBundle(episode, undefined, [{ id: "artista", portfolioItems: [{ id: "antiga" }] }], [], { artist: true, acervo: true }, now);
    assert.equal(result.artists[0].publishAt, undefined);
    assert.equal(result.artists[0].portfolioItems?.[0].publishAt, undefined);
  });
  it("EP00 não altera artista nem acervo", () => {
    const artists = [{ id: "artista", published: false }];
    const cards = [{ id: "card", artistId: "artista" }];
    const result = scheduleReleaseBundle({ ...episode, id: "t01ep00", code: "T01EP00" }, undefined, artists, cards, { artist: true, acervo: true }, now);
    assert.equal(result.artists, artists);
    assert.equal(result.cards, cards);
  });
  it("remover e alterar data sincroniza registros vinculados", () => {
    const artists = [{ id: "artista", publishAt, portfolioItems: [{ id: "obra", publishAt }] }];
    const cards = [{ id: "card", episode: "T01EP12", publishAt }];
    const result = scheduleReleaseBundle({ ...episode, publishAt: undefined }, episode, artists, cards, { artist: true, acervo: true }, now);
    assert.equal(result.artists[0].publishAt, undefined);
    assert.equal(result.artists[0].portfolioItems?.[0].publishAt, undefined);
    assert.equal(result.cards[0].publishAt, undefined);
    const changed = scheduleReleaseBundle({ ...episode, publishAt: "2026-10-23T22:00:00Z" }, episode, artists, cards, { artist: true, acervo: true }, now);
    assert.equal(changed.cards[0].publishAt, "2026-10-23T22:00:00Z");
  });
  it("vínculo exige código completo, id, slug ou artista exato", () => {
    assert.equal(isReleaseRelated({ episode: "T01EP12" }, episode), true);
    assert.equal(isReleaseRelated({ episode: "EP12" }, episode), false);
    assert.equal(isReleaseRelated({ artistId: "artista" }, episode, "artista"), true);
  });
});