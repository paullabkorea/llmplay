// agent/app.js — '에이전트의 비밀' 페이지 시작점.
// index.html처럼 '자동 재생 / 한 단계씩 / 처음부터' 버튼으로 데모를 단계별로 진행한다.
//
// 구조:
//   ../core/stepPlayer.js : 단계 상태 기계 (화면을 모름, 이벤트만 발생)
//   data.js      : 파일, 질문지, 결과물, 그때와 지금 (순수 데이터)
//   parts.js     : 책상, 폴더, 입력창, Skill 카드 같은 화면 부품
//   scenarios.js : 데모 3개의 단계 설명과 세 패널 그리기
//
// 패널은 높이가 고정이고 내용이 길어지면 패널 안에서 굴러간다.
// 그래서 조작부가 아래로 밀려나지 않고, 단계마다 새로 나타난 것(data-fresh)이
// 보이도록 패널 안을 굴려 준다.

import { $, el } from '../utils.js';
import { fileLinks } from './parts.js';
import { initConcepts } from '../ui/concepts.js';
import { StepPlayer } from '../core/stepPlayer.js';
import { cancelAll } from '../ui/typeFx.js';
import { SCENARIOS } from './scenarios.js';
import { OUTPUTS, WENIV_SKILLS, THEN_NOW } from './data.js';

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
const btnPrev = $('#btn-prev');
const btnReset = $('#btn-reset');
const speedSelect = $('#speed-select');
const tipsToggle = $('#tips-toggle');
const progress = $('#step-progress');

const NARROW = window.matchMedia('(max-width: 1024px)');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const scrollBehavior = () => (REDUCED.matches ? 'auto' : 'smooth');

const getSpeed = () => parseFloat(speedSelect.value);

SCENARIOS.forEach((s, i) => {
  const opt = el('option', '', s.title);
  opt.value = String(i);
  scenarioSelect.appendChild(opt);
});

// 결과물 그림을 미리 받아 두면 나타나는 순간 빈 칸이 보이지 않는다
Object.values(OUTPUTS).forEach((o) => { new Image().src = `assets/agent/${o.img}.webp`; });
new Image().src = 'assets/agent/phone.webp';

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

function updateProgress() {
  const total = player.scenario.steps.length;
  progress.textContent = `${player.index} / ${total}`;
  btnPrev.disabled = player.index === 0;
}

/** 세 패널을 다시 그리고, 그리기 전 각 패널이 어디까지 굴러가 있었는지 돌려준다. */
function render(index) {
  cancelAll();
  const before = Object.fromEntries(KEYS.map((k) => [k, panels[k].body.scrollTop]));
  player.scenario.render(index, {
    left: panels.left.body,
    mid: panels.mid.body,
    right: panels.right.body,
    speed: getSpeed,
    // 질문지에서 다른 명령을 고르면 같은 단계를 새 명령으로 다시 그린다
    rerender: () => settle(null, render(player.index)),
  });
  return before;
}

/**
 * 새로 나타난 것이 보이도록 패널 안을 굴린다.
 *  - 새 요소(data-fresh)가 있으면 그 자리로 (바로 위 제목까지 보이게 조금 위로)
 *  - 설명 말풍선이 붙은 패널인데 새 요소 표시가 없으면 맨 아래로 (배지, 목록처럼 뒤에 덧붙는 것)
 *  - 나머지 패널은 방금 전 위치를 지킨다
 * 좁은 화면에서는 패널이 세로로 쌓이므로 설명이 붙은 패널로 페이지를 굴린다.
 */
function settle(activeKey, before) {
  KEYS.forEach((k) => {
    const body = panels[k].body;
    const first = body.querySelector('[data-fresh]');
    let top;
    // 다시 그려도 패널의 scrollTop은 남아 있으므로 화면 좌표 차이에 그만큼 더해야 한다
    if (first) top = Math.max(0, body.scrollTop + first.getBoundingClientRect().top - body.getBoundingClientRect().top - 44);
    else if (k === activeKey) top = body.scrollHeight;
    else top = before[k];
    body.scrollTo({ top, behavior: scrollBehavior() });
  });
  if (NARROW.matches && activeKey) {
    panels[activeKey].body.closest('.panel').scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  }
}

player.addEventListener('reset', (e) => {
  const { scenario } = e.detail;
  KEYS.forEach((k, i) => { panels[k].title.textContent = scenario.panels[i]; });
  render(0);
  showTip('left', READY_TIP);
  updateProgress();
});

player.addEventListener('step', (e) => {
  const { index, step } = e.detail;
  settle(step.panel, render(index));
  showTip(step.panel, step);
  updateProgress();
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

btnPrev.addEventListener('click', () => {
  stopAuto();
  player.prev();
});

btnReset.addEventListener('click', () => {
  stopAuto();
  player.reset();
});

// 키보드: → 다음 단계, ← 이전 단계 (글을 입력하거나 목록을 고르는 중이면 건드리지 않음)
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); btnStep.click(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); btnPrev.click(); }
});

// 데모 카드에서 바로 고르기 (아래 '세 가지 데모' 버튼)
document.querySelectorAll('[data-demo]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const i = SCENARIOS.findIndex((s) => s.id === btn.dataset.demo);
    if (i < 0) return;
    scenarioSelect.value = String(i);
    stopAuto();
    player.reset(SCENARIOS[i]);
    $('#simulator').scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  });
});

// ── 아래쪽 읽을거리: 데이터로 그리는 세 곳 ────────────────
// 1) 결과물 파일 여섯 가지: 데모를 돌리지 않아도 실제 파일을 바로 열어 볼 수 있게
const fileGrid = $('#file-grid');
Object.entries(OUTPUTS).forEach(([key, o]) => {
  const card = el('div', 'ag-dl');
  const img = el('img', 'ag-dl-img');
  img.src = `assets/agent/${o.img}.webp`;
  img.alt = `${o.name} 화면 예시`;
  img.loading = 'lazy';
  const head = el('p', 'ag-dl-head');
  head.append(el('strong', '', o.name), el('span', 'ag-out-meta', o.meta));
  card.append(img, head, fileLinks(key));
  fileGrid.append(card);
});

// 2) 위니브가 쓰는 Skill 아홉 가지
const skillGrid = $('#weniv-skills');
WENIV_SKILLS.forEach((s) => {
  const card = el('div', 'ag-nine');
  card.append(el('span', 'ag-nine-tag', s.tag), el('span', 'ag-nine-role', s.role));
  skillGrid.append(card);
});

// 3) 그때와 지금. '그때'를 꽉 찬 막대로 두고 '지금'을 같은 비율로 줄여 그린다.
const thenNow = $('#then-now');
THEN_NOW.forEach((row) => {
  const item = el('div', 'ag-tn-row');
  const head = el('p', 'ag-tn-job');
  head.append(el('strong', '', row.job), el('span', 'ag-tn-ratio', `약 ${Math.round(row.thenH / row.nowH)}분의 1`));
  item.append(head);

  const then = el('div', 'ag-tn-bar');
  const thenFill = el('span', 'ag-tn-fill ag-tn-fill-then');
  thenFill.style.width = '100%';
  then.append(el('span', 'ag-tn-text', `그때 ${row.then}`), thenFill);

  const now = el('div', 'ag-tn-bar');
  const nowFill = el('span', 'ag-tn-fill ag-tn-fill-now');
  nowFill.style.width = `${Math.max(1.5, (row.nowH / row.thenH) * 100)}%`;
  now.append(el('span', 'ag-tn-text ag-tn-text-now', `지금 ${row.now}`), nowFill);

  item.append(then, now);
  thenNow.append(item);
});

initConcepts($('#concept-row'));

// ── 시작! ───────────────────────────────────────────────
player.reset(SCENARIOS[0]);
