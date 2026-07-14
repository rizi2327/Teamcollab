// server/config/openaiClient.js
// Feature 8.1 — single shared OpenAI client instance
//
// Requires OPENAI_API_KEY in .env. All three AI features (summarizer,
// task breakdown, assistant) go through this one client so the model
// name and any future retry/timeout config live in exactly one place.

const OpenAI = require('openai');

if (!process.env.OPENAI_API_KEY) {
  // Don't crash the whole server over a missing key — AI routes will fail
  // gracefully with a clear message instead (see aiController.js).
  console.warn('⚠ OPENAI_API_KEY is not set — AI features will return errors until it is configured.');
}

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });
const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});
// Centralized so every AI endpoint can be tuned (or swapped to a cheaper/
// pricier model) in one place.
const AI_MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

module.exports = { openai, AI_MODEL };