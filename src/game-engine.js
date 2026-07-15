export const BPM = 100;
export const BEAT_MS = 60_000 / BPM;
export const NOTE_COUNT = 50;
export const FIRST_NOTE_MS = 3_000;
export const NOTE_SPACING_MS = BEAT_MS * 2;
export const GAME_DURATION_MS = 66_000;
export const PERFECT_WINDOW_MS = 70;
export const GOOD_WINDOW_MS = 150;
export const MISS_INPUT_WINDOW_MS = 300;
export const MAX_SCORE = NOTE_COUNT * 2;
export const BIRD_CALL_LEAD_MS = 2_400;

const JUMP_INDEXES = new Set([7, 15, 23, 31, 39, 47]);

export function createChart() {
  return Object.freeze(
    Array.from({ length: NOTE_COUNT }, (_, index) => {
      const timeMs = FIRST_NOTE_MS + index * NOTE_SPACING_MS;
      const type = JUMP_INDEXES.has(index) ? "jump" : "step";

      return Object.freeze({
        id: index,
        number: index + 1,
        timeMs,
        type,
        cueTimeMs: type === "jump" ? timeMs - BIRD_CALL_LEAD_MS : null,
      });
    }),
  );
}

export function judgeOffset(offsetMs) {
  const distance = Math.abs(offsetMs);

  if (distance <= PERFECT_WINDOW_MS) {
    return Object.freeze({ type: "perfect", label: "PERFECT", points: 2 });
  }

  if (distance <= GOOD_WINDOW_MS) {
    return Object.freeze({ type: "good", label: "GOOD", points: 1 });
  }

  return Object.freeze({ type: "miss", label: "MISS", points: 0 });
}

export function offsetToBucket(offsetMs) {
  if (!Number.isFinite(offsetMs)) {
    return 20;
  }

  const clamped = Math.max(-MISS_INPUT_WINDOW_MS, Math.min(MISS_INPUT_WINDOW_MS, offsetMs));
  return Math.round(((clamped + MISS_INPUT_WINDOW_MS) / (MISS_INPUT_WINDOW_MS * 2)) * 20);
}

export class RhythmSession {
  #chart;
  #judgements = new Map();
  #score = 0;

  constructor(chart = createChart()) {
    this.#chart = chart;
  }

  get chart() {
    return this.#chart;
  }

  get score() {
    return this.#score;
  }

  get judgedCount() {
    return this.#judgements.size;
  }

  get isComplete() {
    return this.#judgements.size === this.#chart.length;
  }

  getJudgement(noteId) {
    return this.#judgements.get(noteId) ?? null;
  }

  input(elapsedMs) {
    this.expire(elapsedMs);

    let closestNote = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const note of this.#chart) {
      if (this.#judgements.has(note.id)) {
        continue;
      }

      const distance = Math.abs(elapsedMs - note.timeMs);
      if (distance < closestDistance) {
        closestNote = note;
        closestDistance = distance;
      }
    }

    if (!closestNote || closestDistance > MISS_INPUT_WINDOW_MS) {
      return Object.freeze({
        type: "miss",
        label: "MISS",
        points: 0,
        offsetMs: null,
        note: null,
        automatic: false,
        stray: true,
      });
    }

    const offsetMs = elapsedMs - closestNote.timeMs;
    const judged = judgeOffset(offsetMs);
    return this.#record(closestNote, judged, offsetMs, false);
  }

  expire(elapsedMs) {
    const expired = [];

    for (const note of this.#chart) {
      if (this.#judgements.has(note.id)) {
        continue;
      }

      if (elapsedMs > note.timeMs + GOOD_WINDOW_MS) {
        expired.push(
          this.#record(
            note,
            Object.freeze({ type: "miss", label: "MISS", points: 0 }),
            null,
            true,
          ),
        );
      }
    }

    return expired;
  }

  stats() {
    const counts = { perfect: 0, good: 0, miss: 0 };

    for (const judgement of this.#judgements.values()) {
      counts[judgement.type] += 1;
    }

    return Object.freeze({
      score: this.#score,
      judged: this.#judgements.size,
      total: this.#chart.length,
      perfect: counts.perfect,
      good: counts.good,
      miss: counts.miss,
    });
  }

  #record(note, judged, offsetMs, automatic) {
    const result = Object.freeze({
      ...judged,
      offsetMs,
      note,
      automatic,
      stray: false,
    });

    this.#judgements.set(note.id, result);
    this.#score += judged.points;
    return result;
  }
}

export function resultMessage(score) {
  if (score === MAX_SCORE) {
    return "全員ぴったり！ 空までそろう、完璧なパレード。";
  }
  if (score >= 90) {
    return "見事な一体感！ 群れの先頭を任せられそう。";
  }
  if (score >= 75) {
    return "いい足どり！ あと少しで羽音までそろいそう。";
  }
  if (score >= 50) {
    return "旅はまだ途中。音をよく聴いて、もう一度。";
  }
  return "少し急ぎすぎたみたい。群れの足音から始めよう。";
}
