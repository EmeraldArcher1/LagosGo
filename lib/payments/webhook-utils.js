"use strict";

function parseJsonBuffer(rawBody) {
  if (!Buffer.isBuffer(rawBody)) throw new TypeError("raw_webhook_body_required");
  return JSON.parse(rawBody.toString("utf8"));
}

function normalizeHeaders(headers = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) normalized[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
  return normalized;
}

async function readRawBody(req, maxBytes = 1024 * 1024) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (Buffer.isBuffer(req.bodyRaw)) return req.bodyRaw;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new Error("webhook_body_too_large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

module.exports = { parseJsonBuffer, normalizeHeaders, readRawBody };
