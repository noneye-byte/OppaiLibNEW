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

const { customDetectors, detectorLabel, customPassParams, customPassesFrom } = await import("./detailer.ts");

test("a custom pass offers the added detectors before ADetailer's own", () => {
  assert.deepEqual(customDetectors(["face_yolov8n.pt", "hand_yolov8n.pt", "nipples_yolov8s-seg.pt", "pussyV2.pt"]),
    ["nipples_yolov8s-seg.pt", "pussyV2.pt", "face_yolov8n.pt", "hand_yolov8n.pt"]);
  assert.deepEqual(customDetectors(undefined), []);
});

test("a detector's file name reads as words", () => {
  assert.equal(detectorLabel("nipples_yolov8s-seg.pt"), "nipples (yolov8s seg)");
  assert.equal(detectorLabel("pussyV2.pt"), "pussyV2");
  assert.equal(detectorLabel("face_yolov8s.pt"), "Face (accurate)");
  assert.equal(detectorLabel(HAND_DETECTOR), "Hands");
});

test("a pass is sent with its LoRA, and one with no detector is not sent", () => {
  assert.deepEqual(customPassParams([
    { model: "pussyV2.pt", prompt: " detailed ", lora: "detail", loraWeight: 0.6, denoise: 0.35 },
    { model: " ", prompt: "x", lora: "", loraWeight: 1, denoise: 0 },
    { model: "nipples.pt", prompt: "", lora: "", loraWeight: 1, denoise: 0 },
  ]), [
    { model: "pussyV2.pt", prompt: "detailed", loras: [{ name: "detail", weight: 0.6 }], denoise: 0.35 },
    { model: "nipples.pt", prompt: undefined, loras: undefined, denoise: undefined },
  ]);
});

test("a kept pass with two LoRAs comes back with the second in its words", () => {
  assert.deepEqual(customPassesFrom([{ model: "m.pt", prompt: "p", loras: [{ name: "a", weight: 0.5 }, { name: "b", weight: 1 }] }]),
    [{ model: "m.pt", prompt: "p <lora:b:1>", lora: "a", loraWeight: 0.5, denoise: 0 }]);
});

const { detectorIcon, passSummary } = await import("./detailer.ts");

test("a detector's icon is read off what its name says it finds", () => {
  assert.equal(detectorIcon("hand_yolov8n.pt"), "back_hand");
  assert.equal(detectorIcon("Eyes.pt"), "visibility");
  assert.equal(detectorIcon("face_yolov8s.pt"), "face");
  assert.equal(detectorIcon("person_yolov8n-seg.pt"), "person");
  assert.equal(detectorIcon("adetailerFootYolov8x_v20.pt"), "footprint");
  assert.equal(detectorIcon("adetailerNipples_v20Segm.pt"), "accessibility_new");
  assert.equal(detectorIcon("mystery.pt"), "center_focus_strong");
});

test("the passes are summed up in the order they run, custom ones by their label", () => {
  const custom = [{ model: "Eyes.pt", prompt: "", lora: "", loraWeight: 0.8, denoise: 0 }, { model: " ", prompt: "", lora: "", loraWeight: 1, denoise: 0 }];
  assert.equal(passSummary({ faces: true, faceModel: "face_yolov8n.pt", hands: true }, custom, (m) => m.replace(".pt", "")), "Faces · Hands · Eyes");
  assert.equal(passSummary({ faces: true, faceModel: "person_yolov8n-seg.pt", hands: false }, []), "Whole person");
  assert.equal(passSummary({ faces: false, faceModel: "face_yolov8n.pt", hands: false }, []), "");
});
