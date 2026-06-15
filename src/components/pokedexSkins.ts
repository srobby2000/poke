// A Pokédex skin is the device's chrome: a layout shape plus a set of CSS
// custom properties the Pokédex styles read. Reskinning is then mostly a new
// entry here (+ an optional [data-skin="id"] CSS block) — no component changes
// for a pure recolor. Structurally different skins (e.g. a single-screen Rotom
// phone) set a different `layout`, which the component branches on.
export type PokedexLayout = "dual" | "single";

export type PokedexSkin = {
  id: string;
  name: string;
  layout: PokedexLayout;
  vars: Record<string, string>;
};

// Generation VI / Kalos: a clean, light, dual-screen handheld.
const kalos: PokedexSkin = {
  id: "kalos",
  name: "Kalos",
  layout: "dual",
  vars: {
    "--dex-frame": "linear-gradient(155deg, #e9eff7 0%, #c9d6e7 100%)",
    "--dex-edge": "#aebed4",
    "--dex-hinge": "#9fb0c8",
    "--dex-screen": "#f8fbff",
    "--dex-screen-alt": "#e9f1fb",
    "--dex-text": "#1f2937",
    "--dex-muted": "#5b6b80",
    "--dex-accent": "#2f6fb0",
    "--dex-accent-soft": "rgba(47, 111, 176, 0.14)",
    "--dex-line": "rgba(31, 41, 55, 0.14)",
    "--dex-led": "#e23b3b",
  },
};

export const POKEDEX_SKINS: Record<string, PokedexSkin> = { kalos };

// The active skin. Swap this id (or wire it to a setting) to reskin.
export const ACTIVE_POKEDEX_SKIN: PokedexSkin = kalos;
