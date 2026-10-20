import test from "node:test";
import assert from "node:assert/strict";
import { buildCharacterUpdateFields } from "../src/characterUpdatePayload.js";

const form = (overrides = {}) => ({
  nickname: "  Rowan  ",
  firstname: "Rowan",
  lastname: "Vale",
  age: "34",
  biography: "Updated story",
  strengths: "",
  weaknesses: "",
  secret: "",
  clan: "",
  isPlayer: true,
  ownerUserId: "27",
  ...overrides,
});

test("an unchanged owner is omitted from a text-only update", () => {
  const fields = buildCharacterUpdateFields(form(), "27");

  assert.equal(fields.nickname, "Rowan");
  assert.equal(Object.hasOwn(fields, "ownerUserId"), false);
});

test("a selected owner is sent only when it changes", () => {
  const fields = buildCharacterUpdateFields(form({ ownerUserId: "31" }), "27");

  assert.equal(fields.ownerUserId, "31");
});

test("clearing an existing owner sends an explicit empty value", () => {
  const fields = buildCharacterUpdateFields(form({ ownerUserId: "" }), "27");

  assert.equal(Object.hasOwn(fields, "ownerUserId"), true);
  assert.equal(fields.ownerUserId, "");
});

test("turning a player character into an NPC explicitly clears its owner", () => {
  const fields = buildCharacterUpdateFields(form({ isPlayer: false, ownerUserId: "" }), "27");

  assert.equal(fields.isPlayer, "false");
  assert.equal(fields.ownerUserId, "");
});

test("an unassigned NPC does not send an unnecessary owner change", () => {
  const fields = buildCharacterUpdateFields(form({ isPlayer: false, ownerUserId: "" }), "");

  assert.equal(Object.hasOwn(fields, "ownerUserId"), false);
});
