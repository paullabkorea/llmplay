// app.js — 시작점(엔트리). 엔진과 UI 모듈들을 서로 연결한다.
//
// 구조:
//   core/engine.js  : 생성 단계 상태 기계 (화면을 모름, 이벤트만 발생)
//   core/model.js   : 확률표 → 확률 분포 → 샘플링
//   data/scenarios.js : 예시 문장 데이터 (여기에 문장을 추가하면 됨)
//   ui/*.js         : 각 화면 조각 (엔진 이벤트를 구독해서 그림)

import { STAGE_DURATIONS } from './config.js';
import { $ } from './utils.js';
import { SCENARIOS } from './data/scenarios.js';
import { GenerationEngine } from './core/engine.js';
import { initTextView } from './ui/textView.js';
import { initNetworkView } from './ui/networkView.js';
import { initProbView } from './ui/probView.js';
import { initExplainView } from './ui/explainView.js';
import { initControls } from './ui/controls.js';
import { initConcepts } from './ui/concepts.js';

const engine = new GenerationEngine();

// ── 자동 재생 관리 ──────────────────────────────────────
let playing = false;
let timer = null;

function stopAuto() {
  playing = false;
  clearTimeout(timer);
  controls.setPlaying(false);
}

engine.addEventListener('stage', (e) => {
  if (e.detail.live || !playing) return;
  const duration = STAGE_DURATIONS[e.detail.stage] / controls.getSpeed();
  clearTimeout(timer);
  timer = setTimeout(() => engine.next(), duration + 150);
});

engine.addEventListener('done', stopAuto);

// ── 조작부 연결 ─────────────────────────────────────────
const controls = initControls(
  {
    scenarioSelect: $('#scenario-select'),
    btnPlay: $('#btn-play'),
    btnStep: $('#btn-step'),
    btnReset: $('#btn-reset'),
    speedSelect: $('#speed-select'),
    tempSlider: $('#temp-slider'),
    tempValue: $('#temp-value'),
  },
  {
    scenarios: SCENARIOS,

    onScenarioChange(scenario) {
      stopAuto();
      engine.reset(scenario);
    },

    onPlayToggle() {
      if (playing) {
        stopAuto();
        return;
      }
      if (engine.done) engine.reset(); // 끝난 상태면 처음부터
      playing = true;
      controls.setPlaying(true);
      engine.next();
    },

    onStep() {
      stopAuto();
      if (engine.done) engine.reset();
      engine.next();
    },

    onReset() {
      stopAuto();
      engine.reset();
    },

    onTempChange(t) {
      engine.setTemperature(t);
    },
  },
);

// ── 화면 모듈 연결 ──────────────────────────────────────
initTextView(engine, {
  tokenArea: $('#token-area'),
  vectorArea: $('#vector-area'),
});

initNetworkView(
  engine,
  {
    canvas: $('#network-canvas'),
    calcCounter: $('#calc-counter'),
    paramLabel: $('#param-label'),
  },
  controls.getSpeed,
);

initProbView(engine, { probList: $('#prob-list') }, controls.getSpeed);

initExplainView(engine, {
  tips: {
    input: $('#tip-input'),
    network: $('#tip-network'),
    probs: $('#tip-probs'),
  },
  toggle: $('#tips-toggle'),
});

initConcepts($('#concept-row'));

// ── 시작! ──────────────────────────────────────────────
engine.setTemperature(controls.getTemperature());
engine.reset(SCENARIOS[0]);
