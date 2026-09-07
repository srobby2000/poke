import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";

/** Observe only the mounted scene, not Fiber's intentional context disposal. */
export function SceneContextStatus() {
  const gl = useThree(state => state.gl);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (event: Event) => { event.preventDefault(); setLost(true); };
    const onRestored = () => { setLost(false); };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [gl]);
  return <Html center position={[0, 2, 0]} zIndexRange={[100, 90]}>
    {lost && <span className="pokemon-model-status" role="alert">3D graphics interrupted. Waiting for the browser to restore graphics. If this remains, reload the page.</span>}
  </Html>;
}
