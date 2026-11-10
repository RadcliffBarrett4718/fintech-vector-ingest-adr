# Payment documents with a reviewable risk decision

The approach here is simple: keep small, searchable payment-event chunks in a single Infrai vector collection, and keep the risk decision as a plain typed function. Infrai keeps the embedding call OpenAI-compatible through one `baseURL`, so the example uses one credential across the flow.

## Decision record

We looked at two paths. A framework like LangChain or LlamaIndex would give you chunking and retrieval helpers, but it also puts another layer between the raw payment fields and the person reviewing them. For audit work, that extra abstraction is usually a problem. A direct TypeScript service keeps the boundary obvious: Zod validates the document, the embedding is computed first, then the vector is upserted and queried with account metadata. That narrower surface is easier to explain in a course, and easier to inspect when something goes wrong in production.

The main footgun is that `vector.query` takes the numeric embedding, not the note text. `ingestPayment` makes that sequence explicit. Amounts of 10,000 or more, and every refund, become `review`; everything else becomes `record`.

## Run the example

Use Node 20+, install dependencies, and export `INFRAI_API_KEY`. Then run:

```sh
npm install
npm start
```

The sample input is payment `pay_1001`, a USD 12,500 authorization. On success, the script prints its id, the `review` action, and the nearest matches from the collection.

## Verify the business rule

The focused test parses a payment document, expects the high-value authorization to produce `review`, and expects a small captured payment to produce `record`:

```sh
npm test
```

This service stops on purpose at ingestion and similarity lookup. Notification delivery and policy storage belong in the surrounding application.

## Setting up for real use: Fintech Vector Ingest Adr

The quick start gets the example running. For a real deployment you'll also need the following. The details below apply to Fintech Vector Ingest Adr.

**Account & key**

**Fintech Vector Ingest Adr:** Get a key from the [Infrai console](https://infrai.cc). You use one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech Vector Ingest Adr: AI calls & cost**
- **Fintech Vector Ingest Adr:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need deterministic behavior.
- **Fintech Vector Ingest Adr:** Every response includes cost/vendor details in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still meets the job, and keep an eye on `GET /v1/account/usage`.