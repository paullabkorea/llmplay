// twinSim.js — 두 시나리오를 나란히 재생하는 공용 화면 ('환각의 비밀'·'계산의 비밀'에서 사용).
// 왼쪽·오른쪽 질문을 같은 확률 기계에 동시에 넣고,
// 두 쪽 모두 같은 방식으로 다음 단어를 뽑아 나가는 모습을 나란히 보여 준다.
//
// 진행은 두 단계가 번갈아 반복되는 상태 기계다 (첫 페이지와 같은 조작 방식):
//   1단계(bars): 다음 단어 후보들의 확률 계산 → 막대로 표시
//   2단계(pick): 확률 룰렛으로 하나를 뽑아 답에 붙임
// '한 단계씩' 버튼으로 한 단계씩 볼 수도 있고, 자동 재생 + 속도 조절도 된다.
//
// 페이지마다 다른 것(시나리오, 노란색으로 강조할 정직한 후보, 평결 문구)은
// options로 받는다 — 이 파일은 어떤 페이지의 데이터도 직접 모른다.

import { el, formatPct } from '../utils.js';
import { getDistribution, sampleIndex } from '../core/model.js';
import { END_TOKEN } from '../config.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 각 단계가 화면에 머무는 기본 시간(ms). 속도 배율로 나눠서 사용. */
const DURATIONS = { bars: 2800, pick: 2000 };

/** 룰렛이 돌아가는 시간(ms) */
const ROULETTE_MS = 1100;

const DEFAULT_STAGE_LABELS = {
  idle: '자동 재생이나 한 단계씩을 눌러 시작해 보세요',
  bars: '1단계: 두 질문 모두, 다음 단어 후보의 확률을 계산해요',
  pick: '2단계: 확률 룰렛을 돌려 단어 하나를 뽑아 답에 붙여요',
  done: '끝! 두 답의 확신도를 비교해 보세요',
};

/**
 * @param refs    panels: { <key>: {answer, probList, conf}, ... },
 *                btnPlay, btnStep, btnReset, speedSelect, stageLabel, verdict, verdictText
 * @param options scenarios: { <key>: 시나리오, ... } — refs.panels와 같은 키,
 *                honestTokens: Set — 노란색으로 강조할 정직한 후보,
 *                buildVerdict({ avg, states }): 평결 HTML 문자열을 돌려주는 함수,
 *                stageLabels: '지금 하는 일' 문구 덮어쓰기(선택)
 */
export function initTwinSim(refs, options) {
  const { scenarios, honestTokens = new Set(), buildVerdict } = options;
  const stageLabels = { ...DEFAULT_STAGE_LABELS, ...(options.stageLabels ?? {}) };
  const keys = Object.keys(scenarios);

  let states;
  let phase = null;   // null(다음은 bars) | 'bars'(다음은 pick)
  let playing = false;
  let busy = false;   // 룰렛 연출 중 중복 진행 방지

  const speed = () => parseFloat(refs.speedSelect.value) || 1;

  function makeState(scenario) {
    return {
      scenario,
      lastToken: scenario.prompt[scenario.prompt.length - 1],
      generated: [],
      confidences: [], // 뽑힌 단어의 확률 (답 끝 제외)
      dist: null,      // 1단계에서 계산해 둔 분포
      done: false,
    };
  }

  const activeKeys = () => keys.filter((k) => !states[k].done);
  const finished = () => activeKeys().length === 0;

  // ── 그리기 ─────────────────────────────────────────
  function drawAnswer(key) {
    const { scenario, generated, done } = states[key];
    const area = refs.panels[key].answer;
    area.replaceChildren();
    scenario.prompt.forEach((t) => area.appendChild(el('span', 'ans-token ans-prompt', t)));
    generated.forEach((t) => area.appendChild(el('span', 'ans-token ans-generated', t)));
    if (!done) area.appendChild(el('span', 'ans-token ans-blank', '____'));
    else area.appendChild(el('span', 'ans-done', '답 완성'));
  }

  function drawBars(key) {
    const s = states[key];
    const list = refs.panels[key].probList;
    list.replaceChildren();
    const rows = s.dist.map((d) => {
      const row = el('div', `prob-row${honestTokens.has(d.token) ? ' honest' : ''}`);
      row.dataset.token = d.token;
      row.appendChild(el('span', 'prob-token', d.token === END_TOKEN ? '(답 끝)' : d.token));
      const track = el('div', 'prob-bar-track');
      const bar = el('div', 'prob-bar');
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(el('span', 'prob-pct', formatPct(d.p)));
      list.appendChild(row);
      return { bar, p: d.p };
    });
    // 붙인 다음 프레임에 너비를 넣어야 transition이 걸린다
    requestAnimationFrame(() => rows.forEach(({ bar, p }) => (bar.style.width = `${p * 100}%`)));
  }

  function setStage(name) {
    refs.stageLabel.textContent = stageLabels[name];
  }

  function setButtons() {
    refs.btnPlay.textContent = playing ? '멈추기' : '자동 재생';
    refs.btnStep.disabled = playing || busy;
  }

  // ── 2단계: 룰렛을 돌려 하나 뽑기 ───────────────────
  async function roulettePick(key) {
    const s = states[key];
    const list = refs.panels[key].probList;
    const rows = [...list.querySelectorAll('.prob-row')];
    const pickedIndex = sampleIndex(s.dist);
    const picked = s.dist[pickedIndex];

    // 룰렛 연출: 하이라이트가 후보들 위를 빙글 돌다가 당첨 칸에 멈춘다
    const spins = Math.max(6, Math.round((ROULETTE_MS / speed()) / 110));
    for (let i = 0; i < spins; i++) {
      rows.forEach((r) => r.classList.remove('spinning'));
      rows[i % rows.length]?.classList.add('spinning');
      await wait(110);
    }
    rows.forEach((r) => r.classList.remove('spinning'));
    rows[pickedIndex]?.classList.add('winner');

    // 뽑힌 단어 반영
    if (picked.token === END_TOKEN || s.generated.length >= s.scenario.maxRounds) {
      s.done = true;
    } else {
      s.confidences.push(picked.p);
      refs.panels[key].conf.textContent = formatPct(picked.p);
      s.generated.push(picked.token);
      s.lastToken = picked.token;
      if (!s.scenario.transitions[picked.token]) s.done = true;
    }
    drawAnswer(key);
  }

  // ── 한 단계 진행 ───────────────────────────────────
  async function next() {
    if (busy || finished()) return;
    busy = true;
    setButtons();

    if (phase !== 'bars') {
      // 1단계: 후보 확률 계산
      for (const key of activeKeys()) {
        const s = states[key];
        s.dist = getDistribution(s.scenario, s.lastToken);
        drawBars(key);
      }
      setStage('bars');
      phase = 'bars';
    } else {
      // 2단계: 룰렛 뽑기 (두 패널 동시에)
      setStage('pick');
      await Promise.all(activeKeys().map((key) => roulettePick(key)));
      phase = null;
      if (finished()) showVerdict();
    }

    busy = false;
    setButtons();
  }

  // ── 평결 ───────────────────────────────────────────
  function avgConf(key) {
    const c = states[key].confidences;
    return c.length ? c.reduce((a, b) => a + b, 0) / c.length : 0;
  }

  function showVerdict() {
    setStage('done');
    const avg = Object.fromEntries(keys.map((k) => [k, avgConf(k)]));
    refs.verdictText.innerHTML = buildVerdict({ avg, states });
    refs.verdict.hidden = false;
  }

  // ── 자동 재생 ──────────────────────────────────────
  function stopAuto() {
    playing = false;
    setButtons();
  }

  async function play() {
    if (playing) {
      stopAuto();
      return;
    }
    if (finished()) reset();
    playing = true;
    setButtons();
    while (playing && !finished()) {
      await next();
      if (finished()) break; // 답이 완성됐으면 바로 멈춤
      const d = phase === 'bars' ? DURATIONS.bars : DURATIONS.pick;
      await wait(d / speed());
    }
    stopAuto();
  }

  function onStep() {
    stopAuto();
    if (finished()) reset();
    next();
  }

  // ── 초기화 ─────────────────────────────────────────
  function reset() {
    stopAuto();
    states = Object.fromEntries(keys.map((k) => [k, makeState(scenarios[k])]));
    phase = null;
    refs.verdict.hidden = true;
    setStage('idle');
    for (const key of keys) {
      drawAnswer(key);
      refs.panels[key].conf.textContent = '—';
      refs.panels[key].probList.replaceChildren(
        el('p', 'prob-placeholder', '후보 확률을 계산하면\n여기에 막대가 나타나요'),
      );
    }
    setButtons();
  }

  refs.btnPlay.addEventListener('click', play);
  refs.btnStep.addEventListener('click', onStep);
  refs.btnReset.addEventListener('click', reset);

  reset();
}
