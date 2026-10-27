import { test } from "node:test";
import assert from "node:assert/strict";

const { detailerModels, passesFromModels, fixLabel, HAND_DETECTOR, DEFAULT_FACE_DETECTOR } = await import("./detailer.ts");

test("faces and hands are sent as two passes, faces first", () => {
  assert.deepEqual(detailerModels({ faces: true, faceModel: "face_yolov8s.pt", hands: true }), ["face_yolov8s.pt", HAND_DETECTOR]);
  assert.deepEqual(detailerModels({ faces: false, faceModel: "face_yolov8s.pt", hands: true }), [HAND_DETECTOR]);
  assert.deepEqual(detailerModels({ faces: false, faceModel: "", hands: false }), []);
});

test("a face pass with no detector chosen uses the fast one", () => {
  assert.deepEqual(detailerModels({ faces: true, faceModel: "", hands: false }), [DEFAULT_FACE_DETECTOR]);
});

test("a draft from before the switches keeps the one pass it ran", () => {
  assert.deepEqual(passesFromModels(undefined, HAND_DETECTOR), { faces: false, faceModel: DEFAULT_FACE_DETECTOR, hands: true });
  assert.deepEqual(passesFromModels(undefined, "face_yolov8s.pt"), { faces: true, faceModel: "face_yolov8s.pt", hands: false });
  assert.deepEqual(passesFromModels(undefined, undefined), { faces: true, faceModel: DEFAULT_FACE_DETECTOR, hands: false });
});

test("a record of both passes comes back as both switches on", () => {
  assert.deepEqual(passesFromModels(["mediapipe_face_full", HAND_DETECTOR], "mediapipe_face_full"),
    { faces: true, faceModel: "mediapipe_face_full", hands: true });
});

test("the fix button says what it will redo", () => {
  assert.equal(fixLabel({ faces: true, faceModel: "", hands: true }), "Fix faces & hands");
  assert.equal(fixLabel({ faces: false, faceModel: "", hands: true }), "Fix hands");
  assert.equal(fixLabel({ faces: true, faceModel: "", hands: false }), "Fix faces");
});
