/** Trail mounts are loaned by the village; they do not change the battle team.
 * The rider sits on a saddle measured from the mount's body (see mountSeat). */
export const RIDE_POKEMON = {
  arcanine: { name: "Arcanine", speed: 1.5, modelScale: 1.3 },
  rapidash: { name: "Rapidash", speed: 1.75, modelScale: 2.0 },
} as const;
export type RideSpecies = keyof typeof RIDE_POKEMON;
export function isRideSpecies(value: string): value is RideSpecies {
  return Object.prototype.hasOwnProperty.call(RIDE_POKEMON, value);
}
/** Height of the trainer's thigh undersides above their feet in the riding pose. */
export const TRAINER_SEAT_HEIGHT = 0.66;
