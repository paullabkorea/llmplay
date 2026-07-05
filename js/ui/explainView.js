// explainView.js — 단계별 설명 팝업.
// 진행 중인 단계와 관련된 패널(입력 문장 / 인공 신경망 / 다음 단어 확률)
// 위에 말풍선처럼 띄운다. 조작부의 '단계 설명 표시' 체크박스로 켜고 끌 수 있다.

import { END_TOKEN } from '../config.js';

const TEXTS = {
  tokenizeFirst: {
    badge: '1단계 · 토큰화',
    html: 'AI는 문장을 통째로 읽지 않아요. <strong>토큰</strong>이라는 작은 조각으로 잘라요. 조각마다 색이 생겼죠?',
  },
  tokenizeAgain: {
    badge: '1단계 · 토큰화',
    html: '방금 만든 단어까지 합쳐서, <strong>문장 전체를 처음부터 다시</strong> 조각내요. AI는 매번 전체를 다시 읽어요!',
  },
  embed: {
    badge: '2단계 · 숫자 변환',
    html: '컴퓨터는 글자를 몰라요! 그래서 토큰마다 <strong>숫자 목록(벡터)</strong>으로 바꿔요. 뜻이 비슷한 단어는 비슷한 숫자를 가져요.',
  },
  compute: {
    badge: '3단계 · 신경망 계산',
    html: '숫자들이 <strong>수많은 다이얼(파라미터)</strong>을 지나며 곱해지고 더해져요. 다이얼 값은 훈련하면서 이미 맞춰 둔 거예요.',
  },
  probs: {
    badge: '4단계 · 확률 계산',
    html: '계산 결과가 나왔어요! <strong>다음에 올 단어 후보</strong>마다 확률이 매겨져요. 온도 슬라이더를 올려 보세요. 1등 막대는 짧아지고 나머지가 길어지면서 <strong>확률이 고르게 퍼져요</strong> (합은 늘 100%!)',
  },
  sample: {
    badge: '5단계 · 단어 뽑기',
    html: '확률 룰렛을 돌려 <strong>하나를 뽑아요</strong>. 확률이 높으면 잘 뽑히지만, 가끔 낮은 단어가 뽑히기도 해요!',
  },
  append: {
    badge: '반복!',
    html: '뽑힌 단어를 문장 끝에 붙였어요. 이제 <strong>이 문장으로 같은 과정을 반복</strong>해요. 이게 AI가 글 쓰는 방법의 전부예요!',
  },
  appendEnd: {
    badge: '끝내기',
    html: 'AI가 <strong>"여기서 문장을 끝내자"</strong>를 뽑았어요. 문장 끝내기도 하나의 후보랍니다.',
  },
  done: {
    badge: '완성',
    html: '문장 완성! <strong>처음부터</strong>를 눌러 다시 해 보세요. 온도를 바꾸면 다른 문장이 나올 수도 있어요!',
  },
  ready: {
    badge: '준비',
    html: '<strong>자동 재생</strong> 또는 <strong>한 단계씩</strong>을 눌러 시작해 보세요!',
  },
};

/** 단계 → 설명을 띄울 패널 */
const PANEL_FOR_STAGE = {
  tokenize: 'input',
  embed: 'input',
  compute: 'network',
  probs: 'probs',
  sample: 'probs',
  append: 'input',
};

export function initExplainView(engine, { tips, toggle }) {
  let enabled = toggle.checked;

  function hideAll() {
    Object.values(tips).forEach((tip) => { tip.hidden = true; });
  }

  function show(panelKey, { badge, html }) {
    hideAll();
    if (!enabled) return;
    const tip = tips[panelKey];
    tip.querySelector('.tip-badge').textContent = badge;
    tip.querySelector('.tip-body').innerHTML = html;
    tip.hidden = false;
  }

  // 팝업의 닫기 버튼 — 이번 단계 설명만 숨긴다
  Object.values(tips).forEach((tip) => {
    tip.querySelector('.tip-close').addEventListener('click', () => {
      tip.hidden = true;
    });
  });

  toggle.addEventListener('change', () => {
    enabled = toggle.checked;
    if (!enabled) hideAll();
  });

  engine.addEventListener('reset', () => show('input', TEXTS.ready));

  engine.addEventListener('stage', (e) => {
    const { stage, round, live, token } = e.detail;
    if (live) return; // 온도 슬라이더로 인한 갱신은 설명을 바꾸지 않음

    if (stage === 'tokenize') {
      show('input', round === 0 ? TEXTS.tokenizeFirst : TEXTS.tokenizeAgain);
    } else if (stage === 'append') {
      show('input', token === END_TOKEN ? TEXTS.appendEnd : TEXTS.append);
    } else if (TEXTS[stage]) {
      show(PANEL_FOR_STAGE[stage], TEXTS[stage]);
    }
  });

  engine.addEventListener('done', () => show('input', TEXTS.done));
}
