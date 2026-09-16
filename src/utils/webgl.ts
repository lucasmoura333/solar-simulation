import type { WebGLStatus } from "../types";

export function detectWebGL2(): WebGLStatus {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    return gl instanceof WebGL2RenderingContext ? "webgl2" : "unsupported";
  } catch {
    return "unsupported";
  }
}
