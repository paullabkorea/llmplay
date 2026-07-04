// tokenizer.js — 교육용 '모형' 토크나이저.
// 실제 LLM의 BPE 토크나이저가 아니라, 원리(글자가 아닌 조각 단위, 조각마다 번호)를
// 보여 주기 위한 규칙 기반 모형이다. DOM을 전혀 모르는 순수 함수라 테스트가 쉽다.
//
// 규칙 요약:
//   - 어휘표(WHOLE)에 통째로 실린 조각은 토큰 하나
//   - 영어 단어는 부분 조각(SUBWORDS)을 앞에서부터 탐욕적으로 매칭 (strawberry → st/raw/berry)
//   - 한국어는 조사·어미(SUFFIXES)를 떼어낸 뒤 남은 어간을 두 글자씩 자름
//   - 문장부호는 각각 토큰 하나
// → 어휘표가 영어 중심이라 같은 뜻이라도 한국어가 토큰을 더 쓰는 현상이 재현된다.

import { hashCode } from '../utils.js';

/** 어휘표에 통째로 실려 있어 토큰 하나가 되는 조각들 */
const WHOLE = new Set([
  // 영어 — 자주 쓰는 단어는 통째로 실려 있다
  'i', 'a', 'an', 'the', 'is', 'am', 'are', 'was', 'be', 'do', 'go', 'to',
  'in', 'on', 'at', 'it', 'and', 'or', 'but', 'not', 'you', 'we', 'he',
  'she', 'they', 'my', 'your', 'this', 'that', 'what', 'how', 'many',
  'school', 'house', 'water', 'apple', 'name', 'love', 'like', 'cat',
  'dog', 'book', 'letter', 'letters', 'there', 'hello', 'world',
  // 한국어 — 통째로 실린 조각은 훨씬 적다
  '안녕', '학교', '서울', '수도', '위니브', '한국', '사랑', '한글',
]);

/** 영어 부분 조각 사전 — 앞에서부터 가장 긴 것을 탐욕적으로 매칭 */
const SUBWORDS = [
  'berry', 'tion', 'ness', 'ing', 'ally', 'ful', 'raw', 'pre', 'est',
  'anti', 'dis', 'er', 'ed', 'ly', 'un', 'st', 're',
];

/** 한국어 조사·어미 — 단어 끝에서 가장 긴 것을 한 번 떼어낸다 */
const SUFFIXES = [
  '하세요', '입니다', '습니다', '합니다', '했어요', '이에요', '에서', '에게',
  '으로', '까지', '부터', '은', '는', '이', '가', '을', '를', '에', '의',
  '도', '와', '과', '로', '다', '요', '죠', '까',
];

/** 조각 → 어휘표 번호(ID). 같은 조각은 언제나 같은 번호가 나온다. */
export function tokenId(piece) {
  return hashCode(piece) % 50000;
}

/** 영어 단어 하나를 조각들로 자른다 */
function splitLatin(word) {
  const lower = word.toLowerCase();
  if (WHOLE.has(lower) || lower.length <= 2) return [word];

  const pieces = [];
  let rest = lower;
  while (rest.length > 0) {
    const sub = SUBWORDS.find((s) => rest.startsWith(s));
    if (sub) {
      pieces.push(sub);
      rest = rest.slice(sub.length);
    } else if (WHOLE.has(rest)) {
      pieces.push(rest);
      rest = '';
    } else {
      pieces.push(rest.slice(0, 3));
      rest = rest.slice(3);
    }
  }
  return pieces;
}

/** 한국어 덩어리 하나를 조각들로 자른다 */
function splitKorean(run) {
  if (WHOLE.has(run)) return [run];

  // 1) 끝의 조사·어미를 떼어낸다 (가장 긴 것 우선, 어간이 남는 경우만)
  let stem = run;
  let suffix = '';
  const found = [...SUFFIXES]
    .sort((a, b) => b.length - a.length)
    .find((s) => run.length > s.length && run.endsWith(s));
  if (found) {
    stem = run.slice(0, run.length - found.length);
    suffix = found;
  }

  // 2) 남은 어간: 어휘표에 있으면 통째로, 없으면 두 글자씩
  const pieces = [];
  if (WHOLE.has(stem) || stem.length <= 2) {
    pieces.push(stem);
  } else {
    for (let i = 0; i < stem.length; i += 2) pieces.push(stem.slice(i, i + 2));
  }
  if (suffix) pieces.push(suffix);
  return pieces;
}

/**
 * 문장 → 토큰 목록.
 * @returns {Array<{text: string, id: number}>}
 */
export function tokenize(text) {
  const tokens = [];
  // 한글 덩어리 / 영문 덩어리 / 숫자 / 공백 아닌 문장부호 하나씩
  const runs = text.match(/[가-힣]+|[A-Za-z]+|[0-9]+|[^\sA-Za-z0-9가-힣]/g) ?? [];

  for (const run of runs) {
    let pieces;
    if (/^[가-힣]/.test(run)) pieces = splitKorean(run);
    else if (/^[A-Za-z]/.test(run)) pieces = splitLatin(run);
    else pieces = [run]; // 숫자·문장부호
    for (const p of pieces) tokens.push({ text: p, id: tokenId(p) });
  }
  return tokens;
}
