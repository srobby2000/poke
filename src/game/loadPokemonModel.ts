import { LoadingManager, TextureLoader } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

const models = new Map<number, Promise<GLTF>>();

/** Cache source scenes only; each displayed Pokémon clones its own skeleton. */
export function loadPokemonModel(number: number): Promise<GLTF> {
  const existing = models.get(number);
  if (existing) return existing;
  const promise = load(number).catch(error => {
    models.delete(number); // A failed request must be retryable.
    throw error;
  });
  models.set(number, promise);
  return promise;
}

async function load(number: number): Promise<GLTF> {
  const controller = new AbortController();
  let phase = "downloading model";
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timed out ${phase}. Check your connection and retry.`));
      controller.abort();
    }, 20000);
  });
  const operation = async () => {
    const url = `${import.meta.env.BASE_URL}models/pokemon/${number}.glb?v=image-v2`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Model request failed (HTTP ${response.status}).`);
    const bytes = await response.arrayBuffer();
    if (new DataView(bytes).getUint32(0, true) !== 0x46546c67) {
      throw new Error("Server returned an invalid model file.");
    }
    phase = "decoding model textures";
    const manager = new LoadingManager();
    let textureFailed = false;
    manager.onError = () => { textureFailed = true; };
    const loader = new GLTFLoader(manager);
    // Use normal <img> decoding. ImageBitmapLoader adds a separate blob fetch
    // and bitmap decoder path that can stall in browser environments.
    loader.register(parser => {
      parser.textureLoader = new TextureLoader(manager);
      return { name: "POKEMON_IMAGE_TEXTURES" };
    });
    const result = await loader.parseAsync(bytes, "");
    if (textureFailed) throw new Error("Could not decode Pokémon textures. Retry loading.");
    return result;
  };
  try { return await Promise.race([operation(), timeout]); }
  finally { clearTimeout(timer!); }
}
