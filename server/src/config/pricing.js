// Shared pricing/credit constants. Both routes/liveInterview.js (spends
// credits) and routes/redeem.js (grants credits on a valid code) import
// from here so the numbers can never drift apart.

export const CREDIT_COST_PER_INTERVIEW = 50;
export const PAID_PACK_CREDITS = 200; // 4 more sessions
export const PAID_PACK_PRICE_INR = 90;
export const PAID_PACK_USES = PAID_PACK_CREDITS / CREDIT_COST_PER_INTERVIEW;

export const PAYMENT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeXnkzMsXsFTIGe4tGDe5RwpUAO0sKowMgY_GPJ9NFR0vUYlA/viewform";
