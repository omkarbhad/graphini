import { pipeline } from '@xenova/transformers';
import { chatDB, type EmbeddingRecord } from './db';

// Use a flexible type since FeatureExtractionPipeline doesn't extend Pipeline
type EmbeddingPipeline = Awaited<ReturnType<typeof pipeline>>;

let embeddingPipeline: EmbeddingPipeline | null = null;

async function getEmbeddingPipeline(): Promise<EmbeddingPipeline> {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embeddingPipeline;
}

export async function generateEmbedding(text: string): Promise<Float32Array> {
  const pipe = await getEmbeddingPipeline();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = await (pipe as any)(text, { pooling: 'mean', normalize: true });
  return output.data as Float32Array;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SearchResult {
  id: string;
  messageId?: string | null;
  contextId?: string | null;
  score: number;
  metadata?: Record<string, unknown> | null;
}

export async function searchSimilarEmbeddings(
  queryText: string,
  options: {
    topK?: number;
    conversationId?: string;
    threshold?: number;
  } = {}
): Promise<SearchResult[]> {
  const { topK = 5, conversationId, threshold = 0.5 } = options;

  const queryVector = await generateEmbedding(queryText);

  let embeddings: EmbeddingRecord[];
  if (conversationId) {
    const messages = await chatDB.messages.where({ conversationId }).toArray();
    const messageIds = messages.map((m) => m.id);
    embeddings = await chatDB.embeddings.where('messageId').anyOf(messageIds).toArray();
  } else {
    embeddings = await chatDB.embeddings.toArray();
  }

  const results: SearchResult[] = embeddings
    .map((embedding) => ({
      contextId: embedding.contextId,
      id: embedding.id,
      messageId: embedding.messageId,
      metadata: embedding.metadata,
      score: cosineSimilarity(queryVector, embedding.vector)
    }))
    .filter((result) => result.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results;
}

export async function embedAndStoreMessage(
  messageId: string,
  text: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const vector = await generateEmbedding(text);
  const record: EmbeddingRecord = {
    createdAt: Date.now(),
    id: crypto.randomUUID(),
    messageId,
    metadata: metadata ?? null,
    vector
  };
  await chatDB.embeddings.put(record);
}

export async function embedAndStoreContext(
  contextId: string,
  text: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const vector = await generateEmbedding(text);
  const record: EmbeddingRecord = {
    contextId,
    createdAt: Date.now(),
    id: crypto.randomUUID(),
    metadata: metadata ?? null,
    vector
  };
  await chatDB.embeddings.put(record);
}
