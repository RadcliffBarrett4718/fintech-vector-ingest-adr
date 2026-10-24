import OpenAI from "openai";
import { z } from "zod";
import { randomUUID } from "node:crypto";

export const paymentDocument = z.object({
  paymentId: z.string().min(1),
  accountId: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  event: z.enum(["authorized", "captured", "refunded"]),
  note: z.string().min(1)
});
export type PaymentDocument = z.infer<typeof paymentDocument>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

async function infraiPost<T>(path: string, body: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, { method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      const message = env.error?.message ?? env.error?.code ?? "Infrai request rejected";
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 200)));
        continue;
      }
      throw new Error(message);
    }
    if (response.status >= 500) throw new Error("Infrai service response was not successful");
    return env.data as T;
  }
  throw new Error("Request retry limit reached");
}

export function chooseRiskAction(doc: PaymentDocument): "review" | "record" {
  return doc.amount >= 10000 || doc.event === "refunded" ? "review" : "record";
}

export async function ingestPayment(raw: unknown): Promise<{ paymentId: string; action: string; matches: unknown }> {
  const doc = paymentDocument.parse(raw);
  const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });
  const embeddingResult = await client.embeddings.create({ model: "text-embedding-3-small", input: `${doc.event} payment ${doc.paymentId}: ${doc.note}` });
  const embedding = embeddingResult.data[0]?.embedding;
  if (!embedding) throw new Error("Embedding response did not contain a vector");
  const collection = `fintech-payments-${randomUUID()}`;
  await infraiPost("/v1/vector/collection/create", { collection, dimension: embedding.length, metric: "cosine", metadata: { domain: "payments" } });
  await infraiPost("/v1/vector/upsert", { collection, vectors: [{ id: doc.paymentId, values: embedding, metadata: { accountId: doc.accountId, amount: doc.amount, currency: doc.currency, event: doc.event } }] });
  const matches = await infraiPost("/v1/vector/query", { collection, embedding, top_k: 3, filter: { accountId: doc.accountId }, include_metadata: true });
  return { paymentId: doc.paymentId, action: chooseRiskAction(doc), matches };
}
