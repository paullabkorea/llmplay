// context.test.mjs — '대화의 비밀' 페이지의 각본 데이터 검증.
// 브라우저 없이 실행: node tests/context.test.mjs
import {
  CONVERSATION,
  SUMMARY_HANDOFF,
  TOKEN_LIMIT_HINT,
  GAUGE_MAX,
  focusFor,
  statusFor,
} from '../js/context/data.js';

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

// 1) 모든 메시지의 토큰 수는 양의 정수
CONVERSATION.forEach((turn, i) => {
  for (const role of ['user', 'ai']) {
    const t = turn[role].tokens;
    if (!Number.isInteger(t) || t <= 0) fail(`턴 ${i + 1} ${role}: 토큰 수 이상 (${t})`);
    if (!turn[role].text) fail(`턴 ${i + 1} ${role}: 본문 없음`);
  }
});

// 2) 요청 토큰(이전 대화 전체 + 새 질문)은 턴마다 반드시 커져야 한다
{
  let ctx = 0;
  let prevReq = 0;
  for (const [i, turn] of CONVERSATION.entries()) {
    const req = ctx + turn.user.tokens;
    if (req <= prevReq) fail(`턴 ${i + 1}: 요청 토큰이 줄어듦 (${prevReq} → ${req})`);
    prevReq = req;
    ctx += turn.user.tokens + turn.ai.tokens;
  }

  // 3) 대화가 끝나면 '새 창 추천' 기준을 넘고, 게이지 최대는 넘지 않아야 한다
  if (ctx <= TOKEN_LIMIT_HINT) fail(`누적 ${ctx}토큰 — 경고 기준(${TOKEN_LIMIT_HINT})을 넘지 못함`);
  if (ctx > GAUGE_MAX) fail(`누적 ${ctx}토큰 — 게이지 최대(${GAUGE_MAX})를 벗어남`);
  console.log(`대화 ${CONVERSATION.length}턴, 최종 누적 ${ctx}토큰`);
}

// 4) 요약 인수인계는 경고 기준보다 훨씬 가벼워야 이야기가 성립한다
if (SUMMARY_HANDOFF.tokens >= TOKEN_LIMIT_HINT / 10) {
  fail(`요약 토큰(${SUMMARY_HANDOFF.tokens})이 너무 큼`);
}

// 5) 집중력 곡선: 0~GAUGE_MAX 구간에서 단조 감소, 항상 30~100 사이
{
  let prev = Infinity;
  for (let t = 0; t <= GAUGE_MAX; t += 250) {
    const f = focusFor(t);
    if (f < 30 || f > 100) fail(`focusFor(${t}) = ${f} — 범위 밖`);
    if (f > prev) fail(`focusFor(${t}) = ${f} — 증가함 (이전 ${prev})`);
    prev = f;
  }
  if (focusFor(0) !== 100) fail(`focusFor(0) = ${focusFor(0)} — 100이어야 함`);
}

// 6) 상태 메시지: 경고 기준을 넘으면 반드시 'bad'
{
  const levels = ['ok', 'warn', 'bad'];
  for (const t of [0, 500, 3000, 8000, TOKEN_LIMIT_HINT, 12000]) {
    const { level, msg } = statusFor(t);
    if (!levels.includes(level)) fail(`statusFor(${t}): 알 수 없는 단계 ${level}`);
    if (!msg) fail(`statusFor(${t}): 메시지 없음`);
    if (t >= TOKEN_LIMIT_HINT && level !== 'bad') fail(`statusFor(${t}): bad여야 함 (${level})`);
  }
}

console.log(failures === 0 ? '\n모든 테스트 통과 ✅' : `\n실패 ${failures}건 ❌`);
process.exit(failures === 0 ? 0 : 1);
