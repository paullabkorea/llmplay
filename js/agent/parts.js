// agent/parts.js — '에이전트의 비밀' 페이지의 화면 부품들.
// 시나리오는 이 부품을 조립하기만 하고, 부품은 자기가 무슨 단계인지 모른다.

import { el } from '../utils.js';
import { typeText } from '../ui/typeFx.js';
import { DESK_FILES, FOLDER_NAME, OUTPUTS, FILES_DIR } from './data.js';

// ── 작은 부품 ────────────────────────────────────────────
/** 이번 단계에 막 나타난 요소 표시. app.js가 패널 안을 굴려 이 자리를 보여 준다. */
function fresh(node, animate) {
  if (animate) node.dataset.fresh = '';
  return node;
}

/** 실제 파일로 가는 링크. download가 참이면 새 탭에서 열지 않고 내려받는다. */
function fileLink(entry, className = 'ag-file-link') {
  const a = el('a', className, entry.label);
  a.href = FILES_DIR + entry.file;
  if (entry.download) a.download = entry.file;
  else { a.target = '_blank'; a.rel = 'noopener'; }
  return a;
}

/** 결과물 하나의 파일 링크 줄 */
export function fileLinks(key) {
  const row = el('div', 'ag-file-links');
  OUTPUTS[key].files.forEach((f) => row.append(fileLink(f)));
  return row;
}

export function ghost(text) {
  return el('p', 'ag-ghost', text);
}

export function note(text) {
  return el('p', 'ag-note', text);
}

export function label(text) {
  return el('p', 'ag-label', text);
}

/** 말풍선. who: 'me'(내가 시킨 말) | 'ai'(AI가 한 말) */
export function bubble(text, who = 'me') {
  return el('div', `ag-bubble ag-bubble-${who}`, text);
}

/** ✓ / ✗ 목록. items: [{ ok, text }] */
export function checkList(items, className = '') {
  const list = el('ul', `ag-check ${className}`.trim());
  items.forEach(({ ok, text }) => {
    const li = el('li', ok ? 'ok' : 'bad');
    li.append(el('span', 'ag-check-mark', ok ? '✓' : '✗'), el('span', '', text));
    list.append(li);
  });
  return list;
}

export function clear(...panels) {
  panels.forEach((p) => p.replaceChildren());
}

// ── 책상: 흩어진 파일이 폴더 하나로 모인다 ────────────────
/**
 * gathered가 참이면 파일들이 폴더로 빨려 들어간 상태. 사람이 끌어다 놓는 게 아니라
 * '모아줘' 한 줄에 Agent가 찾아 모으는 장면이라, 모션은 명령 다음 단계에 나온다.
 * animate가 참일 때만 날아가는 모션을 보여 준다(그 단계에 막 도착했을 때).
 */
export function desk({ gathered, animate, speed = 1 }) {
  const box = el('div', 'ag-desk');

  const folder = el('div', `ag-folder${gathered ? ' ag-folder-full' : ''}`);
  const head = el('p', 'ag-folder-head');
  head.append(el('span', 'ag-folder-icon', '📁'), el('span', '', `${FOLDER_NAME} 폴더`));
  folder.append(head);

  if (gathered) {
    const list = el('ul', 'ag-folder-list');
    DESK_FILES.forEach((f, i) => {
      const li = el('li');
      li.append(el('span', 'ag-file-icon', f.icon), el('span', '', f.name));
      if (animate) li.style.animationDelay = `${(420 + i * 140) / speed}ms`;
      else li.style.animation = 'none';
      list.append(li);
    });
    folder.append(list);
  } else {
    folder.append(el('p', 'ag-folder-empty', '여기로 모아요'));
  }
  box.append(folder);

  const cards = DESK_FILES.map((f) => {
    const card = el('div', 'ag-file');
    card.style.left = `${f.x}%`;
    card.style.top = `${f.y}%`;
    card.append(
      el('span', 'ag-file-icon', f.icon),
      el('span', 'ag-file-name', f.name),
      el('span', 'ag-file-kind', f.kind),
      el('span', 'ag-file-where', f.where),
    );
    box.append(card);
    return card;
  });

  if (gathered) {
    // 폴더 한가운데로 날아가려면 실제 좌표가 필요해서 붙은 뒤에 계산한다.
    const fly = () => cards.forEach((card, i) => {
      const toX = folder.offsetLeft + folder.offsetWidth / 2;
      const toY = folder.offsetTop + folder.offsetHeight / 2;
      card.style.setProperty('--tx', `${toX - (card.offsetLeft + card.offsetWidth / 2)}px`);
      card.style.setProperty('--ty', `${toY - (card.offsetTop + card.offsetHeight / 2)}px`);
      if (animate) card.style.transitionDelay = `${(i * 140) / speed}ms`;
      else card.classList.add('ag-file-instant');
      card.classList.add('ag-file-in');
    });
    if (animate) requestAnimationFrame(fly);
    else fly();
  }

  return fresh(box, animate);
}

// ── 질문지와 요청 입력창 ─────────────────────────────────
/**
 * 질문지: 같은 폴더를 두고 무엇을 시킬지 고르는 칩들.
 * onPick(id)을 주면 눌러서 바꿀 수 있다.
 */
export function requestSheet(requests, pickedId, onPick) {
  const box = el('div', 'ag-sheet');
  box.append(label('질문지: 무엇을 시킬까요?'));
  const row = el('div', 'ag-chips');
  requests.forEach((r) => {
    const chip = el('button', `ag-chip${r.id === pickedId ? ' ag-chip-on' : ''}`, r.text);
    chip.type = 'button';
    chip.addEventListener('click', () => onPick(r.id));
    row.append(chip);
  });
  box.append(row);
  return box;
}

/** 요청 입력창. animate가 참이면 한 자씩 찍는다. */
export function requestBox(text, { animate = false, speed = 1 } = {}) {
  const box = el('div', 'ag-input');
  box.append(el('span', 'ag-input-mark', '>'));
  const body = el('span', 'ag-input-text');
  if (animate) typeText(body, text, speed); else body.textContent = text;
  box.append(body);
  return fresh(box, animate);
}

// ── AI가 일하는 모습 ─────────────────────────────────────
/** 읽고 있는 파일 칩들 */
export function readChips(names, { animate = false, speed = 1 } = {}) {
  const row = el('div', 'ag-reads');
  names.forEach((n, i) => {
    const chip = el('span', 'ag-read', n);
    chip.prepend(el('span', 'ag-read-mark', '✓'));
    if (animate) chip.style.animationDelay = `${(i * 220) / speed}ms`;
    else chip.style.animation = 'none';
    row.append(chip);
  });
  return fresh(row, animate);
}

/** 켜진 Skill 카드들 */
export function skillCards(skills, { animate = false, speed = 1 } = {}) {
  const row = el('div', 'ag-skills');
  skills.forEach((s, i) => {
    const card = el('div', 'ag-skill');
    card.append(el('span', 'ag-skill-icon', '📁'), el('span', 'ag-skill-tag', s.tag), el('span', 'ag-skill-role', s.role));
    if (animate) card.style.animationDelay = `${(i * 240) / speed}ms`;
    else card.style.animation = 'none';
    row.append(card);
  });
  return fresh(row, animate);
}

/** 작업 로그. 한 줄씩 나타난다. */
export function workLog(lines, { animate = false, speed = 1, done = false } = {}) {
  const box = el('div', 'ag-log');
  lines.forEach((line, i) => {
    const row = el('p', 'ag-log-line');
    row.append(el('span', 'ag-log-mark', done ? '✓' : '·'), el('span', '', line));
    if (animate) row.style.animationDelay = `${(i * 260) / speed}ms`;
    else row.style.animation = 'none';
    box.append(row);
  });
  return fresh(box, animate);
}

// ── 결과물 ───────────────────────────────────────────────
/** 결과물 카드 하나. key는 OUTPUTS의 이름 */
export function outputCard(key, { animate = false, speed = 1, order = 0 } = {}) {
  const o = OUTPUTS[key];
  const card = el('div', 'ag-out');
  const img = el('img', 'ag-out-img');
  img.src = `assets/agent/${o.img}.webp`;
  img.alt = `${o.name} 화면 예시`;
  // 그림을 누르면 대표 파일(첫 항목)이 새 탭에서 열린다
  const open = fileLink(o.files[0], 'ag-out-open');
  open.replaceChildren(img, el('span', 'ag-out-hint', `실제 파일 · ${o.files[0].label}`));
  open.setAttribute('aria-label', `${o.name} 실제 파일 ${o.files[0].label}`);
  const head = el('p', 'ag-out-head');
  head.append(el('strong', '', o.name), el('span', 'ag-out-meta', o.meta));
  card.append(open, head, el('p', 'ag-out-note', o.note), fileLinks(key));
  if (animate) card.style.animationDelay = `${(order * 420) / speed}ms`;
  else card.style.animation = 'none';
  return fresh(card, animate);
}

/** 결과물이 아닌 그냥 사진 한 장 (휴대폰 화면 같은 것) */
export function photo(img, alt, caption) {
  const box = el('figure', 'ag-photo');
  const picture = el('img');
  picture.src = `assets/agent/${img}.webp`;
  picture.alt = alt;
  box.append(picture, el('figcaption', '', caption));
  return box;
}

/** Skill 폴더 속을 펼쳐 보여 주는 나무 모양. lines: [[파일 이름, 무엇이 적혀 있는지]] */
export function skillTree(tag, lines) {
  const box = el('div', 'ag-tree');
  box.append(el('p', 'ag-tree-head', `${tag}/`));
  const list = el('ul');
  lines.forEach(([file, what]) => {
    const li = el('li');
    li.append(el('code', '', file), el('span', '', what));
    list.append(li);
  });
  box.append(list);
  return box;
}

/** 걸린 시간 배지 */
export function timeBadge(minutes, thenText) {
  const box = el('div', 'ag-time');
  const then = el('span', 'ag-time-then', '예전 같으면 ');
  then.append(el('s', '', thenText));
  box.append(el('span', 'ag-time-now', `${minutes}분`), then);
  return box;
}
