import assert from "node:assert/strict";
import test from "node:test";
import {
  BIRD_CALL_LEAD_MS,
  FIRST_NOTE_MS,
  GAME_DURATION_MS,
  GOOD_WINDOW_MS,
  MAX_SCORE,
  NOTE_COUNT,
  NOTE_SPACING_MS,
  PERFECT_WINDOW_MS,
  RhythmSession,
  createChart,
  judgeOffset,
  offsetToBucket,
  resultMessage,
} from "../src/game-engine.js";

test("chart has exactly 50 scoreable notes and a 100-point maximum", () => {
  const chart = createChart();
  assert.equal(chart.length, NOTE_COUNT);
  assert.equal(MAX_SCORE, 100);
  assert.equal(chart[0].timeMs, FIRST_NOTE_MS);
  assert.equal(chart.at(-1).timeMs, FIRST_NOTE_MS + (NOTE_COUNT - 1) * NOTE_SPACING_MS);
  assert.ok(chart.at(-1).timeMs < GAME_DURATION_MS);
  assert.equal(new Set(chart.map((note) => note.id)).size, NOTE_COUNT);
});

test("jump notes have a deterministic bird-call lead", () => {
  const jumpNotes = createChart().filter((note) => note.type === "jump");
  assert.equal(jumpNotes.length, 6);
  for (const note of jumpNotes) {
    assert.equal(note.timeMs - note.cueTimeMs, BIRD_CALL_LEAD_MS);
  }
});

test("judgement windows include their documented boundaries", () => {
  assert.deepEqual(judgeOffset(0), { type: "perfect", label: "PERFECT", points: 2 });
  assert.equal(judgeOffset(-PERFECT_WINDOW_MS).type, "perfect");
  assert.equal(judgeOffset(PERFECT_WINDOW_MS).type, "perfect");
  assert.equal(judgeOffset(PERFECT_WINDOW_MS + 0.01).type, "good");
  assert.equal(judgeOffset(-GOOD_WINDOW_MS).type, "good");
  assert.equal(judgeOffset(GOOD_WINDOW_MS + 0.01).type, "miss");
});

test("50 perfect inputs score exactly 100", () => {
  const chart = createChart();
  const session = new RhythmSession(chart);
  for (const note of chart) {
    const result = session.input(note.timeMs);
    assert.equal(result.type, "perfect");
  }
  assert.equal(session.score, 100);
  assert.equal(session.isComplete, true);
  assert.deepEqual(session.stats(), {
    score: 100,
    judged: 50,
    total: 50,
    perfect: 50,
    good: 0,
    miss: 0,
  });
});

test("expired notes become zero-point misses", () => {
  const chart = createChart();
  const session = new RhythmSession(chart);
  const expired = session.expire(chart[0].timeMs + GOOD_WINDOW_MS + 1);
  assert.equal(expired.length, 1);
  assert.equal(expired[0].type, "miss");
  assert.equal(expired[0].automatic, true);
  assert.equal(session.score, 0);
});

test("an out-of-window nearby input consumes one note as a miss", () => {
  const chart = createChart();
  const session = new RhythmSession(chart);
  const result = session.input(chart[0].timeMs - 220);
  assert.equal(result.type, "miss");
  assert.equal(result.stray, false);
  assert.equal(session.judgedCount, 1);
});

test("a distant stray input does not change the fixed score chart", () => {
  const session = new RhythmSession(createChart());
  const result = session.input(500);
  assert.equal(result.stray, true);
  assert.equal(session.judgedCount, 0);
  assert.equal(session.score, 0);
});

test("timing offsets map to the 21 visual buckets", () => {
  assert.equal(offsetToBucket(-999), 0);
  assert.equal(offsetToBucket(0), 10);
  assert.equal(offsetToBucket(999), 20);
  assert.equal(offsetToBucket(Number.POSITIVE_INFINITY), 20);
});

test("result messages cover the perfect and retry ranges", () => {
  assert.match(resultMessage(100), /完璧/);
  assert.match(resultMessage(40), /足音/);
});
