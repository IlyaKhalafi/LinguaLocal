import assert from "node:assert/strict";
import { test } from "node:test";
import {
  recordingCapacity,
  recordingFilename,
  recordingLimits,
  recordingSchema,
  type Recording,
} from "../../src/lib/recording";
import { VoiceCapture, type CaptureState } from "../../src/lib/voice-capture";

const take: Recording = {
  id: "405df131-7d05-414f-806c-0cde110c1b66",
  bookId: "everyday-english",
  title: "Everyday English",
  createdAt: Date.UTC(2026, 9, 12),
  seconds: 2,
  blob: new Blob(["audio"], { type: "audio/webm;codecs=opus" }),
};

test("recordings preserve audio and use portable filenames", () => {
  assert.equal(recordingSchema.parse(take).blob, take.blob);
  assert.equal(
    recordingFilename(take),
    "everyday-english-2026-10-12T00-00-00.000Z-405df131.webm",
  );
  assert.ok(
    recordingFilename({
      ...take,
      blob: new Blob(["audio"], { type: "audio/mp4" }),
    }).endsWith(".m4a"),
  );
});

test("empty, oversized and non-audio recordings are rejected", () => {
  for (const blob of [
    new Blob([], { type: "audio/webm" }),
    new Blob(["audio"], { type: "text/plain" }),
    new Blob([new Uint8Array(recordingLimits.fileBytes + 1)], {
      type: "audio/webm",
    }),
  ])
    assert.equal(recordingSchema.safeParse({ ...take, blob }).success, false);
  for (const seconds of [0, 61, Infinity, NaN])
    assert.equal(
      recordingSchema.safeParse({ ...take, seconds }).success,
      false,
    );
  assert.equal(
    recordingSchema.safeParse({ ...take, bookId: "../recording" }).success,
    false,
  );
});

test("count and storage limits permit an idempotent retry", () => {
  const records = Array.from({ length: 10 }, (_, index) => ({
    ...take,
    id: `405df131-7d05-414f-806c-${String(index).padStart(12, "0")}`,
  }));
  assert.equal(recordingCapacity(records, take), false);
  assert.equal(recordingCapacity(records, records[0]), true);
  assert.equal(recordingCapacity(records.slice(1), take), true);
  const large = new Blob([new Uint8Array(recordingLimits.fileBytes)], {
    type: "audio/webm",
  });
  assert.equal(
    recordingCapacity(
      records.slice(0, 3).map((row) => ({ ...row, blob: large })),
      {
        ...take,
        blob: large,
      },
    ),
    true,
  );
  assert.equal(
    recordingCapacity(
      records.slice(0, 4).map((row) => ({ ...row, blob: large })),
      {
        ...take,
        blob: new Blob(["audio"], { type: "audio/webm" }),
      },
    ),
    false,
  );
});

test("late microphone results cannot stop a newer capture", async () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const recorderDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "MediaRecorder",
  );
  class Recorder {
    static isTypeSupported() {
      return true;
    }
    state = "inactive";
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
    }
  }
  try {
    Object.defineProperty(globalThis, "MediaRecorder", {
      value: Recorder,
      configurable: true,
    });
    for (const rejectFirst of [false, true]) {
      let resolveFirst!: (stream: MediaStream) => void;
      let rejectPermission!: (error: Error) => void;
      const firstPermission = new Promise<MediaStream>((resolve, reject) => {
        resolveFirst = resolve;
        rejectPermission = reject;
      });
      let stoppedFirst = 0;
      let stoppedCurrent = 0;
      const firstStream = {
        getTracks: () => [{ stop: () => stoppedFirst++ }],
      } as unknown as MediaStream;
      const currentStream = {
        getTracks: () => [{ stop: () => stoppedCurrent++ }],
      } as unknown as MediaStream;
      let calls = 0;
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: {
          mediaDevices: {
            getUserMedia: () =>
              calls++ ? Promise.resolve(currentStream) : firstPermission,
          },
        },
      });
      let state: CaptureState | undefined;
      const capture = new VoiceCapture(
        (next) => {
          state = next;
        },
        () => assert.fail("No take should complete"),
      );
      try {
        const first = capture.start({ id: take.bookId, title: take.title });
        capture.stop();
        await capture.start({ id: take.bookId, title: take.title });
        if (rejectFirst)
          rejectPermission(new DOMException("declined", "NotAllowedError"));
        else resolveFirst(firstStream);
        await first;
        assert.equal(stoppedCurrent, 0);
        assert.equal(stoppedFirst, rejectFirst ? 0 : 1);
        assert.equal(state?.phase, "recording");
      } finally {
        capture.dispose();
      }
      assert.equal(stoppedCurrent, 1);
    }
  } finally {
    if (navigatorDescriptor)
      Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
    if (recorderDescriptor)
      Object.defineProperty(globalThis, "MediaRecorder", recorderDescriptor);
    else Reflect.deleteProperty(globalThis, "MediaRecorder");
  }
});
