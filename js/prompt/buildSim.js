// buildSim.js — '프롬프트의 비밀' 데모 3 (프롬프트 조립하기).
// 상황·역할·조건·예시 재료를 켜고 끌 때마다 전송되는 글에 재료가 실제로 쌓이고,
// 답변 갈래 지도의 확률 물줄기·게이지·답변 예시가 함께 바뀐다.

import { el } from '../utils.js';
import {
  BUILD_QUESTION, INGREDIENTS, BUILD_BRANCHES,
  buildScore, buildAnswer, branchProbs,
} from './data.js';
import { createBranchMap } from './branchMap.js';

export function initBuildSim(refs) {
  // refs: ingredientRow, sendBox, branchMap, gaugeBar, gaugePct, missing, answerText

  const on = new Set();
  const map = createBranchMap(refs.branchMap, BUILD_BRANCHES, ['여행 계획', '좀 짜 줘.']);

  const buttons = INGREDIENTS.map((ing) => {
    const btn = el('button', 'variant-btn ingredient-btn');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    btn.appendChild(el('span', 'ingredient-tag', ing.tag));
    btn.appendChild(document.createTextNode(ing.btn));
    btn.addEventListener('click', () => {
      if (on.has(ing.id)) on.delete(ing.id);
      else on.add(ing.id);
      render();
    });
    refs.ingredientRow.appendChild(btn);
    return { ing, btn };
  });

  function render() {
    buttons.forEach(({ ing, btn }) => {
      const active = on.has(ing.id);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    // ① 전송되는 글: 켠 재료가 순서대로 쌓이고 질문은 항상 마지막
    const active = INGREDIENTS.filter((i) => on.has(i.id));
    refs.sendBox.replaceChildren();
    if (active.length === 0) {
      refs.sendBox.appendChild(el('p', 'send-prefix empty', '(아직 얹은 재료 없음)'));
    }
    for (const ing of active) {
      const line = el('p', 'send-prefix ingredient-line');
      line.appendChild(el('span', 'ingredient-tag', ing.tag));
      line.appendChild(document.createTextNode(ing.text));
      refs.sendBox.appendChild(line);
    }
    refs.sendBox.appendChild(el('p', 'send-question', BUILD_QUESTION));

    // ② 갈래 지도: 확률의 물줄기가 원하는 갈래 쪽으로 옮겨 간다
    map.update(branchProbs([...on]));

    // ③ 확률 게이지
    const score = buildScore([...on]);
    refs.gaugeBar.style.width = `${score}%`;
    refs.gaugePct.textContent = `${score}%`;

    // ④ 아직 못 준 재료. 다 담았을 때는 정직한 한마디
    const missing = INGREDIENTS.filter((i) => !on.has(i.id));
    refs.missing.textContent = missing.length > 0
      ? `AI가 아직 모르는 것: ${missing.map((i) => i.tag).join(' · ')}`
      : '재료를 다 담아도 100%는 아니에요. 확률 뽑기라는 본질은 그대로라서, 다른 갈래로 빠질 가능성이 조금은 남거든요.';

    // ⑤ 답변 예시
    refs.answerText.textContent = buildAnswer([...on]);
  }

  render();
}
