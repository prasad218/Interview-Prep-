// The AI model is chosen by the SERVER, never by the browser.
//
// Routes used to accept a `model` value from the request. That was harmless
// while the key could only use free models, but once the OpenRouter account
// has paid credit, anyone logged in could ask for an expensive model and
// spend it. To switch models, set DEFAULT_MODEL in the host's environment
// settings (any model id from openrouter.ai/models).
export function getModel() {
  return process.env.DEFAULT_MODEL || "openrouter/free";
}
