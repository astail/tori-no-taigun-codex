import { GameAudio } from "./audio-engine.js";
import {
  BEAT_MS,
  GAME_DURATION_MS,
  GOOD_WINDOW_MS,
  MAX_SCORE,
  RhythmSession,
  createChart,
  offsetToBucket,
  resultMessage,
} from "./game-engine.js";

const $ = (selector) => {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
};

const elements = {
  stage: $("#stage"),
  startOverlay: $("#startOverlay"),
  startButton: $("#startButton"),
  startButtonText: $("#startButtonText"),
  restartButton: $("#restartButton"),
  resumeButton: $("#resumeButton"),
  muteButton: $("#muteButton"),
  muteIcon: $("#muteIcon"),
  muteLabel: $("#muteLabel"),
  score: $("#score"),
  time: $("#time"),
  progressText: $("#progressText"),
  playerWrap: $("#playerWrap"),
  playerBird: $("#playerBird"),
  cue: $("#cue"),
  cueSmall: $("#cueSmall"),
  cueText: $("#cueText"),
  lastJudgement: $("#lastJudgement"),
  lastJudgementStrong: $("#lastJudgement strong"),
  lastJudgementDetail: $("#lastJudgement span"),
  timingHistory: $("#timingHistory"),
  resultDialog: $("#resultDialog"),
  dialogClose: $("#dialogClose"),
  resultScore: $("#resultScore"),
  resultMessage: $("#resultMessage"),
  perfectCount: $("#perfectCount"),
  goodCount: $("#goodCount"),
  missCount: $("#missCount"),
  playAgainButton: $("#playAgainButton"),
  shareButton: $("#shareButton"),
};

const chart = createChart();
const jumpNotes = chart.filter((note) => note.type === "jump");
const audio = new GameAudio({
  bgmUrl: new URL("../assets/audio/flock-parade.wav", import.meta.url),
  birdCallUrl: new URL("../assets/audio/bird-call.wav", import.meta.url),
});

let session = new RhythmSession(chart);
let state = "loading";
let animationFrame = null;
let poseTimer = null;
let lastBeat = -1;
let lastRenderedSecond = -1;
let muted = false;
let endingStarted = false;
let triggeredFlockJumps = new Set();
let finalStats = null;

function setPose(pose) {
  elements.playerBird.dataset.pose = pose;
}

function clearMotionClasses() {
  elements.playerWrap.classList.remove("is-perfect", "is-good", "is-miss", "is-jumping", "is-entering");
}

function animateJudgement(judgement) {
  window.clearTimeout(poseTimer);
  clearMotionClasses();
  void elements.playerWrap.offsetWidth;

  if (judgement.type === "miss") {
    setPose("miss");
    elements.playerWrap.classList.add("is-miss");
    poseTimer = window.setTimeout(() => {
      clearMotionClasses();
      setPose("step-left");
    }, 560);
    return;
  }

  if (judgement.note?.type === "jump") {
    setPose("fly");
    elements.playerWrap.classList.add("is-jumping");
    window.setTimeout(() => setPose("land"), 510);
    poseTimer = window.setTimeout(() => {
      clearMotionClasses();
      setPose(judgement.note.id % 2 === 0 ? "step-left" : "step-right");
    }, 840);
    return;
  }

  setPose(judgement.type === "perfect" ? "perfect" : judgement.note.id % 2 === 0 ? "step-left" : "step-right");
  elements.playerWrap.classList.add(judgement.type === "perfect" ? "is-perfect" : "is-good");
  poseTimer = window.setTimeout(() => {
    clearMotionClasses();
    setPose(judgement.note.id % 2 === 0 ? "step-right" : "step-left");
  }, 390);
}

function renderJudgement(judgement) {
  const automaticText = judgement.automatic ? "入力なし" : judgement.stray ? "空振り" : formatOffset(judgement.offsetMs);
  elements.lastJudgement.className = `last-judgement is-${judgement.type}`;
  elements.lastJudgementStrong.textContent = `${judgement.label} +${judgement.points}`;
  elements.lastJudgementDetail.textContent = automaticText;

  const marker = document.createElement("li");
  const bucket = offsetToBucket(judgement.automatic ? Number.POSITIVE_INFINITY : judgement.offsetMs);
  marker.className = `timing-mark timing-mark--${judgement.type} offset-${bucket}`;
  marker.setAttribute("aria-hidden", "true");
  elements.timingHistory.append(marker);

  while (elements.timingHistory.children.length > 16) {
    elements.timingHistory.firstElementChild?.remove();
  }

  if (!judgement.stray) {
    elements.score.textContent = String(session.score);
    elements.progressText.textContent = `${session.judgedCount} / ${chart.length}歩`;
  }
}

function formatOffset(offsetMs) {
  if (!Number.isFinite(offsetMs)) {
    return "入力なし";
  }
  if (Math.abs(offsetMs) < 1) {
    return "±0 ms";
  }
  return `${offsetMs < 0 ? "はやい" : "おそい"} ${Math.abs(Math.round(offsetMs))} ms`;
}

function handleInput() {
  if (state !== "playing") {
    return;
  }

  const elapsedMs = audio.elapsedMs();
  if (elapsedMs < 0 || elapsedMs > GAME_DURATION_MS) {
    return;
  }

  const judgement = session.input(elapsedMs);
  renderJudgement(judgement);
  animateJudgement(judgement);
}

function renderCue(elapsedMs) {
  if (elapsedMs < 0) {
    elements.cueSmall.textContent = "GET READY";
    elements.cueText.textContent = "まもなくスタート";
    return;
  }

  if (elapsedMs < chart[0].timeMs - 500) {
    elements.cueSmall.textContent = "COUNT IN";
    elements.cueText.textContent = `${Math.max(1, Math.ceil((chart[0].timeMs - elapsedMs) / BEAT_MS))}`;
    return;
  }

  const callingNote = jumpNotes.find(
    (note) => elapsedMs >= note.cueTimeMs && elapsedMs < note.timeMs + GOOD_WINDOW_MS,
  );

  if (callingNote) {
    const callProgress = elapsedMs - callingNote.cueTimeMs;
    const phrases = ["ピー", "ピーピャコ", "ピャッコ", "ビャー！", "ビャー！！"];
    const phraseIndex = Math.min(phrases.length - 1, Math.floor(callProgress / 480));
    elements.cue.classList.add("is-calling");
    elements.cueSmall.textContent = "JUMP CALL";
    elements.cueText.textContent = phrases[phraseIndex];

    if (callProgress > 1_620 && callProgress < 2_250 && session.getJudgement(callingNote.id) === null) {
      setPose("crouch");
    }
    return;
  }

  elements.cue.classList.remove("is-calling");
  elements.cueSmall.textContent = "KEEP THE BEAT";
  elements.cueText.textContent = "タン・タン・タン…";
}

function triggerCompanionJump(note) {
  if (triggeredFlockJumps.has(note.id)) {
    return;
  }
  triggeredFlockJumps.add(note.id);
  elements.stage.classList.add("is-flock-jumping");
  window.setTimeout(() => elements.stage.classList.remove("is-flock-jumping"), 820);
}

function tick() {
  if (state !== "playing") {
    return;
  }

  const elapsedMs = audio.elapsedMs();
  const beat = Math.max(0, Math.floor(elapsedMs / BEAT_MS));

  if (beat !== lastBeat) {
    lastBeat = beat;
    elements.stage.classList.toggle("is-beat-even", beat % 2 === 0);
  }

  const remainingSeconds = Math.max(0, Math.ceil((GAME_DURATION_MS - Math.max(0, elapsedMs)) / 1_000));
  if (remainingSeconds !== lastRenderedSecond) {
    lastRenderedSecond = remainingSeconds;
    elements.time.textContent = formatTime(remainingSeconds);
  }

  renderCue(elapsedMs);

  for (const judgement of session.expire(elapsedMs)) {
    renderJudgement(judgement);
    animateJudgement(judgement);
  }

  for (const note of jumpNotes) {
    if (elapsedMs >= note.timeMs - 30) {
      triggerCompanionJump(note);
    }
  }

  if (!endingStarted && elapsedMs >= chart.at(-1).timeMs + 700) {
    endingStarted = true;
    elements.stage.classList.add("stage--ending");
    elements.cue.classList.remove("is-calling");
    elements.cueSmall.textContent = "FINISH";
    elements.cueText.textContent = "みんなで空へ！";
    setPose("finish");
    window.setTimeout(() => {
      if (state === "playing") {
        setPose("fly");
      }
    }, 420);
  }

  if (elapsedMs >= GAME_DURATION_MS) {
    finishGame();
    return;
  }

  animationFrame = requestAnimationFrame(tick);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function startGame() {
  if (state === "loading") {
    return;
  }

  cancelAnimationFrame(animationFrame);
  window.clearTimeout(poseTimer);
  audio.stop();
  session = new RhythmSession(chart);
  finalStats = null;
  state = "playing";
  lastBeat = -1;
  lastRenderedSecond = -1;
  endingStarted = false;
  triggeredFlockJumps = new Set();

  elements.resultDialog.close();
  elements.startOverlay.hidden = true;
  elements.resumeButton.hidden = true;
  elements.restartButton.disabled = false;
  elements.stage.className = "stage stage--playing";
  elements.score.textContent = "0";
  elements.time.textContent = formatTime(GAME_DURATION_MS / 1_000);
  elements.progressText.textContent = `0 / ${chart.length}歩`;
  elements.timingHistory.replaceChildren();
  elements.lastJudgement.className = "last-judgement";
  elements.lastJudgementStrong.textContent = "—";
  elements.lastJudgementDetail.textContent = "ここに判定が出ます";
  clearMotionClasses();
  setPose("fly");
  void elements.playerWrap.offsetWidth;
  elements.playerWrap.classList.add("is-entering");

  try {
    await audio.start(jumpNotes.map((note) => note.cueTimeMs));
    window.setTimeout(() => {
      if (state === "playing" && session.judgedCount === 0) {
        setPose("land");
      }
    }, 780);
    window.setTimeout(() => {
      if (state === "playing" && session.judgedCount === 0) {
        clearMotionClasses();
        setPose("step-left");
      }
    }, 1_220);
    animationFrame = requestAnimationFrame(tick);
  } catch (error) {
    state = "ready";
    elements.startOverlay.hidden = false;
    elements.startButtonText.textContent = "再試行する";
    elements.cueText.textContent = error instanceof Error ? error.message : "音源を開始できませんでした";
  }
}

function finishGame() {
  cancelAnimationFrame(animationFrame);
  state = "finished";
  for (const judgement of session.expire(Number.POSITIVE_INFINITY)) {
    renderJudgement(judgement);
  }
  finalStats = session.stats();
  elements.resultScore.textContent = String(finalStats.score);
  elements.resultMessage.textContent = resultMessage(finalStats.score);
  elements.perfectCount.textContent = String(finalStats.perfect);
  elements.goodCount.textContent = String(finalStats.good);
  elements.missCount.textContent = String(finalStats.miss);
  elements.resultDialog.showModal();
}

async function pauseGame() {
  if (state !== "playing") {
    return;
  }
  state = "paused";
  cancelAnimationFrame(animationFrame);
  await audio.pause();
  elements.resumeButton.hidden = false;
}

async function resumeGame() {
  if (state !== "paused") {
    return;
  }
  await audio.resume();
  state = "playing";
  elements.resumeButton.hidden = true;
  animationFrame = requestAnimationFrame(tick);
}

function shareResult() {
  if (!finalStats) {
    return;
  }

  const text = `トリ・ステップ・パレードで ${finalStats.score}/100点！\nPERFECT ${finalStats.perfect}・GOOD ${finalStats.good}・MISS ${finalStats.miss}\n#トリステップパレード`;
  const intent = new URL("https://twitter.com/intent/tweet");
  intent.searchParams.set("text", text);
  intent.searchParams.set("url", window.location.href.split("#")[0]);
  window.open(intent, "_blank", "noopener,noreferrer");
}

elements.startButton.addEventListener("click", (event) => {
  event.stopPropagation();
  startGame();
});

elements.stage.addEventListener("pointerdown", (event) => {
  if (event.target instanceof HTMLButtonElement) {
    return;
  }
  event.preventDefault();
  handleInput();
});

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat || event.target instanceof HTMLButtonElement) {
    return;
  }

  event.preventDefault();
  if (state === "ready") {
    startGame();
  } else {
    handleInput();
  }
});

elements.restartButton.addEventListener("click", startGame);
elements.playAgainButton.addEventListener("click", startGame);
elements.resumeButton.addEventListener("click", resumeGame);
elements.dialogClose.addEventListener("click", () => elements.resultDialog.close());
elements.shareButton.addEventListener("click", shareResult);

elements.muteButton.addEventListener("click", () => {
  muted = !muted;
  audio.setMuted(muted);
  elements.muteButton.setAttribute("aria-pressed", String(muted));
  elements.muteIcon.textContent = muted ? "×" : "♪";
  elements.muteLabel.textContent = muted ? "サウンド OFF" : "サウンド ON";
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") {
    pauseGame();
  }
});

audio
  .load()
  .then(() => {
    state = "ready";
    elements.startButton.disabled = false;
    elements.startButtonText.textContent = "パレードをはじめる";
    elements.cueText.textContent = "音をオンにしてスタート";
  })
  .catch((error) => {
    state = "loading";
    elements.startButton.disabled = true;
    elements.startButtonText.textContent = "音源を読み込めませんでした";
    elements.cueText.textContent = error instanceof Error ? error.message : "音源の読み込みに失敗しました";
  });

if (MAX_SCORE !== 100) {
  throw new Error("Scoring configuration must total exactly 100 points.");
}
