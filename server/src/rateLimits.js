// Rate limits: protect the AI quota, slow down password/code guessing, and
// stop scripts from hammering the server.
//
// Design notes
//  * Logged-in traffic is counted PER ACCOUNT, not per IP. Students on one
//    college wifi share an IP, so IP-only limits would block a whole class.
//  * Login guessing is counted per login code, so someone mistyping their
//    own password can never lock out anybody else.
//  * IP-based limits exist only as generous backstops. If the proxy hop count
//    is misconfigured (see TRUST_PROXY_HOPS in index.js) every visitor would
//    look like one IP, so these must never be tight enough to hurt then.
//  * Every number can be changed with an environment variable, and
//    DISABLE_RATE_LIMITS=1 turns the whole thing off without a code change.

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { verifyToken } from "./auth.js";

const int = (name, fallback) => {
  const n = parseInt(process.env[name], 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const WINDOW_MS = int("RATE_WINDOW_MINUTES", 15) * 60 * 1000;
const DISABLED = process.env.DISABLE_RATE_LIMITS === "1";
const passThrough = (req, res, next) => next();

function ipKey(req) {
  return `ip:${ipKeyGenerator(req.ip || "unknown")}`;
}

/** Signed-in user's id when a valid token is sent, otherwise the caller's IP. */
function userOrIpKey(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    try {
      const { sub } = verifyToken(header.slice(7));
      if (sub) return `user:${sub}`;
    } catch {
      // invalid/expired token — fall through to the IP
    }
  }
  return ipKey(req);
}

function make(options) {
  if (DISABLED) return passThrough;
  const { message, ...rest } = options;
  return rateLimit({
    windowMs: WINDOW_MS,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: message },
    ...rest,
  });
}

// Everything under /api — a loose ceiling that only a script would reach.
export const generalLimiter = make({
  limit: int("RATE_GENERAL_MAX", 600),
  keyGenerator: userOrIpKey,
  message: "Too many requests. Please slow down and try again in a few minutes.",
});

// Requests that call the AI model. Per account, plus a high per-IP backstop
// against someone creating many accounts from one place.
export const aiUserLimiter = make({
  limit: int("RATE_AI_USER_MAX", 40),
  keyGenerator: userOrIpKey,
  message: "You're going a bit fast. Please wait a few minutes and try again.",
});
export const aiIpLimiter = make({
  limit: int("RATE_AI_IP_MAX", 600),
  keyGenerator: ipKey,
  message: "Too many requests from this network. Please try again in a few minutes.",
});

// Wrong-password guessing, counted per login code. Successful logins are
// not counted, so normal use never gets close to the limit.
export const loginLimiter = make({
  limit: int("RATE_LOGIN_MAX", 10),
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const code = String(req.body?.loginCode || "").trim().toUpperCase();
    return code ? `acct:${code}` : ipKey(req);
  },
  message: "Too many failed sign-in attempts for this account. Please wait a few minutes and try again.",
});
export const loginIpLimiter = make({
  limit: int("RATE_LOGIN_IP_MAX", 200),
  skipSuccessfulRequests: true,
  keyGenerator: ipKey,
  message: "Too many failed sign-in attempts. Please wait a few minutes and try again.",
});

// New accounts. Generous, because a class can sign up from one shared IP.
export const signupLimiter = make({
  limit: int("RATE_SIGNUP_MAX", 200),
  windowMs: 60 * 60 * 1000,
  keyGenerator: ipKey,
  message: "Too many new accounts from this network. Please try again later.",
});

// Wrong redemption codes and wrong admin secrets: only failures count.
export const failureLimiter = make({
  limit: int("RATE_FAILURE_MAX", 15),
  skipSuccessfulRequests: true,
  keyGenerator: userOrIpKey,
  message: "Too many failed attempts. Please wait a few minutes and try again.",
});
