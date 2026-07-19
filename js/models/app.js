// models/app.js — '모델의 비밀' 페이지 시작점.
// 데모 1(가격 그래프), 데모 2(성능·속도), 데모 3(작업에 맞는 모델 고르기)을 그린다.
//
// 데이터 출처 (페이지 하단 '자료 출처와 기준일' 섹션과 함께 관리):
// - 가격·상대 속도: Anthropic 공식 문서 Models overview / Pricing, 2026-07-19 확인
//   https://platform.claude.com/docs/en/about-claude/models/overview
// - 성능 지수: Artificial Analysis Intelligence Index v4.1, 2026년 7월
//   https://artificialanalysis.ai/models

import { $, el } from '../utils.js';
import { initConcepts } from '../ui/concepts.js';

const USD_TO_KRW = 1400; // 원화 어림 환산용. 출처 섹션에 명시된 가정값.

// 가격: 100만 토큰당 미국 달러, 정가 기준.
// Sonnet 5는 2026-08-31까지 입력 $2 / 출력 $10 프로모션이 있지만 그래프는 정가로 통일.
const MODELS = [
  { name: 'Haiku 4.5', input: 1, output: 5, perf: 37, speed: '가장 빠름', speedLevel: 4 },
  { name: 'Sonnet 5', input: 3, output: 15, perf: 53, speed: '빠름', speedLevel: 3 },
  { name: 'Opus 4.8', input: 5, output: 25, perf: 56, speed: '보통', speedLevel: 2 },
  { name: 'Fable 5', input: 10, output: 50, perf: 60, speed: '느림', speedLevel: 1 },
];

// 데모 3의 작업 목록. inTok/outTok은 1회 실행에 드는 대략적인 토큰 수,
// need는 결과 품질이 괜찮으려면 필요한 최소 성능 지수(교육용 어림값).
const TASKS = [
  {
    label: '맞춤법 고치기',
    desc: '짧은 글의 맞춤법과 띄어쓰기를 고쳐요. 1회에 대략 입력 600 + 출력 600 토큰.',
    inTok: 600, outTok: 600, need: 30,
  },
  {
    label: '기사 3줄 요약',
    desc: '뉴스 기사 한 편을 3줄로 줄여요. 1회에 대략 입력 2,000 + 출력 200 토큰.',
    inTok: 2000, outTok: 200, need: 30,
  },
  {
    label: '보고서 초안 쓰기',
    desc: '주제와 개요를 주면 수행평가 보고서 초안을 써요. 1회에 대략 입력 800 + 출력 2,500 토큰.',
    inTok: 800, outTok: 2500, need: 50,
  },
  {
    label: '코드 버그 찾기',
    desc: '꽤 긴 코드를 읽고 숨은 버그를 찾아 고쳐요. 1회에 대략 입력 6,000 + 출력 2,500 토큰.',
    inTok: 6000, outTok: 2500, need: 55,
  },
  {
    label: '긴 자동화 작업',
    desc: '자료 조사부터 정리까지 여러 단계를 혼자 처리하는 어려운 작업이에요. 1회에 대략 입력 30,000 + 출력 10,000 토큰.',
    inTok: 30000, outTok: 10000, need: 60,
  },
];

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

/* ── 데모 1: 가격 그래프 ── */

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

/* ── 데모 2: 성능 그래프 + 속도 목록 ── */

renderBarChart(
  $('#chart-perf'),
  MODELS.map((m) => ({ label: m.name, value: m.perf })),
  100,
  (v) => `${v}점`,
);

const speedList = $('#speed-list');
MODELS.forEach((m) => {
  const row = el('div', 'speed-row');
  row.appendChild(el('span', 'speed-name', m.name));

  const dots = el('div', 'speed-dots');
  for (let i = 0; i < 4; i++) {
    dots.appendChild(el('span', `speed-dot${i < m.speedLevel ? ' on' : ''}`));
  }
  row.appendChild(dots);

  row.appendChild(el('span', 'speed-badge', m.speed));
  speedList.appendChild(row);
});

/* ── 데모 3: 작업에 맞는 모델 고르기 ── */

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
