// digits.js — '계산의 비밀' 자릿수 vs 토큰 어긋남 실험.
// 같은 숫자를 사람은 오른쪽(일의 자리)부터 3칸씩 묶어 읽지만,
// 토크나이저는 앞(왼쪽)에서부터 잘라서 묶음이 어긋나는 것을 보여 준다.
// 순수 함수(chunksLtr·groupsRtl·isAligned·placeName)는 테스트에서 그대로 쓴다.

import { el, tokenHue } from '../utils.js';
import { tokenId } from '../tokens/tokenizer.js';

/** 자릿수 이름 — 오른쪽에서 i번째(0부터) 자리 */
const PLACES = ['일', '십', '백', '천', '만', '십만', '백만', '천만', '억'];

export function placeName(i) {
  return PLACES[i] ?? '';
}

/** 토크나이저 흉내: 앞(왼쪽)에서부터 3자리씩 자른다 — GPT 계열이 실제로 쓰는 방식 */
export function chunksLtr(digits) {
  const out = [];
  for (let i = 0; i < digits.length; i += 3) out.push(digits.slice(i, i + 3));
  return out;
}

/** 사람의 눈금: 오른쪽(일의 자리)에서부터 3자리씩, 천 단위 쉼표 묶음 */
export function groupsRtl(digits) {
  const out = [];
  for (let end = digits.length; end > 0; end -= 3) {
    out.unshift(digits.slice(Math.max(0, end - 3), end));
  }
  return out;
}

/** 두 묶음의 경계가 완전히 일치하는가 (자릿수가 3의 배수일 때만 우연히 맞는다) */
export function isAligned(digits) {
  return digits.length <= 3 || digits.length % 3 === 0;
}

/** 트윈 시뮬레이터의 그 문제(48,372)와 같은 숫자에서 시작한다 */
const BASE = '48372';
/** '앞에 숫자 하나 붙이기'를 누를 때마다 순서대로 붙는 숫자들 */
const GROW = ['1', '9', '5', '7'];

export function initDigitSim({ grid, verdict, trace, btnGrow, btnReset }) {
  let extra = 0;             // 지금까지 앞에 붙인 숫자 개수
  const tailHistory = [];    // 일의 자리가 들어간 조각의 변천사

  function currentDigits() {
    return GROW.slice(0, extra).reverse().join('') + BASE;
  }

  function render(recordTail) {
    const digits = currentDigits();
    const n = digits.length;
    const groups = groupsRtl(digits);
    const chunks = chunksLtr(digits);

    grid.style.setProperty('--dg-n', n);
    grid.replaceChildren();

    // ① 사람 줄: 자리마다 셀 + 자릿수 이름, 3칸 묶음마다 배경 교차 + 쉼표
    [...digits].forEach((d, i) => {
      const fromRight = n - 1 - i;
      const groupIdx = Math.floor(fromRight / 3);
      const cell = el('div', `dg-cell${groupIdx % 2 ? ' dg-alt' : ''}`);
      if (i > 0 && (n - i) % 3 === 0) cell.classList.add('dg-comma');
      cell.style.gridColumn = String(i + 1);
      cell.appendChild(el('span', 'dg-digit', d));
      cell.appendChild(el('span', 'dg-place', placeName(fromRight)));
      grid.appendChild(cell);
    });

    // ② 가운데 안내 줄
    grid.appendChild(el('div', 'dg-mid', 'AI가 보는 것: 토큰 묶음 (앞에서부터 3칸씩) ↓'));

    // ③ 토큰 칩 줄 — 어휘표 번호는 토큰의 비밀 페이지와 같은 규칙으로 붙인다
    let col = 1;
    for (const chunk of chunks) {
      const chip = el('div', 'dg-chip');
      chip.style.setProperty('--tok-color', `hsl(${tokenHue(chunk)} 70% 45%)`);
      chip.style.gridColumn = `${col} / span ${chunk.length}`;
      // 칩의 왼쪽 경계가 자릿수 묶음 한가운데를 가르면 칼자국 표시
      const boundary = col - 1;
      if (boundary > 0 && (n - boundary) % 3 !== 0) chip.classList.add('dg-cut');
      chip.appendChild(el('span', 'dg-chip-text', chunk));
      chip.appendChild(el('span', 'dg-chip-id', `#${tokenId(chunk)}`));
      grid.appendChild(chip);
      col += chunk.length;
    }

    // ④ 평결 + 일의 자리 추적
    const human = groups.join(',');
    const tok = chunks.join(' · ');
    verdict.innerHTML = isAligned(digits)
      ? `이번엔 우연히 두 묶음이 딱 맞았어요: <strong>${human}</strong>. ` +
        '하지만 앞에 숫자 하나만 붙으면 다시 어긋나요.'
      : `자릿수 묶음 <strong>${human}</strong> vs 토큰 묶음 <strong>${tok}</strong> — ` +
        '자르는 위치가 달라요. <span class="dg-cut-mark">빨간 점선</span>이 자릿수 묶음 속을 가른 자리예요.';

    if (recordTail) tailHistory.push(chunks[chunks.length - 1]);
    trace.textContent = `일의 자리 숫자 ${digits[n - 1]}가 든 조각: ${tailHistory.join(' → ')}`;

    btnGrow.disabled = extra >= GROW.length;
  }

  btnGrow.addEventListener('click', () => {
    if (extra >= GROW.length) return;
    extra += 1;
    render(true);
  });

  btnReset.addEventListener('click', () => {
    extra = 0;
    tailHistory.length = 0;
    render(true);
  });

  render(true);
}
