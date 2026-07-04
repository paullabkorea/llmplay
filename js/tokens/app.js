// tokens/app.js — '토큰의 비밀' 페이지 시작점.
// ① 토크나이저 놀이터  ② strawberry 실험  ③ 한국어 vs 영어 토큰 비용 비교

import { $, el, tokenHue, formatNumber } from '../utils.js';
import { tokenize } from './tokenizer.js';
import { initConcepts } from '../ui/concepts.js';

/** 입력창에 바로 넣어 볼 수 있는 예시 문장들 */
const PRESETS = [
  '안녕하세요, 저는 위니브에 다녀요',
  'strawberry',
  '나는 학교에 간다',
  'I go to school',
];

/** 한국어 vs 영어 비교에 쓰는 같은 뜻 문장 쌍 */
const PAIRS = [
  { ko: '나는 학교에 간다', en: 'I go to school' },
  { ko: '안녕하세요', en: 'hello' },
];

/** 토큰 조각 칩(글자 + 어휘표 번호) 하나를 만든다 */
function pieceChip(piece, index) {
  const chip = el('span', 'tok-piece');
  chip.style.setProperty('--tok-color', `hsl(${tokenHue(piece.text)} 70% 45%)`);
  chip.style.animationDelay = `${index * 0.06}s`;
  chip.appendChild(el('span', 'tok-text', piece.text));
  chip.appendChild(el('span', 'tok-id', `#${formatNumber(piece.id)}`));
  return chip;
}

// ── ① 토크나이저 놀이터 ──────────────────────────────
function initPlayground() {
  const input = $('#tok-input');
  const output = $('#tok-output');
  const counter = $('#tok-counter');

  function run() {
    const text = input.value.trim();
    const tokens = tokenize(text);
    output.replaceChildren();
    if (tokens.length === 0) {
      output.appendChild(el('p', 'tok-placeholder', '문장을 입력하고 "잘라 보기"를 눌러 보세요'));
      counter.textContent = '';
      return;
    }
    tokens.forEach((t, i) => output.appendChild(pieceChip(t, i)));
    const chars = text.replace(/\s/g, '').length;
    counter.textContent = `글자 ${chars}개 → 토큰 ${tokens.length}개`;
  }

  $('#tok-run').addEventListener('click', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') run();
  });

  const presetRow = $('#tok-presets');
  PRESETS.forEach((p) => {
    const btn = el('button', 'preset-chip', p);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      input.value = p;
      run();
    });
    presetRow.appendChild(btn);
  });

  input.value = PRESETS[0];
  run();
}

// ── ② strawberry 실험 ────────────────────────────────
function initStrawberry() {
  // 사람이 보는 것: 글자 하나하나, r은 강조
  const human = $('#straw-human');
  for (const ch of 'strawberry') {
    human.appendChild(el('span', `letter${ch === 'r' ? ' letter-r' : ''}`, ch));
  }

  // AI가 보는 것: 토큰 조각과 번호
  const aiView = $('#straw-ai');
  tokenize('strawberry').forEach((t, i) => aiView.appendChild(pieceChip(t, i)));

  // 버튼을 누르면 AI의 (틀린) 대답 공개
  const btn = $('#straw-ask');
  const answer = $('#straw-answer');
  btn.addEventListener('click', () => {
    answer.hidden = false;
    btn.disabled = true;
  });
}

// ── ③ 한국어 vs 영어 비용 비교 ───────────────────────
function initCompare() {
  const table = $('#compare-rows');
  const maxCount = Math.max(
    ...PAIRS.flatMap((p) => [tokenize(p.ko).length, tokenize(p.en).length]),
  );

  for (const pair of PAIRS) {
    for (const [lang, text] of [['ko', pair.ko], ['en', pair.en]]) {
      const count = tokenize(text).length;
      const row = el('div', 'compare-row');
      row.appendChild(el('span', 'compare-text', `"${text}"`));
      const track = el('div', 'compare-track');
      const bar = el('div', `compare-bar bar-${lang}`);
      bar.style.width = `${(count / maxCount) * 100}%`;
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(el('span', 'compare-count', `${count}토큰`));
      table.appendChild(row);
    }
    table.appendChild(el('div', 'compare-gap'));
  }
}

initPlayground();
initStrawberry();
initCompare();
initConcepts($('#concept-row'));
