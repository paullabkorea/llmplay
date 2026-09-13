// multimodal/scenarios.js — 데모 4개의 단계 설명과 화면 그리기.
// 각 시나리오: { id, title, panels: [왼쪽, 가운데, 오른쪽 제목], steps: [{ panel, badge, tip, duration }], render(index, ui) }
// render는 현재 단계 번호(index, 0이면 시작 전)를 받아 세 패널을 처음부터 다시 그린다.
// ui = { left, mid, right (패널 본문 요소), assets (미리 계산한 조각·소리), speed() (재생 배속) }

import { el, tokenHue } from '../utils.js';
import {
  drawHouse, drawGrid, drawMosaic, drawWave, drawTable,
  HOUSE_ORIGINAL, HOUSE_REGENERATED, TABLE_ROWS,
} from './draw.js';
import { typeText, pixelateReveal } from './fx.js';
import { VOICE_SYLLABLES } from './model.js';

export const SIZE = 300;   // 캔버스 한 변(px)
export const COLUMNS = 8;  // 격자 칸 수 (8 × 8 = 64조각)

// ── 작은 화면 부품 ────────────────────────────────────────
function canvas(size = SIZE, className = 'mm-canvas') {
  const c = el('canvas', className);
  c.width = size; c.height = size;
  return c;
}

function ghost(text) {
  return el('p', 'mm-ghost', text);
}

function note(text) {
  return el('p', 'mm-note', text);
}

function label(text) {
  return el('p', 'mm-label', text);
}

/** 말풍선. who: 'me'(내가 보낸 말) | 'ai'(언어 모델의 답) */
function bubble(text, who = 'me') {
  return el('div', `mm-bubble mm-bubble-${who}`, text);
}

/** 언어 모델의 답. animate가 참이면 타자 효과로 찍는다. */
function answer(text, animate, speed) {
  const box = bubble('', 'ai');
  if (animate) typeText(box, text, speed()); else box.textContent = text;
  return box;
}

/** 파일 자리. state: 'blocked'(읽을 수 없음) | 'filled'(숫자 묶음으로 도착) */
function fileSlot(state, { icon, name, patches, count } = {}) {
  const slot = el('div', `mm-slot mm-slot-${state}`);
  if (state === 'blocked') {
    slot.append(el('span', 'mm-slot-icon', icon), el('span', 'mm-slot-name', name), el('span', 'mm-slot-state', '읽을 수 없음'));
    return slot;
  }
  const grid = el('div', 'mm-mini-grid');
  grid.style.setProperty('--columns', COLUMNS);
  patches.forEach((p) => {
    const cell = el('span');
    cell.style.background = `rgb(${p.rgb.map((n) => Math.round(n * 255)).join(',')})`;
    grid.append(cell);
  });
  slot.append(grid, el('span', 'mm-slot-state', `숫자 묶음 ${count}개`));
  return slot;
}

/** 토큰 칩 줄 (index.html의 .token 스타일 재사용) */
function tokens(list) {
  const area = el('div', 'token-area mm-tokens');
  list.forEach((t, i) => {
    const chip = el('span', 'token tokenized', t);
    chip.style.setProperty('--tok-color', `hsl(${tokenHue(t)} 70% 45%)`);
    chip.style.animationDelay = `${i * 60}ms`;
    area.append(chip);
  });
  return area;
}

/** 조각별 숫자 묶음 표. 하늘·지붕·문·땅처럼 서로 다른 조각 몇 개만 보여 준다. */
function vectors(patches, indexes = [0, 19, 44, 56]) {
  const area = el('div', 'vector-area mm-vectors');
  indexes.forEach((index) => {
    const p = patches[index];
    const row = el('div', 'vec-row');
    row.append(el('span', 'vec-token', `조각 ${index + 1}`), el('span', 'vec-nums', `[${p.rgb.map((n) => n.toFixed(2)).join(', ')}]`));
    area.append(row);
  });
  const more = el('div', 'vec-row');
  more.append(el('span', 'vec-token', '…'), el('span', 'vec-nums', `조각 ${patches.length}까지 계속`));
  area.append(more);
  return area;
}

/** 받아쓰기 종이·주문서처럼 글이 적힌 종이 */
function paper(title, lines, { animate = false, speed } = {}) {
  const box = el('div', 'mm-paper');
  box.append(el('p', 'mm-paper-title', title));
  const body = el('p', 'mm-paper-body');
  if (animate) typeText(body, lines.join('\n'), speed()); else body.textContent = lines.join('\n');
  box.append(body);
  return box;
}

/** 사라진 것 / 달라진 것 목록. items: [{ ok, text }] */
function checkList(items, className) {
  const list = el('ul', `mm-check ${className}`);
  items.forEach(({ ok, text }) => {
    const li = el('li', ok ? 'ok' : 'bad');
    li.append(el('span', 'mm-check-mark', ok ? '✓' : '✗'), el('span', '', text));
    list.append(li);
  });
  return list;
}

/** 데모 4처럼 두 갈래(A 사진 / B 글)를 위아래로 놓을 때 쓰는 줄 */
function lane(tag, title, ...children) {
  const row = el('div', `mm-lane mm-lane-${tag.toLowerCase()}`);
  const head = el('p', 'mm-lane-head');
  head.append(el('span', 'mm-lane-tag', tag), el('span', '', title));
  row.append(head, ...children);
  return row;
}

function clear(...panels) {
  panels.forEach((p) => p.replaceChildren());
}

// ── 데모 1: 사진을 보내면 ─────────────────────────────────
const QUESTION_1 = ['이', '사진', '설명', '해', '줘'];

const photoScenario = {
  id: 'photo',
  title: '사진을 보내면: AI는 사진을 어떻게 읽을까?',
  panels: ['내가 보낸 것', '전용 모델: 눈 (시각 인코더)', '언어 모델 (LLM)'],
  steps: [
    { panel: 'left', badge: '1단계 · 보내기', duration: 2600,
      tip: '집 사진과 함께 <strong>"이 사진 설명해 줘"</strong>라고 물었어요. 우리 눈에는 초록 지붕, 파란 문, OPEN 표지판이 바로 보이죠?' },
    { panel: 'right', badge: '2단계 · 막힘', duration: 3200,
      tip: '그런데 언어 모델은 <strong>글자 조각(토큰)만</strong> 읽을 수 있어요. 사진 파일은 문 앞에서 막혀요. 질문만 토큰이 됐죠?' },
    { panel: 'mid', badge: '3단계 · 조각내기', duration: 3000,
      tip: '그래서 <strong>눈 역할을 하는 전용 모델(시각 인코더)</strong>이 먼저 사진을 받아요. 글을 토큰으로 자르듯, 사진은 <strong>격자 조각(패치)</strong>으로 잘라요. 이 눈은 따로 있는 모델일 수도, 한 모델 안에 붙은 부품일 수도 있어요.' },
    { panel: 'mid', badge: '4단계 · 숫자로', duration: 3600,
      tip: '조각 하나하나가 <strong>숫자 묶음</strong>으로 바뀌어요. 조각보다 작은 글씨나 세부는 뭉개져요. 실제 조각은 이보다 훨씬 작아 또렷한 글씨는 잘 읽지만, <strong>작거나 흐린 글씨</strong>는 여기 OPEN처럼 틀리기 쉬워요.' },
    { panel: 'right', badge: '5단계 · 전달', duration: 3200,
      tip: '숫자 묶음 64개가 질문 토큰 앞에 <strong>줄지어 붙어요</strong>. 언어 모델은 사진을 "본" 게 아니라, 번역된 숫자를 "읽는" 거예요.' },
    { panel: 'right', badge: '6단계 · 답하기', duration: 3600,
      tip: '답은 언제나 <strong>글</strong>로 나와요. 여기까지가 "사진을 이해하는" 길이에요. 그럼 사진을 <strong>고쳐 달라고</strong> 하면요? 세 번째 데모에서 확인해 보세요.' },
  ],
  render(index, { left, mid, right, assets, speed }) {
    clear(left, mid, right);
    const { housePatches } = assets;

    // 왼쪽: 사진 + 질문
    const photo = canvas();
    drawHouse(photo.getContext('2d'), SIZE);
    left.append(photo, bubble('이 사진 설명해 줘'));
    left.append(index >= 1 ? note('보냈어요: 사진 1장 + 질문 1개') : note('보낼 것: 사진 1장 + 질문 1개'));

    // 가운데: 조각내기 → 숫자
    if (index < 3) {
      mid.append(ghost('아직 사진이 도착하지 않았어요'));
    } else {
      const c = canvas();
      const ctx = c.getContext('2d');
      if (index === 3) {
        drawHouse(ctx, SIZE);
        drawGrid(ctx, SIZE, COLUMNS);
        mid.append(c, note(`격자 ${COLUMNS} × ${COLUMNS} = 조각 ${housePatches.length}개`));
      } else {
        drawMosaic(ctx, SIZE, housePatches, COLUMNS);
        drawGrid(ctx, SIZE, COLUMNS, 'rgba(15, 23, 42, 0.25)');
        mid.append(c, label('조각 하나 = 숫자 묶음 하나'), vectors(housePatches),
          note('이 모형은 조각 64개에 평균 색 3개씩이에요. 실제 모델은 사진을 28~32픽셀짜리 아주 작은 조각 수천 개로 나누고 조각마다 수백 개의 숫자를 만들어요. 그래도 조각보다 작거나 흐린 세부가 사라지는 원리는 같아요.'));
      }
    }

    // 오른쪽: 언어 모델이 받는 것 → 답
    if (index < 2) {
      right.append(ghost('언어 모델은 글자 토큰만 읽어요. 아직 아무것도 도착하지 않았어요.'));
      return;
    }
    right.append(label('읽을 수 있는 것'));
    const input = el('div', 'mm-input');
    if (index < 5) {
      input.append(fileSlot('blocked', { icon: '🖼', name: 'house.png' }));
    } else {
      input.append(fileSlot('filled', { patches: housePatches, count: housePatches.length }));
    }
    input.append(tokens(QUESTION_1));
    right.append(input);
    if (index >= 6) {
      right.append(label('답 (글로만 나와요)'),
        answer('초록색 지붕과 파란 문이 있는 집이에요. 창문은 2개이고, 표지판에는 OPEN이라고 적혀 있는 것 같아요.', index === 6, speed));
    } else if (index >= 5) {
      right.append(note('숫자 묶음 64개 + 질문 토큰 5개를 한 줄로 읽어요'));
    }
  },
};

// ── 데모 2: 목소리를 보내면 ───────────────────────────────
const SAID = ['정말', '잘했', '네'];

const voiceScenario = {
  id: 'voice',
  title: '목소리를 보내면: AI는 소리를 어떻게 들을까?',
  panels: ['내가 보낸 것', '전용 모델: 귀 (음성 인식)', '언어 모델 (LLM)'],
  steps: [
    { panel: 'left', badge: '1단계 · 보내기', duration: 2800,
      tip: '친구가 실수한 뒤 <strong>"정말~ 잘했네"</strong>라고 말했어요. 말투를 들으면 칭찬이 아니라 <strong>비꼬는 말</strong>이죠?' },
    { panel: 'right', badge: '2단계 · 막힘', duration: 3000,
      tip: '글자만 배운 언어 모델은 <strong>소리를 들을 수 없어요</strong>. 파형은 그냥 숫자의 물결일 뿐, 글자 토큰이 아니거든요.' },
    { panel: 'mid', badge: '3단계 · 조각내기', duration: 3000,
      tip: '<strong>귀 역할을 하는 전용 모델</strong>이 소리를 시간 순서대로 짧게 잘라요. 사진이 공간을 나눴다면, 소리는 <strong>시간</strong>을 나눠요.' },
    { panel: 'mid', badge: '4단계 · 받아쓰기', duration: 3600,
      tip: '조각을 글자로 <strong>받아써요</strong>. 그런데 글자에는 억양·한숨·말투가 남지 않아요. 받아쓰기 종이에서 <strong>사라진 것</strong>을 보세요.' },
    { panel: 'right', badge: '5단계 · 전달', duration: 3000,
      tip: '언어 모델에게는 <strong>"정말 잘했네" 글자만</strong> 도착해요. 비꼬는 말투는 이미 사라졌어요.' },
    { panel: 'right', badge: '6단계 · 답하기', duration: 3800,
      tip: '그래서 칭찬으로 알아듣고 <strong>고맙다고</strong> 답해요. 음성 기능에는 두 길이 있어요. 이렇게 <strong>받아쓰기를 거치는 길</strong>과, 소리의 숫자 묶음을 <strong>직접 읽도록 학습한 모델</strong>을 쓰는 길이에요. 어느 길인지는 서비스와 모드마다 달라요.' },
  ],
  render(index, { left, mid, right, assets, speed }) {
    clear(left, mid, right);
    const { voice, voiceChunks } = assets;
    const labels = VOICE_SYLLABLES.map((s) => s.text);

    // 왼쪽: 목소리 파형
    const wave = canvas(SIZE, 'mm-canvas mm-wave');
    wave.height = 130;
    drawWave(wave.getContext('2d'), SIZE, 130, voice, { labels });
    left.append(wave, bubble('정말~ 잘했네 (한숨 섞인 말투)'));
    left.append(note(index >= 1 ? '보냈어요: 음성 2초' : '상황: 친구가 실수했을 때. 보낼 것: 음성 2초'));

    // 가운데: 시간 조각 → 받아쓰기
    if (index < 3) {
      mid.append(ghost('아직 소리가 도착하지 않았어요'));
    } else {
      const c = canvas(SIZE, 'mm-canvas mm-wave');
      c.height = 130;
      drawWave(c.getContext('2d'), SIZE, 130, voice, { chunks: voiceChunks, labels });
      mid.append(c, note(`0.4초씩 자르면 조각 ${voiceChunks.length}개. 조각마다 소리의 세기가 숫자로 바뀌어요.`));
      if (index >= 4) {
        mid.append(paper('받아쓰기 종이', ['정말 잘했네'], { animate: index === 4, speed }));
        mid.append(label('사라진 것'), checkList([
          { ok: false, text: '길게 끄는 "말~"' },
          { ok: false, text: '끝을 올리는 억양' },
          { ok: false, text: '한숨, 비꼬는 말투' },
        ], 'mm-lost'));
      }
    }

    // 오른쪽
    if (index < 2) {
      right.append(ghost('언어 모델은 글자 토큰만 읽어요. 아직 아무것도 도착하지 않았어요.'));
      return;
    }
    right.append(label('읽을 수 있는 것'));
    const input = el('div', 'mm-input');
    if (index < 5) {
      input.append(fileSlot('blocked', { icon: '🔊', name: 'voice.m4a' }));
      right.append(input, note('토큰이 아니면 아무것도 읽지 못해요'));
    } else {
      input.append(tokens(SAID));
      right.append(input, note('받아쓴 글자 토큰 3개만 도착했어요'));
    }
    if (index >= 6) {
      right.append(label('답'), answer('칭찬해 주셔서 고마워요! 다음에도 열심히 할게요.', index === 6, speed),
        checkList([{ ok: false, text: '비꼬는 말을 칭찬으로 알아들었어요' }], 'mm-lost'));
    }
  },
};

// ── 데모 3: 사진을 고쳐 달라고 하면 ──────────────────────
const REQUEST_3 = ['지붕', '만', '보라색', '으로', '바꿔', '줘'];
const ORDER_SHEET = ['보라색 지붕, 파란 문, 창문 2개,', 'OPEN 표지판이 있는 집 그림'];

const editScenario = {
  id: 'edit',
  title: '사진을 고쳐 달라고 하면: 왜 엉뚱하게 바뀔까?',
  panels: ['내가 보낸 것', '언어 모델 (LLM)', '전용 모델: 손 (이미지 생성)'],
  steps: [
    { panel: 'left', badge: '1단계 · 보내기', duration: 2800,
      tip: '아까 그 집 사진을 주며 <strong>"지붕만 보라색으로 바꿔 줘"</strong>라고 부탁했어요. 포토샵이라면 지붕만 칠하면 끝이죠.' },
    { panel: 'mid', badge: '2단계 · 읽기', duration: 3200,
      tip: '언어 모델은 눈(인코더)을 거쳐 사진을 숫자로 읽어요. 그런데 <strong>출력은 글자 토큰뿐</strong>이라 그림 위에 손을 댈 수 없어요. Claude처럼 아예 그림을 만들지 않는 모델도 있고, 서비스에 따로 <strong>손 역할 모델</strong>을 붙이기도 해요.' },
    { panel: 'mid', badge: '3단계 · 주문서', duration: 3400,
      tip: '할 수 있는 건 <strong>손 역할 모델에게 보낼 주문서</strong>를 쓰는 것뿐이에요. 주문서가 글이든 숫자 묶음이든, "이 픽셀만 바꿔라"가 아니라 "이런 그림을 그려라"가 돼요. 원본 픽셀은 여기서 손을 떠나요.' },
    { panel: 'right', badge: '4단계 · 새로 그리기', duration: 3400,
      tip: '<strong>이미지 생성 모델</strong>이 주문서를 읽고 <strong>처음부터 새로</strong> 그려요. 원본을 고치는 게 아니라 비슷한 그림을 다시 만드는 거예요.' },
    { panel: 'right', badge: '5단계 · 비교', duration: 3800,
      tip: '지붕은 보라색이 됐지만 문 색, 창문 개수, 표지판 글자까지 <strong>달라졌어요</strong>. 글은 단어 하나만 바꿀 수 있지만 이미지는 "다시 그리기"라 세밀한 수정이 아주 어려워요.' },
    { panel: 'left', badge: '6단계 · 정리', duration: 3800,
      tip: '한 번 더 고쳐 달라고 하면 또 새로 그려요. 요즘은 원본을 옆에 두고 그리는 편집 기능이 있어 훨씬 나아졌지만, 그래도 "그리기"라서 글자·손가락·세부가 흔들려요. <strong>정확히 그 부분만 바꿔야 하면 편집 도구</strong>가 확실해요.' },
  ],
  render(index, { left, mid, right, assets, speed }) {
    clear(left, mid, right);
    const { housePatches } = assets;

    // 왼쪽: 원본 사진 + 부탁
    const photo = canvas();
    drawHouse(photo.getContext('2d'), SIZE);
    left.append(photo, bubble('지붕만 보라색으로 바꿔 줘'));
    if (index >= 6) {
      left.append(label('정리'), checkList([
        { ok: true, text: '편집 도구: 지붕만 칠하고 나머지는 그대로' },
        { ok: false, text: 'AI 생성: 매번 전부 다시 그려요' },
      ], 'mm-diff'));
    } else {
      left.append(note(index >= 1 ? '보냈어요: 사진 1장 + 부탁 1개' : '보낼 것: 사진 1장 + 부탁 1개'));
    }

    // 가운데: 언어 모델
    if (index < 2) {
      mid.append(ghost('아직 아무것도 도착하지 않았어요'));
    } else {
      mid.append(label('읽은 것'));
      const input = el('div', 'mm-input');
      input.append(fileSlot('filled', { patches: housePatches, count: housePatches.length }), tokens(REQUEST_3));
      mid.append(input);
      if (index === 2) {
        mid.append(label('낼 수 있는 것: 글자 토큰뿐'), checkList([
          { ok: true, text: '글 쓰기' },
          { ok: false, text: '그림 위에 색칠하기' },
        ], 'mm-diff'));
      } else {
        mid.append(paper('손 모델에게 보내는 주문서', ORDER_SHEET, { animate: index === 3, speed }));
        mid.append(note('주문서는 글이라서, 원본의 정확한 모양은 담기지 않아요'));
      }
    }

    // 오른쪽: 이미지 생성 모델
    if (index < 4) {
      right.append(ghost('주문서를 기다리는 중'));
      return;
    }
    const result = canvas();
    right.append(result);
    if (index === 4) {
      pixelateReveal(result, (ctx, size) => drawHouse(ctx, size, HOUSE_REGENERATED), 2200 / speed());
      right.append(note('주문서만 보고 처음부터 그려요'));
    } else {
      drawHouse(result.getContext('2d'), SIZE, HOUSE_REGENERATED);
      right.append(label('원본과 비교'), checkList([
        { ok: true, text: '지붕: 보라색이 됐어요' },
        { ok: false, text: '문: 파란색 → 청록색' },
        { ok: false, text: '창문: 2개 → 3개' },
        { ok: false, text: '표지판: OPEN → OPFN' },
        { ok: false, text: '해: 오른쪽 → 왼쪽' },
      ], 'mm-diff'));
    }
  },
};

// ── 데모 4: 같은 정보, 사진 vs 글 ────────────────────────
const TABLE_TEXT = TABLE_ROWS.slice(1).map(([month, sales]) => `${month} ${sales}`);
const TABLE_TOKENS = TABLE_ROWS.slice(1).flatMap(([month, sales]) => [month, sales.replace('만 원', ''), '만 원']);

const deliveryScenario = {
  id: 'delivery',
  title: '같은 정보, 사진 vs 글: 무엇으로 보내야 할까?',
  panels: ['내가 보낸 것', '숫자로 바꾸기', '언어 모델 (LLM)'],
  steps: [
    { panel: 'left', badge: '1단계 · 두 가지 방법', duration: 3000,
      tip: '같은 매출 표를 두 가지로 준비했어요. 하나는 <strong>표를 캡처한 사진</strong>, 하나는 <strong>글로 적은 표</strong>예요.' },
    { panel: 'mid', badge: '2단계 · 사진의 길', duration: 3400,
      tip: '사진은 눈 모델이 조각으로 잘라 숫자로 바꿔요. 또렷한 캡처는 요즘 꽤 잘 읽지만, <strong>작거나 흐린 숫자</strong>는 조각 안에서 뭉개져 1,280이 1,260처럼 보일 수 있어요.' },
    { panel: 'mid', badge: '3단계 · 글의 길', duration: 3000,
      tip: '글은 그냥 <strong>토큰</strong>이 돼요. 잃어버리는 게 없고, 토큰 수도 훨씬 적어요.' },
    { panel: 'right', badge: '4단계 · 답 비교', duration: 4200,
      tip: '사진으로 받은 쪽은 <strong>헷갈리거나 틀릴 수 있고</strong>, 글로 받은 쪽은 정확해요. 게다가 실제 서비스에서 1000×1000 사진 한 장은 <strong>토큰 약 1,300개</strong>, 이 표를 글로 쓰면 수십 개예요. 사진이 수십 배 느리고 비싸요.' },
    { panel: 'left', badge: '5단계 · 정리', duration: 3800,
      tip: '같은 정보라면 <strong>글로 주세요</strong>. 표는 텍스트로, 문서는 복사해서 붙여 넣기. 사진은 사진이어야만 할 때(그림·도면·현장 사진)만 쓰세요.' },
  ],
  render(index, { left, mid, right, assets, speed }) {
    clear(left, mid, right);
    const { tablePatches } = assets;

    // 왼쪽: 두 가지 방법
    const shot = canvas(SIZE, 'mm-canvas mm-canvas-sm');
    drawTable(shot.getContext('2d'), SIZE);
    left.append(lane('A', '표를 캡처한 사진', shot));
    left.append(lane('B', '글로 적은 표', paper('메시지 창에 붙여 넣은 글', TABLE_TEXT)));
    if (index >= 5) {
      left.append(label('정리: 같은 정보라면 글로'), checkList([
        { ok: true, text: '표·문서·코드: 복사해서 글로 붙여 넣기' },
        { ok: true, text: '음성: 받아쓴 글을 확인하고 보내기' },
        { ok: false, text: '글자가 담긴 캡처: 뭉개지고 비싸요' },
      ], 'mm-diff'));
    }

    // 가운데: 두 갈래의 변환
    if (index < 2) {
      mid.append(ghost('아직 아무것도 도착하지 않았어요'));
    } else {
      const mosaic = canvas(SIZE, 'mm-canvas mm-canvas-sm');
      const ctx = mosaic.getContext('2d');
      drawMosaic(ctx, SIZE, tablePatches, COLUMNS);
      drawGrid(ctx, SIZE, COLUMNS, 'rgba(15, 23, 42, 0.25)');
      mid.append(lane('A', '눈 모델이 조각 64개로', mosaic, note('숫자 묶음 64개(모형). 실제로는 조각이 훨씬 작지만, 작거나 흐린 글씨가 조각 안에서 뭉개지는 건 같아요.')));
      if (index >= 3) {
        mid.append(lane('B', '글은 바로 토큰으로', tokens(TABLE_TOKENS), note(`토큰 ${TABLE_TOKENS.length}개. 잃어버린 정보가 없어요.`)));
      }
    }

    // 오른쪽: 두 답
    if (index < 4) {
      right.append(ghost('아직 아무것도 도착하지 않았어요'));
      return;
    }
    right.append(lane('A', '사진으로 받은 언어 모델',
      answer('3월 매출은 1,260만 원쯤으로 보여요. 글씨가 작아서 정확하지 않을 수 있어요.', index === 4, speed),
      checkList([{ ok: false, text: '1,280을 1,260으로 잘못 읽었어요' }, { ok: false, text: '숫자 묶음이 많아 느리고 비싸요' }], 'mm-lost')));
    right.append(lane('B', '글로 받은 언어 모델',
      answer('3월 매출은 1,280만 원이에요. 1월보다 300만 원 늘었어요.', index === 4, speed),
      checkList([{ ok: true, text: '정확해요. 계산도 맞아요' }], 'mm-diff')));
  },
};

export const SCENARIOS = [photoScenario, voiceScenario, editScenario, deliveryScenario];
