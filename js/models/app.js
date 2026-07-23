// models/app.js — '모델의 비밀' 페이지 시작점.
// 데모 1(다이얼 판과 점수 곡선), 데모 2(가격 그래프), 데모 3(성능·속도),
// 데모 4(작업에 맞는 모델 고르기)를 그린다.
//
// 모델 가격·성능·작업 데이터는 data.js에서 관리한다.

import { $, el } from '../utils.js';
import { initConcepts } from '../ui/concepts.js';
import { MODELS, TASKS, USD_TO_KRW } from './data.js';

/* ── 공통: 세로 막대 그래프 ── */

function renderBarChart(container, rows, maxValue, formatValue) {
  container.replaceChildren();
  const anims = [];

  rows.forEach(({ label, value }) => {
    const item = el('div', 'col-item');

    const track = el('div', 'col-track');
    const fill = el('div', 'col-fill');
    const val = el('span', 'col-value', formatValue(value));
    track.appendChild(fill);
    track.appendChild(val);
    item.appendChild(track);

    item.appendChild(el('span', 'col-label', label));
    container.appendChild(item);
    anims.push([fill, val, (value / maxValue) * 100]);
  });

  // 그린 직후 높이를 넣어 트랜지션으로 차오르게 한다. 값 라벨은 막대 끝을 따라간다.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      anims.forEach(([fill, val, pct]) => {
        fill.style.height = `${pct}%`;
        val.style.bottom = `calc(${pct}% + 6px)`;
      });
    });
  });
}

/* ── 데모 1: 다이얼 판과 점수 곡선 ── */

const sizeRow = $('#size-row');
const dialCanvas = $('#dial-canvas');
const curveCanvas = $('#curve-canvas');
const dialCount = $('#dial-count');
const sizeVerdict = $('#size-verdict');

let dialAnimToken = 0; // 다른 모델을 고르면 진행 중인 그리기를 멈추는 표식

/** 둥근 사각형 경로 (index의 networkView와 같은 직접 구현) */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 다이얼 판: 개수가 많아질수록 다이얼이 작아지며 판을 가득 채운다.
    약 1초에 걸쳐 다이얼이 차오르고, 아래 카운터가 함께 올라간다. */
function drawDialBoard(model) {
  const ctx = dialCanvas.getContext('2d');
  const W = dialCanvas.width;
  const H = dialCanvas.height;
  const pad = 14;
  const bw = W - pad * 2;
  const bh = H - pad * 2;

  // 개수에 맞춰 격자 크기 결정
  const cell = Math.sqrt((bw * bh) / model.dials);
  const cols = Math.max(1, Math.round(bw / cell));
  const rows = Math.ceil(model.dials / cols);
  const cw = bw / cols;
  const ch = bh / rows;
  const r = Math.min(cw, ch) * 0.36;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'hsl(215 25% 97%)';
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.lineWidth = 1;
  roundRect(ctx, pad - 8, pad - 8, bw + 16, bh + 16, 10);
  ctx.fill();
  ctx.stroke();

  function drawDial(i) {
    const cx = pad + cw * ((i % cols) + 0.5);
    const cy = pad + ch * (Math.floor(i / cols) + 0.5);

    if (r >= 4) {
      // 원판 + 바늘 (단어 맞히기 페이지와 같은 모습)
      const angle = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(215 20% 89%)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r * 0.85, cy + Math.sin(angle) * r * 0.85);
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.8)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else if (r >= 1.6) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(71, 85, 105, 0.55)';
      ctx.fill();
    } else {
      // 너무 작아서 점으로만 표시 (10만 개 구간)
      ctx.fillStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.fillRect(cx - 0.6, cy - 0.6, 1.2, 1.2);
    }
  }

  // 시간 기반으로 약 0.9초에 걸쳐 채운다. 프레임이 드문 환경(백그라운드 탭 등)에서도
  // 경과 시간만큼 따라잡아 그리므로 반드시 끝까지 채워진다.
  const token = ++dialAnimToken;
  const total = model.dials;
  const DURATION = 900;
  const start = performance.now();
  let drawn = 0;

  function frame(now) {
    if (token !== dialAnimToken) return;
    const progress = Math.min(1, (now - start) / DURATION);
    const target = Math.max(1, Math.floor(total * progress));
    for (; drawn < target; drawn++) drawDial(drawn);
    if (progress < 1) {
      dialCount.textContent = `다이얼 ${drawn.toLocaleString('ko-KR')}개…`;
      requestAnimationFrame(frame);
    } else {
      const rel = model.mult === '1배' ? '기준 크기' : `가장 작은 모델의 ${model.mult}`;
      dialCount.textContent = `다이얼 ${total.toLocaleString('ko-KR')}개 · ${rel} (어림 모형)`;
    }
  }
  requestAnimationFrame(frame);
}

/** 점수 곡선: 가로축은 다이얼 수(한 칸에 10배), 세로축은 성능 지수.
    "10배마다 점수도 10배라면?"의 기대 직선은 그래프 위로 뚫고 나가고,
    실제 곡선은 갈수록 완만해지는 것을 대비해 보여준다. */
function drawCurve(selIndex) {
  const ctx = curveCanvas.getContext('2d');
  const W = curveCanvas.width;
  const H = curveCanvas.height;
  const L = 44, R = 18, T = 30, B = 46;
  const plotW = W - L - R;
  const plotH = H - T - B;
  const xOf = (i) => L + (plotW * i) / (MODELS.length - 1);
  const yOf = (v) => T + plotH * (1 - v / 100);

  ctx.clearRect(0, 0, W, H);

  // 가로 눈금선 (0, 50, 100점)
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  [0, 50, 100].forEach((v) => {
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L, yOf(v));
    ctx.lineTo(W - R, yOf(v));
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${v}점`, L - 6, yOf(v));
  });

  // 기대 직선: 첫 모델에서 출발해 "10배마다 점수도 10배"로 올라가면
  // 다음 칸에 닿기도 전에 그래프 천장을 뚫는다.
  const x0 = xOf(0);
  const y0 = yOf(MODELS[0].perf);
  const yNaive = yOf(MODELS[0].perf * 10); // 100점 위 저 멀리 (음수 좌표)
  const tTop = (y0 - T) / (y0 - yNaive);   // 천장(y=T)과 만나는 지점
  const xTop = x0 + (xOf(1) - x0) * tTop;
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(xTop, T);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(220, 38, 38, 0.75)';
  ctx.textAlign = 'left';
  ctx.fillText('10배마다 점수도 10배라면?', xTop + 6, T + 2);

  // 실제 곡선
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  MODELS.forEach((m, i) => {
    if (i === 0) ctx.moveTo(xOf(i), yOf(m.perf));
    else ctx.lineTo(xOf(i), yOf(m.perf));
  });
  ctx.stroke();

  // 점 + 라벨
  MODELS.forEach((m, i) => {
    const x = xOf(i);
    const y = yOf(m.perf);
    const sel = i === selIndex;
    // 양 끝 라벨이 캔버스 밖으로 잘리지 않게 안쪽으로 당긴다
    const labelX = Math.min(Math.max(x, 42), W - 44);

    ctx.beginPath();
    ctx.arc(x, y, sel ? 7 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = sel ? '#4f46e5' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (sel) {
      ctx.font = '700 12px sans-serif';
      ctx.fillStyle = '#3730a3';
      ctx.textAlign = 'center';
      ctx.fillText(`${m.perf}점`, labelX, y - 14);
    }

    // 가로축 라벨: 모델 이름 + 다이얼 배수
    ctx.textAlign = 'center';
    ctx.font = sel ? '700 11px sans-serif' : '11px sans-serif';
    ctx.fillStyle = sel ? '#3730a3' : '#64748b';
    ctx.fillText(m.name, labelX, H - B + 16);
    ctx.fillText(`다이얼 ${m.mult}`, labelX, H - B + 30);
  });
}

function selectSizeModel(index) {
  const m = MODELS[index];
  const base = MODELS[0];

  [...sizeRow.children].forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
    btn.setAttribute('aria-pressed', String(i === index));
  });

  drawDialBoard(m);
  drawCurve(index);

  sizeVerdict.replaceChildren();
  const p = el('p');
  if (index === 0) {
    p.innerHTML =
      `<strong>${m.name}</strong>가 기준이에요. 다이얼이 가장 적어서 점수는 낮지만 ` +
      `가장 빠르고 저렴하죠. 더 큰 모델을 눌러 다이얼 수와 점수가 어떻게 변하는지 보세요.`;
  } else {
    const ratio = (Math.round((m.perf / base.perf) * 10) / 10).toLocaleString('ko-KR');
    p.innerHTML =
      `다이얼은 <strong>${m.mult}</strong>로 늘었는데 점수는 ${base.perf}점에서 ` +
      `${m.perf}점, <strong>${ratio}배</strong>예요. 다이얼과 학습을 늘릴수록 성능은 ` +
      `오르지만, 갈수록 조금씩만 올라요.`;
  }
  sizeVerdict.appendChild(p);
}

MODELS.forEach((m, i) => {
  const btn = el('button', 'variant-btn', m.name);
  btn.type = 'button';
  btn.addEventListener('click', () => selectSizeModel(i));
  sizeRow.appendChild(btn);
});

selectSizeModel(0);

/* ── 데모 2: 가격 그래프 ── */

renderBarChart(
  $('#chart-input'),
  MODELS.map((m) => ({ label: m.name, value: m.input })),
  Math.max(...MODELS.map((m) => m.input)),
  (v) => `$${v}`,
);

renderBarChart(
  $('#chart-output'),
  MODELS.map((m) => ({ label: m.name, value: m.output })),
  Math.max(...MODELS.map((m) => m.output)),
  (v) => `$${v}`,
);

/* ── 데모 3: 성능 그래프 + 속도 목록 ── */

renderBarChart(
  $('#chart-perf'),
  MODELS.map((m) => ({ label: m.name, value: m.perf })),
  100,
  (v) => `${v}점`,
);

// 상대 속도 경주: 모든 모델이 동시에 출발해 같은 시간 동안 토큰을 만든다.
// 빠른 모델의 막대가 눈에 띄게 앞서 나가고, 끝나면 그대로 비교 막대그래프가 된다.
const raceList = $('#race-list');
const raceReplay = $('#race-replay');
const RACE_MS = 2600;
const RACE_MAX = Math.max(...MODELS.map((m) => m.raceTokens));
let raceToken = 0; // 재시작 시 이전 경주를 멈추는 표식

const raceRows = MODELS.map((m) => {
  const row = el('div', 'race-row');
  row.appendChild(el('span', 'race-name', m.name));

  const track = el('div', 'race-track');
  const fill = el('div', 'race-fill');
  track.appendChild(fill);
  row.appendChild(track);

  const count = el('span', 'race-count', '0토큰');
  row.appendChild(count);
  row.appendChild(el('span', 'speed-badge', m.speed));

  raceList.appendChild(row);
  return { m, fill, count };
});

function runRace() {
  const token = ++raceToken;
  const start = performance.now();

  function frame(now) {
    if (token !== raceToken) return;
    const t = Math.min(1, (now - start) / RACE_MS);
    raceRows.forEach(({ m, fill, count }) => {
      const made = m.raceTokens * t;
      fill.style.width = `${(made / RACE_MAX) * 100}%`;
      count.textContent = `${Math.round(made)}토큰`;
    });
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

raceReplay.addEventListener('click', runRace);

// 패널이 화면에 처음 들어올 때 한 번 자동으로 출발
if ('IntersectionObserver' in window) {
  const raceObserver = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      runRace();
      raceObserver.disconnect();
    }
  }, { threshold: 0.4 });
  raceObserver.observe(raceList);
} else {
  runRace();
}

/* ── 데모 4: 작업에 맞는 모델 고르기 ── */

const taskRow = $('#task-row');
const taskDesc = $('#task-desc');
const modelCards = $('#model-cards');
const pickVerdict = $('#pick-verdict');

/** 작업 1,000회에 드는 비용(달러) */
function costPer1000(model, task) {
  return ((task.inTok * model.input + task.outTok * model.output) / 1_000_000) * 1000;
}

function formatUsd(usd) {
  const rounded = usd >= 100 ? Math.round(usd) : Math.round(usd * 10) / 10;
  return `${rounded.toLocaleString('ko-KR')}달러`;
}

function formatKrw(usd) {
  const krw = usd * USD_TO_KRW;
  if (krw >= 10000) {
    const man = Math.round(krw / 1000) / 10; // 만 단위 소수 1자리
    return `약 ${man.toLocaleString('ko-KR')}만 원`;
  }
  return `약 ${(Math.round(krw / 100) * 100).toLocaleString('ko-KR')}원`;
}

function selectTask(index) {
  const task = TASKS[index];

  [...taskRow.children].forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
    btn.setAttribute('aria-pressed', String(i === index));
  });

  taskDesc.textContent = task.desc;

  // 성능이 충분한 모델 중 가장 저렴한 모델이 추천
  const capable = MODELS.filter((m) => m.perf >= task.need);
  const reco = capable.reduce((a, b) => (costPer1000(a, task) <= costPer1000(b, task) ? a : b));

  modelCards.replaceChildren();
  MODELS.forEach((m) => {
    const cost = costPer1000(m, task);
    const isReco = m === reco;
    const card = el('div', `model-card${isReco ? ' reco' : ''}`);

    const head = el('div', 'model-card-head');
    head.appendChild(el('span', 'model-card-name', m.name));
    head.appendChild(el('span', isReco ? 'reco-tag' : 'speed-badge', isReco ? '추천' : m.speed));
    card.appendChild(head);

    const costBox = el('div', 'model-card-cost', `1,000회 ${formatUsd(cost)}`);
    costBox.appendChild(el('small', '', formatKrw(cost)));
    card.appendChild(costBox);

    let verdict;
    if (m.perf < task.need) {
      verdict = el('div', 'model-card-verdict weak', '성능이 부족할 수 있어요');
    } else if (isReco) {
      verdict = el('div', 'model-card-verdict ok', '충분한 성능 중 가장 저렴해요');
    } else {
      verdict = el('div', 'model-card-verdict over', '충분하지만 더 비싸요');
    }
    card.appendChild(verdict);

    modelCards.appendChild(card);
  });

  const priciest = MODELS[MODELS.length - 1];
  const recoCost = costPer1000(reco, task);
  const priciestCost = costPer1000(priciest, task);

  pickVerdict.replaceChildren();
  const p = el('p');
  if (reco === priciest) {
    p.innerHTML =
      `이 작업은 어려워서 <strong>${reco.name}</strong>급 성능이 필요해요. ` +
      `이럴 때는 비싸고 느려도 큰 모델을 쓰는 게 결과적으로 이득이에요.`;
  } else {
    const savePct = Math.round((1 - recoCost / priciestCost) * 100);
    p.innerHTML =
      `이 작업은 <strong>${reco.name}</strong>이면 충분해요. ` +
      `가장 큰 모델(${priciest.name}) 대신 쓰면 비용을 <strong>약 ${savePct}%</strong> 아끼고, ` +
      `답도 더 빨리 받아요.`;
  }
  pickVerdict.appendChild(p);
}

TASKS.forEach((task, i) => {
  const btn = el('button', 'variant-btn', task.label);
  btn.type = 'button';
  btn.addEventListener('click', () => selectTask(i));
  taskRow.appendChild(btn);
});

selectTask(0);

/* ── 핵심 개념 ── */

initConcepts($('#concept-row'));
