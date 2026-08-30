// Maps an OpenRouter model id's provider prefix ("openai/gpt-4o" -> "openai")
// to a small accent color, used for the model chip attached to each
// assistant message — a quick visual cue of which model answered.
const COLORS = {
  openai: "#74D0A1",
  anthropic: "#F0A93E",
  google: "#6FA8F0",
  "meta-llama": "#7C93F0",
  mistralai: "#F0A93E",
  "x-ai": "#B8BCC8",
  deepseek: "#2DD9C4",
  qwen: "#F0567A",
  cohere: "#C58CF0",
};

export function providerOf(modelId = "") {
  return modelId.split("/")[0] || "unknown";
}

export function providerColor(modelId = "") {
  return COLORS[providerOf(modelId)] || "#8B90A0";
}

export function shortModelName(modelId = "") {
  const parts = modelId.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : modelId;
}
