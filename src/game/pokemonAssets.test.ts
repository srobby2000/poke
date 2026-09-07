import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { POKEMON_MODELS } from "./pokemonModels";

describe("bundled Pokémon GLBs", () => {
  it("ships every audited species with embedded meshes, textures, and matching checksums", () => {
    const audit = JSON.parse(readFileSync("docs/pokemon-model-audit.json", "utf8"));
    for (const [species, model] of Object.entries(POKEMON_MODELS)) {
      const bytes = readFileSync(`public/models/pokemon/${model.number}.glb`);
      expect(bytes.toString("utf8", 0, 4), species).toBe("glTF");
      expect(bytes.readUInt32LE(4), species).toBe(2);
      expect(bytes.readUInt32LE(8), species).toBe(bytes.length);
      const document = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
      expect(document.meshes.length, species).toBeGreaterThan(0);
      expect(document.extensionsRequired ?? [], species).not.toContain("KHR_draco_mesh_compression");
      expect(document.extensionsRequired ?? [], species).not.toContain("EXT_texture_webp");
      for (const image of document.images ?? []) expect(image.mimeType, species).toBe("image/png");
      for (const image of document.images ?? []) expect(image.uri, species).toBeUndefined();
      for (const buffer of document.buffers) expect(buffer.uri, species).toBeUndefined();
      expect(createHash("sha256").update(bytes).digest("hex"), species).toBe(audit.models.find((row: { number: number }) => row.number === model.number).sha256);
    }
  });
});
