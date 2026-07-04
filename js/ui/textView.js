// textView.js — 왼쪽 패널: 입력 문장(토큰 칩)과 임베딩 벡터 표시.

import { el, tokenHue, pseudoVector } from '../utils.js';
import { VECTOR_DIMS, MAX_VECTOR_ROWS } from '../config.js';

export function initTextView(engine, { tokenArea, vectorArea }) {
  let promptLength = 0;

  /** 토큰 칩 전체를 다시 그린다. */
  function renderTokens(tokens, { tokenized = false, showBlank = true } = {}) {
    tokenArea.innerHTML = '';
    tokens.forEach((token, i) => {
      const isGenerated = i >= promptLength;
      const chip = el('span', 'token' + (isGenerated ? ' generated' : ''), token);
      if (tokenized) {
        chip.classList.add('tokenized');
        chip.style.setProperty('--tok-color', `hsl(${tokenHue(token)} 65% 45%)`);
        chip.style.animationDelay = `${i * 90}ms`;
      }
      tokenArea.appendChild(chip);
    });
    if (showBlank) {
      tokenArea.appendChild(el('span', 'token blank', '____'));
    }
  }

  /** 임베딩(벡터) 목록을 그린다. 토큰이 많으면 최근 것만. */
  function renderVectors(tokens) {
    vectorArea.innerHTML = '';
    vectorArea.appendChild(el('div', 'vec-row', '↓ 토큰을 숫자(벡터)로 변환'));

    const shown = tokens.slice(-MAX_VECTOR_ROWS);
    if (shown.length < tokens.length) {
      vectorArea.appendChild(el('div', 'vec-row', `… (앞 토큰 ${tokens.length - shown.length}개 생략)`));
    }
    shown.forEach((token, i) => {
      const row = el('div', 'vec-row');
      row.style.animationDelay = `${i * 120}ms`;
      row.appendChild(el('span', 'vec-token', token));
      row.appendChild(el('span', 'vec-nums', `[ ${pseudoVector(token, VECTOR_DIMS).join(', ')} ]`));
      vectorArea.appendChild(row);
    });
  }

  engine.addEventListener('reset', (e) => {
    promptLength = e.detail.scenario.prompt.length;
    vectorArea.innerHTML = '';
    renderTokens(e.detail.tokens);
  });

  engine.addEventListener('stage', (e) => {
    const { stage, tokens, live } = e.detail;
    if (live) return;

    if (stage === 'tokenize') {
      vectorArea.innerHTML = '';
      renderTokens(tokens, { tokenized: true });
    } else if (stage === 'embed') {
      renderVectors(tokens);
    } else if (stage === 'append') {
      renderTokens(tokens, { tokenized: true, showBlank: !e.detail.isEnd });
    }
  });

  engine.addEventListener('done', (e) => {
    renderTokens(e.detail.tokens, { tokenized: true, showBlank: false });
  });
}
