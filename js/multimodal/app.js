// multimodal/app.js — '이미지·음성의 비밀' 페이지 시작점.
// index.html처럼 '자동 재생 / 한 단계씩 / 처음부터' 버튼으로 데모를 단계별로 진행한다.
//
// 구조:
//   player.js    : 단계 상태 기계 (화면을 모름, 이벤트만 발생)
//   scenarios.js : 데모 4개의 단계 설명과 세 패널 그리기
//   draw.js      : 캔버스 그림 (집, 격자, 모자이크, 파형, 표 캡처)
//   fx.js        : 타자 효과, 생성 연출
//   model.js     : 조각 평균 색, 시간 조각 세기 등 순수 계산

import { $ } from '../utils.js';
import { initConcepts } from '../ui/concepts.js';
import { StepPlayer } from './player.js';
import { SCENARIOS, SIZE, COLUMNS } from './scenarios.js';
import { computePatches, drawHouse, drawTable } from './draw.js';
import { makeVoice, audioFeatures, SYLLABLE_SECONDS } from './model.js';
import { cancelAll } from './fx.js';

// ── 미리 계산해 두는 재료 ───────────────────────────────
const VOICE_RATE = 8000;
const voice = makeVoice(VOICE_RATE);
const assets = {
  housePatches: computePatches((ctx, size) => drawHouse(ctx, size), SIZE, COLUMNS),
  tablePatches: computePatches(drawTable, SIZE, COLUMNS),
  voice,
  voiceChunks: audioFeatures(voice, VOICE_RATE, SYLLABLE_SECONDS),
};

// ── 화면 요소 ───────────────────────────────────────────
const KEYS = ['left', 'mid', 'right'];
const panels = Object.fromEntries(KEYS.map((k) => [k, {
  title: $(`#title-${k}`),
  body: $(`#body-${k}`),
  tip: $(`#tip-${k}`),
}]));

const scenarioSelect = $('#scenario-select');
const btnPlay = $('#btn-play');
const btnStep = $('#btn-step');
const btnReset = $('#btn-reset');
const speedSelect = $('#speed-select');
const tipsToggle = $('#tips-toggle');

const getSpeed = () => parseFloat(speedSelect.value);

SCENARIOS.forEach((s, i) => {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = s.title;
  scenarioSelect.appendChild(opt);
});

// ── 단계 설명 말풍선 ─────────────────────────────────────
const READY_TIP = {
  badge: '준비',
  tip: '<strong>자동 재생</strong> 또는 <strong>한 단계씩</strong>을 눌러 시작해 보세요!',
};

function hideTips() {
  KEYS.forEach((k) => { panels[k].tip.hidden = true; });
}

function showTip(panelKey, { badge, tip }) {
  hideTips();
  if (!tipsToggle.checked) return;
  const box = panels[panelKey].tip;
  box.querySelector('.tip-badge').textContent = badge;
  box.querySelector('.tip-body').innerHTML = tip;
  box.hidden = false;
}

KEYS.forEach((k) => {
  panels[k].tip.querySelector('.tip-close').addEventListener('click', () => { panels[k].tip.hidden = true; });
});

tipsToggle.addEventListener('change', () => {
  if (!tipsToggle.checked) hideTips();
});

// ── 재생 ────────────────────────────────────────────────
const player = new StepPlayer();
let playing = false;
let timer = null;

function setPlaying(on) {
  playing = on;
  btnPlay.textContent = on ? '일시정지' : '자동 재생';
  btnPlay.classList.toggle('btn-primary', !on);
}

function stopAuto() {
  clearTimeout(timer);
  setPlaying(false);
}

function render(index) {
  cancelAll();
  const ui = {
    left: panels.left.body,
    mid: panels.mid.body,
    right: panels.right.body,
    assets,
    speed: getSpeed,
  };
  player.scenario.render(index, ui);
}

player.addEventListener('reset', (e) => {
  const { scenario } = e.detail;
  KEYS.forEach((k, i) => { panels[k].title.textContent = scenario.panels[i]; });
  render(0);
  showTip('left', READY_TIP);
});

player.addEventListener('step', (e) => {
  const { index, step } = e.detail;
  render(index);
  showTip(step.panel, step);
  if (playing && !player.done) {
    clearTimeout(timer);
    timer = setTimeout(() => player.next(), step.duration / getSpeed());
  }
});

player.addEventListener('done', stopAuto);

// ── 조작부 ──────────────────────────────────────────────
scenarioSelect.addEventListener('change', () => {
  stopAuto();
  player.reset(SCENARIOS[Number(scenarioSelect.value)]);
});

btnPlay.addEventListener('click', () => {
  if (playing) { stopAuto(); return; }
  if (player.done) player.reset();
  setPlaying(true);
  player.next();
});

btnStep.addEventListener('click', () => {
  stopAuto();
  if (player.done) player.reset();
  player.next();
});

btnReset.addEventListener('click', () => {
  stopAuto();
  player.reset();
});

// 데모 카드에서 바로 고르기 (아래 '네 가지 데모' 버튼)
document.querySelectorAll('[data-demo]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const i = SCENARIOS.findIndex((s) => s.id === btn.dataset.demo);
    if (i < 0) return;
    scenarioSelect.value = String(i);
    stopAuto();
    player.reset(SCENARIOS[i]);
    document.querySelector('#simulator').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

initConcepts($('#concept-row'));

// ── 시작! ───────────────────────────────────────────────
player.reset(SCENARIOS[0]);
