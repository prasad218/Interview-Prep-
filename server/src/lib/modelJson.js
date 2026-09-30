// Free/smaller models are inconsistent about returning clean JSON even when
// asked to: some wrap it in ```json fences, some add a sentence of prose
// before or after it, some leave a trailing comma. This module centralizes
// the "make a best effort to extract valid JSON from model text" logic that
// used to be duplicated (with slightly different bugs) in every route.

/**
 * Scans `text` starting at the first "{" and returns the substring up to
 * its matching closing "}", tracking string/escape state so braces inside
 * quoted strings don't throw off the count. This is more reliable than a
 * greedy regex when the model adds trailing prose that happens to contain
 * its own braces.
 */
function extractBalancedObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null; // never closed — response was likely truncated
}

/** Removes trailing commas before a closing } or ], which JSON.parse rejects
 * but weaker models produce fairly often. */
function stripTrailingCommas(jsonText) {
  return jsonText.replace(/,(\s*[}\]])/g, "$1");
}

/**
 * Best-effort parse of a model's text response into a JSON value.
 * Throws a clear, user-facing Error if nothing usable can be recovered.
 */
export function parseModelJSON(raw) {
  let cleaned = (raw || "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  if (!cleaned) {
    throw new Error("The model returned an empty response.");
  }

  // Fast path: the whole thing is already valid JSON.
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through to recovery attempts
  }

  const balanced = extractBalancedObject(cleaned);
  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch {
      try {
        return JSON.parse(stripTrailingCommas(balanced));
      } catch {
        // fall through
      }
    }
  }

  throw new Error(
    "The model's response wasn't valid JSON. This can happen with free/shared " +
      "models under load — please try again."
  );
}
