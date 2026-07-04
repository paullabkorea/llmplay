// utils.js — 여러 모듈에서 함께 쓰는 작은 도우미 함수들.

/** document.querySelector 축약 */
export function $(selector) {
  return document.querySelector(selector);
}

/** 요소 생성 축약: el('div', 'my-class', '내용') */
export function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** 문자열 → 항상 같은 값이 나오는 해시(음이 아닌 정수). 토큰별 색/벡터를 고정하는 데 사용. */
export function hashCode(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** 토큰마다 고정된 색상(hue)을 돌려준다. */
export function tokenHue(token) {
  return hashCode(token) % 360;
}

/**
 * 토큰마다 고정된 가짜 임베딩 벡터를 만든다.
 * (교육용 연출 — 실제 임베딩이 아니라 해시로 만든 일정한 숫자들)
 */
export function pseudoVector(token, dims) {
  const nums = [];
  let h = hashCode(token);
  for (let i = 0; i < dims; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const v = ((h % 1000) / 1000) * 1.8 - 0.9; // -0.9 ~ 0.9
    nums.push(v.toFixed(2));
  }
  return nums;
}

/** 0~1 확률 → "76%" 형태 문자열 */
export function formatPct(p) {
  return `${Math.round(p * 100)}%`;
}

/** 숫자에 천 단위 쉼표 */
export function formatNumber(n) {
  return n.toLocaleString('ko-KR');
}
