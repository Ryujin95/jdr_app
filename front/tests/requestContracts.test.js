import test from "node:test";
import assert from "node:assert/strict";
import {
  ApiError,
  buildRelationshipStarsPayload,
  apiErrorFromResponse,
  createApiFetchRequest,
  prepareMapCreateFormData,
  saveRelationshipStars,
} from "../src/api/requestContracts.js";

test("API errors preserve status and machine code while exposing a safe message", () => {
  const error = new ApiError("Erreur serveur.", {
    status: 500,
    code: "server_error",
    errorId: "abc123",
  });

  assert.equal(error.message, "Erreur serveur.");
  assert.equal(error.status, 500);
  assert.equal(error.code, "server_error");
  assert.equal(error.errorId, "abc123");
});

test("API error responses retain useful client status without exposing server details", async () => {
  const error = await apiErrorFromResponse({
    status: 500,
    json: async () => ({ message: "SQL password=secret", code: "server_error", errorId: "ref-1" }),
  }, "fallback");

  assert.equal(error.message, "Erreur serveur.");
  assert.equal(error.status, 500);
  assert.equal(error.code, "server_error");
  assert.equal(error.errorId, "ref-1");
});

test("map create request keeps multipart fields and file while adding campaignId", () => {
  const form = new FormData();
  const image = new Blob(["image-bytes"], { type: "image/png" });
  form.set("name", "North map");
  form.set("image", image, "north.png");

  const body = prepareMapCreateFormData("42", form);
  const request = createApiFetchRequest("https://api.example.test", "/maps", {
    token: "test-token",
    method: "POST",
    body,
  });

  assert.equal(body, form);
  assert.equal(body.get("name"), "North map");
  assert.equal(body.get("campaignId"), "42");
  assert.equal(body.get("image").name, "north.png");
  assert.equal(body.get("image").type, "image/png");
  assert.equal(request.url, "https://api.example.test/maps");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.body, form);
  assert.equal(request.init.headers.Authorization, "Bearer test-token");
  assert.equal(Object.keys(request.init.headers).some((key) => key.toLowerCase() === "content-type"), false);
});

test("relationship update sends the field name consumed by the API", () => {
  const payload = buildRelationshipStarsPayload(11, 22, 4);
  const request = createApiFetchRequest("https://api.example.test", "/mj/relationships?campaignId=7", {
    method: "PATCH",
    body: payload,
  });

  assert.deepEqual(JSON.parse(request.init.body), {
    fromCharacterId: 11,
    toCharacterId: 22,
    relationshipStars: 4,
  });
  assert.equal(request.init.headers["Content-Type"], "application/json");
});

test("relationship UI state changes only after a persisted response", async () => {
  let state = { 11: [{ id: 22, relationshipStars: 1 }] };
  let resolveRequest;
  const pending = saveRelationshipStars({
    send: () => new Promise((resolve) => { resolveRequest = resolve; }),
    setKnownMap: (update) => { state = update(state); },
    fromId: 11,
    toId: 22,
  });

  assert.equal(state[11][0].relationshipStars, 1);
  resolveRequest({ relationshipStars: 5 });
  await pending;
  assert.equal(state[11][0].relationshipStars, 5);
});

test("relationship UI state remains unchanged after a network or server failure", async () => {
  let state = { 11: [{ id: 22, relationshipStars: 1 }] };
  await assert.rejects(saveRelationshipStars({
    send: async () => { throw new Error("HTTP 500"); },
    setKnownMap: (update) => { state = update(state); },
    fromId: 11,
    toId: 22,
  }), /HTTP 500/);
  assert.equal(state[11][0].relationshipStars, 1);
});
