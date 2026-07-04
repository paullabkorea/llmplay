// probView.js — 오른쪽 패널: 다음 단어 후보들의 확률 막대와 뽑기(룰렛) 연출.

import { el, formatPct } from '../utils.js';
import { MAX_PROB_ROWS, END_TOKEN, END_LABEL, STAGE_DURATIONS } from '../config.js';

export function initProbView(engine, { probList }, getSpeed) {
  let rowEls = [];
  let timers = [];

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function showPlaceholder(text) {
    clearTimers();
    rowEls = [];
    probList.innerHTML = '';
    const p = el('p', 'prob-placeholder');
    p.innerHTML = text;
    probList.appendChild(p);
  }

  /** 확률 막대 그리기. 막대 길이는 1등 확률을 100%로 놓고 상대 비율로. */
  function renderBars(dist) {
    clearTimers();
    probList.innerHTML = '';
    rowEls = [];

    const shown = dist.slice(0, MAX_PROB_ROWS);
    const maxP = shown[0]?.p || 1;

    shown.forEach(({ token, p }) => {
      const row = el('div', 'prob-row');
      row.appendChild(el('span', 'prob-token', token === END_TOKEN ? END_LABEL : token));

      const track = el('div', 'prob-bar-track');
      const bar = el('div', 'prob-bar');
      track.appendChild(bar);
      row.appendChild(track);

      row.appendChild(el('span', 'prob-pct', formatPct(p)));
      probList.appendChild(row);
      rowEls.push(row);

      // 다음 프레임에 폭을 넣어야 CSS transition이 발동한다
      requestAnimationFrame(() => {
        bar.style.width = `${(p / maxP) * 100}%`;
      });
    });

    if (dist.length > shown.length) {
      probList.appendChild(el('p', 'prob-placeholder', `… 외 후보 ${dist.length - shown.length}개`));
    }
  }

  /** 룰렛 연출: 하이라이트가 점점 느려지며 돌다가 뽑힌 후보에 멈춘다. */
  function spinRoulette(pickedIndex) {
    if (rowEls.length === 0) return;
    clearTimers();

    const budget = (STAGE_DURATIONS.sample / getSpeed()) * 0.75;
    const hops = Math.min(14, rowEls.length * 3 + 2);

    // 점점 느려지는 시간 간격 만들기
    const delays = [];
    let total = 0;
    for (let i = 0; i < hops; i++) {
      const t = (i + 1) / hops;
      delays.push(t * t); // 뒤로 갈수록 간격이 길어짐
      total += t * t;
    }

    let acc = 0;
    let cursor = pickedIndex - hops; // hops번 이동하면 정확히 picked에 도착
    delays.forEach((d, i) => {
      acc += (d / total) * budget;
      const isLast = i === hops - 1;
      timers.push(setTimeout(() => {
        cursor += 1;
        const idx = ((cursor % rowEls.length) + rowEls.length) % rowEls.length;
        rowEls.forEach((r) => r.classList.remove('spinning'));
        if (isLast) {
          rowEls[pickedIndex]?.classList.add('winner');
        } else {
          rowEls[idx].classList.add('spinning');
        }
      }, acc));
    });
  }

  engine.addEventListener('reset', () => {
    showPlaceholder('계산이 끝나면<br />후보 단어들이 나타나요');
  });

  engine.addEventListener('stage', (e) => {
    const { stage, dist, pickedIndex } = e.detail;
    if (stage === 'tokenize') {
      showPlaceholder('신경망 계산을 기다리는 중…');
    } else if (stage === 'probs') {
      renderBars(dist);
    } else if (stage === 'sample') {
      spinRoulette(Math.min(pickedIndex, MAX_PROB_ROWS - 1));
    }
  });
}
