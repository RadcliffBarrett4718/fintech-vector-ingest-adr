import assert from "node:assert/strict";
import { chooseRiskAction, paymentDocument, type PaymentDocument } from "../src/fintech_ingest.js";

const highValue = { paymentId: "p1", accountId: "a1", amount: 12000, currency: "USD", event: "authorized", note: "tuition" } satisfies PaymentDocument;
assert.equal(paymentDocument.parse(highValue).paymentId, "p1");
assert.equal(chooseRiskAction(highValue), "review");
assert.equal(chooseRiskAction({ ...highValue, amount: 25, event: "captured" }), "record");
console.log("payment risk decision test passed");
