// usage/app.js — '사용의 비밀' 페이지 시작점.
// 데모 1(클릭하는 세계 지도)과 데모 2(한국 vs 세계 비교)를 그린다.
// 수치는 data.js(Anthropic Economic Index 원자료에서 추출)에서 온다.

import { $, el, formatNumber } from '../utils.js';
import { initConcepts } from '../ui/concepts.js';
import { REQUEST_LABELS, GLOBAL, COUNTRIES } from './data.js';

const USE_LABELS = ['업무', '학업', '개인'];
const COLLAB_LABELS = ['지시하기', '작업 반복', '배우기', '피드백 반복', '검증하기'];

// 사용 비중 순위 (지도 색과 상세 패널의 '세계 N위'에 사용)
const RANKED = Object.entries(COUNTRIES).sort((a, b) => b[1].p - a[1].p);
const RANK = new Map(RANKED.map(([code], i) => [code, i + 1]));

// 인구 10만 명당 대화 수 순위
const PC_RANKED = Object.entries(COUNTRIES)
  .filter(([, d]) => d.pc != null)
  .sort((a, b) => b[1].pc - a[1].pc);
const PC_RANK = new Map(PC_RANKED.map(([code], i) => [code, i + 1]));

// 나라 이름 한글 표기는 브라우저 내장 Intl에 맡긴다
const regionNames = (() => {
  try { return new Intl.DisplayNames(['ko'], { type: 'region' }); } catch { return null; }
})();

function countryName(code) {
  try {
    const name = regionNames?.of(code);
    return name && name !== code ? name : code;
  } catch { return code; }
}

/* ── 데모 1: 지도 ── */

const mapWrap = $('#map-wrap');
const detailBox = $('#country-detail');
const countrySelect = $('#country-select');

// 지도 색칠 기준 2가지. 값 편차가 커서 구간을 손으로 나눴다.
const MODES = {
  total: {
    value: (d) => d.p,
    tip: (d) => `세계 비중 ${d.p}%`,
    levels: [
      { min: 10, cls: 'lv5', label: '10% 이상' },
      { min: 4, cls: 'lv4', label: '4~10%' },
      { min: 1.5, cls: 'lv3', label: '1.5~4%' },
      { min: 0.5, cls: 'lv2', label: '0.5~1.5%' },
      { min: 0.1, cls: 'lv1', label: '0.1~0.5%' },
      { min: 0, cls: 'lv0', label: '0.1% 미만' },
    ],
  },
  percap: {
    value: (d) => d.pc,
    tip: (d) => `10만 명당 ${d.pc}건`,
    levels: [
      { min: 60, cls: 'lv5', label: '10만 명당 60건 이상' },
      { min: 40, cls: 'lv4', label: '40~60건' },
      { min: 20, cls: 'lv3', label: '20~40건' },
      { min: 8, cls: 'lv2', label: '8~20건' },
      { min: 2, cls: 'lv1', label: '2~8건' },
      { min: 0, cls: 'lv0', label: '2건 미만' },
    ],
  },
};

let mapMode = 'total';

function levelOf(mode, d) {
  const value = MODES[mode].value(d);
  if (value == null) return null;
  const levels = MODES[mode].levels;
  return levels.find((l) => value >= l.min) ?? levels[levels.length - 1];
}

let selectedPath = null;

function selectCountry(code) {
  const svg = mapWrap.querySelector('svg');
  selectedPath?.classList.remove('selected');
  selectedPath = svg?.querySelector(`[id="${code.toLowerCase()}"]`) ?? null;
  if (selectedPath) {
    selectedPath.classList.add('selected');
    // 나라가 겹쳐 그려질 때 선택 테두리가 가려지지 않게 맨 뒤로 이동
    selectedPath.parentNode.appendChild(selectedPath);
  }
  if (COUNTRIES[code]) countrySelect.value = code;
  renderDetail(code);
}

function renderDetail(code) {
  const d = COUNTRIES[code];
  detailBox.replaceChildren();

  const head = el('div', 'detail-head');
  head.appendChild(el('h3', 'detail-name', countryName(code)));
  if (d) {
    const badges = el('span', 'detail-badges');
    badges.appendChild(el('span', 'detail-rank', `사용량 ${RANK.get(code)}위`));
    if (PC_RANK.has(code)) {
      badges.appendChild(el('span', 'detail-rank soft', `인구 대비 ${PC_RANK.get(code)}위`));
    }
    head.appendChild(badges);
  }
  detailBox.appendChild(head);

  if (!d) {
    detailBox.appendChild(el('p', 'detail-empty',
      '이 나라는 일주일 대화 수가 적어 통계에 포함되지 않았어요. 색이 있는 나라를 골라 보세요.'));
    return;
  }

  // 요약 숫자 4개. 대화 수는 나라 전체 합이고, 1인당 체감은 10만 명당 칸이 담당한다.
  const stats = el('div', 'detail-stats');
  [
    ['세계 사용 비중', `${d.p}%`],
    ['일주일 대화 (나라 전체)', `${formatNumber(d.count)}건`],
    ['인구 10만 명당 대화', d.pc == null ? '-' : `${formatNumber(d.pc)}건`],
    ['작업 성공률', d.success == null ? '-' : `${d.success}%`],
  ].forEach(([label, value]) => {
    const cell = el('div', 'detail-stat');
    cell.appendChild(el('strong', '', value));
    cell.appendChild(el('span', '', label));
    stats.appendChild(cell);
  });
  detailBox.appendChild(stats);

  // 많이 시키는 일 TOP 3
  detailBox.appendChild(el('h4', 'detail-sub-title', '많이 시키는 일 TOP 3'));
  const topList = el('div', 'detail-top');
  const maxPct = d.top[0]?.[1] || 1;
  d.top.slice(0, 3).forEach(([labelIdx, pct], i) => {
    const row = el('div', 'detail-top-row');
    row.appendChild(el('span', 'detail-top-rank', String(i + 1)));
    const body = el('div', 'detail-top-body');
    body.appendChild(el('span', 'detail-top-label', REQUEST_LABELS[labelIdx]));
    const track = el('div', 'detail-top-track');
    const fill = el('div', 'detail-top-fill');
    fill.style.width = `${(pct / maxPct) * 100}%`;
    track.appendChild(fill);
    body.appendChild(track);
    row.appendChild(body);
    row.appendChild(el('span', 'detail-top-pct', `${pct}%`));
    topList.appendChild(row);
  });
  detailBox.appendChild(topList);

  // 용도(업무·학업·개인) 나눔 막대
  detailBox.appendChild(el('h4', 'detail-sub-title', '무엇에 쓸까'));
  const useBar = el('div', 'use-bar');
  const useLegend = el('div', 'use-legend');
  d.use.forEach((pct, i) => {
    const seg = el('div', `use-seg u${i}`);
    seg.style.width = `${pct}%`;
    useBar.appendChild(seg);
    useLegend.appendChild(el('span', `use-key u${i}`, `${USE_LABELS[i]} ${pct}%`));
  });
  detailBox.appendChild(useBar);
  detailBox.appendChild(useLegend);

  // 협업 방식 1위
  const topCollab = d.collab.indexOf(Math.max(...d.collab));
  const collabLine = el('p', 'detail-collab');
  collabLine.innerHTML =
    `함께 일하는 방식 1위는 <strong>${COLLAB_LABELS[topCollab]}</strong> (${d.collab[topCollab]}%)`;
  detailBox.appendChild(collabLine);
}

/* 지도 SVG를 불러와 색칠하고 클릭·툴팁을 단다 */
async function initMap() {
  const res = await fetch('assets/world-map.svg');
  const text = await res.text();
  mapWrap.innerHTML = text.slice(text.indexOf('<svg'));

  const svg = mapWrap.querySelector('svg');
  svg.removeAttribute('width');
  svg.removeAttribute('height');

  // 여러 조각으로 된 나라는 <g id="xx">, 한 조각인 나라는 <path id="xx">
  const countryNodes = [];
  svg.querySelectorAll('path[id], g[id]').forEach((node) => {
    node.classList.add('country');
    const code = node.id.length === 2 ? node.id.toUpperCase() : null;
    const d = code && COUNTRIES[code];
    if (d) {
      countryNodes.push([node, d]);
      node.dataset.code = code;
    } else {
      node.classList.add('no-data');
      if (code) node.dataset.code = code; // 데이터 없는 나라도 이름은 보여준다
    }
  });

  // 현재 기준(전체/인구 대비)에 맞춰 나라를 다시 색칠한다
  function recolor() {
    countryNodes.forEach(([node, d]) => {
      node.classList.remove('lv0', 'lv1', 'lv2', 'lv3', 'lv4', 'lv5', 'no-data');
      const level = levelOf(mapMode, d);
      node.classList.add(level ? level.cls : 'no-data');
    });
    renderLegend();
  }
  recolor();

  // 색칠 기준 토글
  $('#map-mode').addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn || btn.dataset.mode === mapMode) return;
    mapMode = btn.dataset.mode;
    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    recolor();
  });

  // 클릭으로 나라 선택
  svg.addEventListener('click', (e) => {
    const code = e.target.closest('[data-code]')?.dataset.code;
    if (code) selectCountry(code);
  });

  // 마우스를 따라다니는 이름 툴팁
  const tip = el('div', 'map-tip');
  tip.hidden = true;
  mapWrap.appendChild(tip);

  svg.addEventListener('mousemove', (e) => {
    const code = e.target.closest('[data-code]')?.dataset.code;
    if (!code) { tip.hidden = true; return; }
    const d = COUNTRIES[code];
    tip.textContent = d
      ? `${countryName(code)} · ${MODES[mapMode].tip(d)}`
      : `${countryName(code)} · 데이터 없음`;
    tip.hidden = false;
    const rect = mapWrap.getBoundingClientRect();
    tip.style.left = `${e.clientX - rect.left + 14}px`;
    tip.style.top = `${e.clientY - rect.top + 14}px`;
  });
  svg.addEventListener('mouseleave', () => { tip.hidden = true; });

  selectCountry('KR');
}

// 범례 (색칠 기준이 바뀔 때마다 다시 그린다)
function renderLegend() {
  const legend = $('#map-legend');
  legend.replaceChildren();
  [...MODES[mapMode].levels].reverse().forEach(({ cls, label }) => {
    const item = el('span', 'legend-item');
    item.appendChild(el('i', `legend-chip ${cls}`));
    item.appendChild(el('span', '', label));
    legend.appendChild(item);
  });
  const noneItem = el('span', 'legend-item');
  noneItem.appendChild(el('i', 'legend-chip none'));
  noneItem.appendChild(el('span', '', '데이터 없음'));
  legend.appendChild(noneItem);
}

// 나라 고르기 셀렉트 (작아서 클릭이 어려운 나라를 위한 대체 수단)
RANKED.forEach(([code, d]) => {
  const opt = el('option', '', `${RANK.get(code)}위 ${countryName(code)} (${d.p}%)`);
  opt.value = code;
  countrySelect.appendChild(opt);
});
countrySelect.addEventListener('change', () => selectCountry(countrySelect.value));

initMap();

/* ── 데모 2: 한국 vs 세계 ── */

const KR = COUNTRIES.KR;

/** 항목마다 한국·세계 막대 한 쌍을 그린다 */
function renderDuoChart(container, labels, krValues, glValues) {
  const max = Math.max(...krValues, ...glValues) * 1.08;
  const fills = [];

  labels.forEach((label, i) => {
    const row = el('div', 'duo-row');
    row.appendChild(el('span', 'duo-label', label));

    const bars = el('div', 'duo-bars');
    [[krValues[i], 'kr'], [glValues[i], 'gl']].forEach(([value, cls]) => {
      const track = el('div', 'duo-track');
      const fill = el('div', `duo-fill ${cls}`);
      track.appendChild(fill);
      const pct = el('span', 'duo-pct', `${value}%`);
      track.appendChild(pct);
      bars.appendChild(track);
      fills.push([fill, pct, (value / max) * 100]);
    });
    row.appendChild(bars);
    container.appendChild(row);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fills.forEach(([fill, pct, width]) => {
        fill.style.width = `${width}%`;
        pct.style.left = `calc(${width}% + 8px)`;
      });
    });
  });
}

renderDuoChart($('#chart-use'), USE_LABELS, KR.use, GLOBAL.use);
renderDuoChart($('#chart-collab'), COLLAB_LABELS, KR.collab, GLOBAL.collab);

/** TOP 5 요청 목록 한 줄 */
function renderTopList(container, top) {
  const maxPct = top[0]?.[1] || 1;
  top.forEach(([labelIdx, pct], i) => {
    const row = el('div', 'top-row');
    row.appendChild(el('span', 'top-rank', String(i + 1)));
    const body = el('div', 'top-body');
    body.appendChild(el('span', 'top-label', REQUEST_LABELS[labelIdx]));
    const track = el('div', 'top-track');
    const fill = el('div', 'top-fill');
    fill.style.width = `${(pct / maxPct) * 100}%`;
    track.appendChild(fill);
    body.appendChild(track);
    row.appendChild(body);
    row.appendChild(el('span', 'top-pct', `${pct}%`));
    container.appendChild(row);
  });
}

renderTopList($('#top-kr'), KR.top);
renderTopList($('#top-global'), GLOBAL.top);

// 비교 평결 문장 (수치는 데이터에서 그대로 가져와 어긋나지 않게)
const krTop = KR.top[0];
const glTop = GLOBAL.top[0];
const iterIdx = COLLAB_LABELS.indexOf('작업 반복');
$('#usage-verdict').innerHTML =
  `<p>세계 1위 요청은 <strong>${REQUEST_LABELS[glTop[0]]}</strong>(${glTop[1]}%)인데, ` +
  `한국 1위는 <strong>${REQUEST_LABELS[krTop[0]]}</strong>(${krTop[1]}%)이에요. ` +
  `협업 방식도 한국은 '작업 반복'이 ${KR.collab[iterIdx]}%로 세계 평균(${GLOBAL.collab[iterIdx]}%)보다 높아요. ` +
  `결과를 한 번에 받고 끝내는 게 아니라 <strong>여러 번 주고받으며 다듬는 것</strong>이 한국의 특징이에요.</p>`;

/* ── 핵심 개념 ── */

initConcepts($('#concept-row'));
