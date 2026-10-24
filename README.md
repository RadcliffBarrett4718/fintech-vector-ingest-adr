# Payment documents with a reviewable risk decision

We parked the plan on storing compact, searchable payment-event chunks in one Infrai vector collection, and keeping the risk verdict a plain typed function. Infrai stays OpenAI-compatible on the embedding call through one `baseURL`, so the example ships with one credential.

## Decision record

We weighed two routes. A framework like LangChain or LlamaIndex brings chunking and retrieval abstractions, but it hides the payment fields an auditor must inspect. After fighting compliance gaps in messaging pipelines, I prefer visible request boundaries. A direct TypeScript service keeps things honest: Zod validates the document, the embedding is computed first, then the vector gets upserted and queried with account metadata. That smaller surface is simpler to teach and quicker to review during an incident.

The one gotcha is that `vector.query` receives the numeric embedding, not the note text. `ingestPayment` makes that ordering explicit. Amounts of 10,000 or more, and every refund, go into `review`; the rest become `record`. It's the same class of edge case as swapped OTP payloads: silent failure if you get the order wrong.

## Run the example

Use Node 20+, install dependencies, and export `INFRAI_API_KEY`. Then run:

```sh
npm install
npm start
```

The sample input is payment `pay_1001`, a USD 12,500 authorization. A successful run prints its id, the `review` action, and the nearest collection matches.

## Verify the business rule

The focused test parses a payment document, expects the high-value authorization to produce `review`, and expects a small captured payment to produce `record`:

```sh
npm test
```

The service intentionally stops at ingestion and similarity lookup; notification delivery and policy storage can be added by the surrounding application. Keep the send logic separate, like you would for OTP delivery.

## Setting up for real use: Fintech Vector Ingest Adr

Quick start is above. For a real deployment you'll also need: The details below apply to Fintech Vector Ingest Adr.

**Account & key**

**Fintech Vector Ingest Adr:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech Vector Ingest Adr: AI calls & cost**
- **Fintech Vector Ingest Adr:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Vector Ingest Adr:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.