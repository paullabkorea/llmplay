// promptSim.js — '프롬프트의 비밀' 데모 1 (같은 질문, 다른 앞글).
// 앞글 버튼을 누르면 왼쪽 '전송되는 글'이 바뀌고, 오른쪽 방향 확률 막대가
// 같은 자리에서 스르륵 재배치된다. 룰렛 버튼으로 실제 답 방향을 뽑아 볼 수 있다.

import { el, formatPct } from '../utils.js';
import { sampleIndex } from '../core/model.js';
import { QUESTION, DIRECTIONS, VARIANTS } from './data.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 룰렛이 돌아가는 시간(ms) */
const ROULETTE_MS = 1100;

/** variant의 weights를 DIRECTIONS 순서의 확률 배열로 정규화 */
export function toDistribution(variant) {
  const sum = DIRECTIONS.reduce((a, d) => a + variant.weights[d.id], 0);
  return DIRECTIONS.map((d) => ({ token: d.id, p: variant.weights[d.id] / sum }));
}

export function initPromptSim(refs) {
  // refs: variantRow, sendPrefix, sendQuestion, probList, variantNote,
  //       btnSample, sampledAnswer

  let current = VARIANTS[0];
  let spinId = 0;   // 앞글이 바뀌면 진행 중인 룰렛 연출을 무효화
  let busy = false;

  refs.sendQuestion.textContent = QUESTION;

  // ── 방향 막대: 한 번만 만들고, 앞글이 바뀌면 너비만 다시 계산 ──
  const rows = DIRECTIONS.map((d) => {
    const row = el('div', 'prob-row');
    row.dataset.direction = d.id;
    row.appendChild(el('span', 'prob-token', d.label));
    const track = el('div', 'prob-bar-track');
    const bar = el('div', 'prob-bar');
    track.appendChild(bar);
    row.appendChild(track);
    const pct = el('span', 'prob-pct', '—');
    row.appendChild(pct);
    refs.probList.appendChild(row);
    return { row, bar, pct };
  });

  function drawBars() {
    const dist = toDistribution(current);
    dist.forEach((d, i) => {
      rows[i].bar.style.width = `${d.p * 100}%`;
      rows[i].pct.textContent = formatPct(d.p);
    });
  }

  // ── 앞글 버튼 ──
  const buttons = VARIANTS.map((v) => {
    const btn = el('button', 'variant-btn', v.btn);
    btn.type = 'button';
    btn.addEventListener('click', () => selectVariant(v));
    refs.variantRow.appendChild(btn);
    return { v, btn };
  });

  function selectVariant(v) {
    current = v;
    spinId++; // 돌던 룰렛 무효화
    busy = false;
    buttons.forEach(({ v: bv, btn }) => btn.classList.toggle('active', bv.id === v.id));

    // 전송되는 글
    if (v.prefix) {
      refs.sendPrefix.textContent = v.prefix;
      refs.sendPrefix.classList.remove('empty');
    } else {
      refs.sendPrefix.textContent = '(추가한 앞글 없음)';
      refs.sendPrefix.classList.add('empty');
    }

    refs.variantNote.textContent = v.note;
    rows.forEach(({ row }) => row.classList.remove('spinning', 'winner'));
    refs.sampledAnswer.hidden = true;
    refs.btnSample.disabled = false;
    drawBars();
  }

  // ── 룰렛으로 답 방향 뽑기 ──
  async function sample() {
    if (busy) return;
    busy = true;
    refs.btnSample.disabled = true;
    const myId = ++spinId;

    rows.forEach(({ row }) => row.classList.remove('winner'));
    refs.sampledAnswer.hidden = true;

    const dist = toDistribution(current);
    const pickedIndex = sampleIndex(dist);

    const spins = Math.max(8, Math.round(ROULETTE_MS / 110));
    for (let i = 0; i < spins; i++) {
      if (spinId !== myId) return; // 도중에 앞글이 바뀜
      rows.forEach(({ row }) => row.classList.remove('spinning'));
      rows[i % rows.length].row.classList.add('spinning');
      await wait(110);
    }
    if (spinId !== myId) return;

    rows.forEach(({ row }) => row.classList.remove('spinning'));
    rows[pickedIndex].row.classList.add('winner');

    const picked = DIRECTIONS[pickedIndex];
    refs.sampledAnswer.replaceChildren(
      el('p', 'sampled-direction', `${picked.label} 방향이 뽑혔어요 (확률 ${formatPct(dist[pickedIndex].p)})`),
      el('p', 'sampled-text', picked.answer),
    );
    refs.sampledAnswer.hidden = false;

    busy = false;
    refs.btnSample.disabled = false;
  }

  refs.btnSample.addEventListener('click', sample);

  selectVariant(VARIANTS[0]);
}
