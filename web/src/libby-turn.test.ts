import { test } from "node:test";
import assert from "node:assert/strict";

import type { ChatConversation, StoredChatMessage } from "./api.ts";
import {
  EventStreamParser, applyHerReaction, applyTurnState, cameraPhaseLabel, isStageDirection,
  parseEventBlock, picturesOf, unsentMessages, upsertMessage,
} from "./libby-turn.ts";

const msg = (id: string, at: number, role: "user" | "assistant" = "assistant", content = id): StoredChatMessage =>
  ({ id, at, role, content });

// Chunks from a stream break anywhere; an event is only an event once its blank line
// has arrived, and then it arrives exactly once.
test("an event split across chunks arrives once, whole", () => {
  const parser = new EventStreamParser();
  assert.deepEqual(parser.feed('event: message\ndata: {"messa'), []);
  assert.deepEqual(parser.feed('ge":{"id":"a"}}\n\nevent: done\ndata: {"rev":3}\n\n'), [
    { event: "message", data: { message: { id: "a" } } },
    { event: "done", data: { rev: 3 } },
  ]);
});

test("CRLF line endings read the same as LF", () => {
  assert.deepEqual(new EventStreamParser().feed("event: state\r\ndata: {\"emotion\":\"shy\"}\r\n\r\n"),
    [{ event: "state", data: { emotion: "shy" } }]);
});

test("a comment or a block with no data is not an event", () => {
  assert.equal(parseEventBlock(": keepalive"), null);
  assert.equal(parseEventBlock("event: nothing"), null);
});

// The server resends a message it amended — an offer added to it, her mood stamped on
// it — so the same id arriving twice must replace, never repeat.
test("a message that arrives twice is replaced, not repeated", () => {
  const log = [msg("a", 1), msg("b", 2)];
  upsertMessage(log, { ...msg("b", 2), actions: [{ id: "x", kind: "tag", label: "Add tags", detail: "" }] });
  assert.equal(log.length, 2);
  assert.equal(log[1].actions?.length, 1);
});

test("a message lands in time order even when it arrives late", () => {
  const log = [msg("a", 1), msg("c", 3)];
  upsertMessage(log, msg("b", 2));
  assert.deepEqual(log.map((m) => m.id), ["a", "b", "c"]);
});

test("her reaction replaces her last one and leaves yours", () => {
  const log = [{ ...msg("u", 1, "user"), reactions: [{ emoji: "😂", by: "user" as const }, { emoji: "👀", by: "assistant" as const }] }];
  applyHerReaction(log, "u", "❤️");
  assert.deepEqual(log[0].reactions, [{ emoji: "😂", by: "user" }, { emoji: "❤️", by: "assistant" }]);
});

test("the settled state lands on the conversation and on her last bubble", () => {
  const conversation = { id: "c", characterId: "libby", title: "", mode: "sweet", emotion: "neutral", intensity: 1,
    messages: [msg("a", 1)], createdAt: 0, updatedAt: 0, rev: 2 } as ChatConversation;
  applyTurnState(conversation, { emotion: "shy", intensity: 3, activity: "reading", background: "", wearing: "nothing", messageId: "a", rev: 5 });
  assert.equal(conversation.emotion, "shy");
  assert.equal(conversation.wearing, "nothing");
  assert.equal(conversation.rev, 5);
  assert.equal(conversation.messages[0].mood, "shy");
  assert.equal(conversation.messages[0].heat, 3);
});

test("a set is its pictures and a single picture is itself", () => {
  assert.deepEqual(picturesOf({ ...msg("a", 1), imageId: "1", images: ["1", "2"] }), ["1", "2"]);
  assert.deepEqual(picturesOf({ ...msg("a", 1), imageId: "1" }), ["1"]);
  assert.deepEqual(picturesOf(msg("a", 1)), []);
});

// A picture sent without a word carries a placeholder so the log never holds an empty
// message; drawn, it is the picture, not a line of italics.
test("only the placeholder a picture carries reads as a stage direction", () => {
  assert.equal(isStageDirection("*sends a picture*"), true);
  assert.equal(isStageDirection("*hands over Night Drive*"), true);
  assert.equal(isStageDirection("*sends you a kiss* miss you"), false);
  assert.equal(isStageDirection("hey"), false);
});

test("a turn sends only what you wrote since her last message", () => {
  const log = [msg("u1", 1, "user"), msg("a1", 2), msg("u2", 3, "user"), msg("u3", 4, "user")];
  assert.deepEqual(unsentMessages(log).map((m) => m.id), ["u2", "u3"]);
});

test("the camera's phases read as what she is doing", () => {
  assert.equal(cameraPhaseLabel("generating", 3), "Taking 3 shots…");
  assert.equal(cameraPhaseLabel("judging"), "Picking the best one…");
});
