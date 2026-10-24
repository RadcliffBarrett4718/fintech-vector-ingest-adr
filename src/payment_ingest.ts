import { ingestPayment } from "./fintech_ingest.js";

const sample = { paymentId: "pay_1001", accountId: "acct_42", amount: 12500, currency: "USD", event: "authorized", note: "Card authorization for course tuition" };
const result = await ingestPayment(sample);
console.log(JSON.stringify(result, null, 2));
