import { createLogger } from "../../lib/logger.js";

const log = createLogger("embedding");

let pipeline: any = null;

async function getEmbeddingPipeline() {
  if (!pipeline) {
    const timer = log.time("model load (MiniLM)");
    const { pipeline: createPipeline } = await import("@xenova/transformers");
    pipeline = await createPipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    timer.end();
  }
  return pipeline;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const timer = log.time("generate embedding");
  const pipe = await getEmbeddingPipeline();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  const vec = Array.from(output.data as Float32Array);
  timer.end({ dims: vec.length, textLen: text.length });
  return vec;
}
