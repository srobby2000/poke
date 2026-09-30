import ReactDOM from "react-dom/client";
import { ModelReview } from "./ModelReview";

// Dev-only page (served at /review.html by `npm run dev`, not part of the build):
// renders Pokémon through the game's own model, material and lighting pipeline.
ReactDOM.createRoot(document.getElementById("root")!).render(<ModelReview />);
