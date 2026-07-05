// dialSim.js — "AI는 대화를 학습하지 않아요" 시뮬레이션.
// 다이얼(파라미터) 판을 놓고 두 모드를 비교한다.
//   대화(추론) 모드: 토큰이 흘러 지나가지만 다이얼은 완전히 고정
//   학습(훈련) 모드: 다이얼이 아주 조금씩 계속 돌아감
// 다이얼 하나를 누르면 돋보기 카드에 그 다이얼이 품고 있는 '수식 속 숫자'가 보인다.
// 다이얼 각도는 해시처럼 결정적으로 만들어서 새로고침해도 같은 모양이 나온다.

import { el } from '../utils.js';

const DIAL_COUNT = 54;

const CAPTIONS = {
  infer:
    '지금 이 순간이 여러분이 AI와 대화할 때예요. 문장이 다이얼 사이를 지나가며 계산될 뿐, ' +
    '다이얼은 1도도 움직이지 않아요. 그래서 아무리 오래 대화해도 모델은 나를 "학습"하지 않아요.',
  train:
    '"학습(훈련)"은 이렇게 다이얼을 돌리는 별도의 공정이에요. 정답과 비교해 수조 개의 다이얼을 ' +
    '아주 조금씩 수백만 번 고쳐 맞추는 일로, AI 회사의 거대한 컴퓨터에서 몇 달씩 걸려요. ' +
    '내 대화창에서는 절대 일어나지 않아요.',
};

const BADGES = {
  infer: '다이얼은 완전히 고정된 채 읽고 계산만 해요',
  train: '다이얼을 미세 조정하는 중, 이것이 바로 "학습"',
};

const ZOOM_CAPTIONS = {
  infer: '대화 중에는 이 숫자가 잠겨 있어요. 계산에 쓰일 뿐, 절대 바뀌지 않아요.',
  train: '학습이 이 숫자를 아주 조금씩 고치는 중이에요. 실제로는 수조 개를 동시에 고쳐요!',
};

/** 흘러가는 토큰 칩에 쓸 예시 단어들 */
const FLOW_TOKENS = ['제주도', '일정', '짜줘', '소설', '결말', '요약', '코드', '버그'];

/** 바늘 각도(도) → 다이얼이 품고 있는 숫자(-0.90 ~ 0.90) */
function weightFor(angle) {
  return ((angle % 360) / 359) * 1.8 - 0.9;
}

export function initDialSim(refs) {
  // refs: board, grid, flowLane, badge, caption, btnInfer, btnTrain,
  //       zoomIndex, zoomWeight, zoomCaption

  let mode = 'infer';
  let selected = 0;
  const dials = [];

  // 다이얼 만들기 — 시작 각도와 훈련 때 목표 각도를 요소별 CSS 변수로 지정
  for (let i = 0; i < DIAL_COUNT; i++) {
    const a1 = (i * 47 + 13) % 360;
    const a2 = a1 + 18 + ((i * 31) % 26); // 훈련 모드에서 이만큼 왔다 갔다
    const dial = el('button', 'dial');
    dial.type = 'button';
    dial.setAttribute('aria-label', `${i + 1}번 다이얼 확대`);
    dial.style.setProperty('--a1', `${a1}deg`);
    dial.style.setProperty('--a2', `${a2}deg`);
    dial.style.setProperty('--wobble-delay', `${(i % 9) * 0.13}s`);
    dial.appendChild(el('div', 'dial-needle'));
    dial.addEventListener('click', () => selectDial(i));
    refs.grid.appendChild(dial);
    dials.push({ element: dial, a1, a2 });
  }

  // 대화 모드에서 흘러가는 토큰 칩들
  FLOW_TOKENS.forEach((t, i) => {
    const chip = el('span', 'flow-chip', t);
    chip.style.setProperty('--flow-delay', `${i * 1.1}s`);
    refs.flowLane.appendChild(chip);
  });

  // ── 돋보기: 선택한 다이얼의 '수식 속 숫자' 표시 ──
  function selectDial(i) {
    dials[selected].element.classList.remove('selected');
    selected = i;
    dials[i].element.classList.add('selected');
    refs.zoomIndex.textContent = String(i + 1);
    drawWeight();
  }

  let wobble = 0;
  function drawWeight() {
    const { a1, a2 } = dials[selected];
    const w1 = weightFor(a1);
    // 훈련 모드에서는 바늘처럼 숫자도 w1↔w2 사이를 왔다 갔다
    const w = mode === 'train'
      ? w1 + (weightFor(a2) - w1) * (0.5 + 0.5 * Math.sin(wobble))
      : w1;
    refs.zoomWeight.textContent = (w >= 0 ? '+' : '') + w.toFixed(3);
    refs.zoomWeight.classList.toggle('tuning', mode === 'train');
  }

  setInterval(() => {
    if (mode !== 'train') return;
    wobble += 0.45;
    drawWeight();
  }, 120);

  function setMode(next) {
    mode = next;
    refs.board.classList.toggle('mode-infer', mode === 'infer');
    refs.board.classList.toggle('mode-train', mode === 'train');
    refs.btnInfer.classList.toggle('active', mode === 'infer');
    refs.btnTrain.classList.toggle('active', mode === 'train');
    refs.btnInfer.setAttribute('aria-pressed', String(mode === 'infer'));
    refs.btnTrain.setAttribute('aria-pressed', String(mode === 'train'));
    refs.badge.textContent = BADGES[mode];
    refs.caption.textContent = CAPTIONS[mode];
    refs.zoomCaption.textContent = ZOOM_CAPTIONS[mode];
    drawWeight();
  }

  refs.btnInfer.addEventListener('click', () => setMode('infer'));
  refs.btnTrain.addEventListener('click', () => setMode('train'));

  selectDial(0);
  setMode('infer');
}
