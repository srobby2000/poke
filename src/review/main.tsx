import ReactDOM from "react-dom/client";
import type { BattleArena } from "../game/battleArenas";
import "../styles.css";
import { BattleReview } from "./BattleReview";
import { ModelReview } from "./ModelReview";

// Dev-only page (served at /review.html by `npm run dev`, not part of the build): renders
// Pokémon, and battles, through the game's own components.
const params = new URLSearchParams(location.search);
const battle = params.get("battle") as BattleArena | null;
ReactDOM.createRoot(document.getElementById("root")!).render(battle ? <BattleReview arena={battle} wild={params.has("wild")} /> : <ModelReview />);
