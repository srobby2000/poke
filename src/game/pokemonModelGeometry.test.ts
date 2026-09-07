import { describe, expect, it } from "vitest";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { removeCoincidentTriangles } from "./pokemonModelGeometry";

describe("wing surface repair", () => {
  it("removes opposite-winding duplicates while retaining adjacent faces and source geometry", () => {
    const source = new BufferGeometry();
    source.setAttribute("position", new Float32BufferAttribute([0,0,0, 1,0,0, 0,1,0, 1,1,0], 3));
    source.setIndex([0,1,2, 2,1,0, 1,3,2]);
    const repaired = removeCoincidentTriangles(source);
    expect(Array.from(repaired.index!.array)).toEqual([0,1,2,1,3,2]);
    expect(source.index!.count).toBe(9);
    expect(repaired.getAttribute("position").count).toBe(4);
  });
});
