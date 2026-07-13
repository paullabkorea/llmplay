// calc.test.mjs — '계산의 비밀' 시나리오 검증.
// 브라우저 없이 실행: node tests/calc.test.mjs
import { CALC_TWIN, HONEST_TOKENS, CORRECT } from '../js/calc/data.js';
import { getDistribution, sampleIndex } from '../js/core/model.js';
import { END_TOKEN } from '../js/config.js';

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

for (const scenario of [CALC_TWIN.easy, CALC_TWIN.hard]) {
  // 1) 모든 확률표의 확률 합은 1
  for (const key of Object.keys(scenario.transitions)) {
    const sum = getDistribution(scenario, key).reduce((a, c) => a + c.p, 0);
    if (Math.abs(sum - 1) > 1e-9) fail(`${scenario.id}/${key}: 확률 합 ${sum}`);
  }

  // 2) 100회 생성해도 maxRounds 안에 반드시 끝난다
  for (let trial = 0; trial < 100; trial++) {
    let last = scenario.prompt[scenario.prompt.length - 1];
    let rounds = 0;
    while (rounds++ < scenario.maxRounds + 2) {
      const dist = getDistribution(scenario, last);
      const picked = dist[sampleIndex(dist)];
      if (picked.token === END_TOKEN) break;
      last = picked.token;
      if (!scenario.transitions[picked.token]) break;
    }
    if (rounds > scenario.maxRounds + 2) fail(`${scenario.id}: 생성이 끝나지 않음`);
  }
}

// 3) 쉬운 계산: 정답 46이 1등 후보이고 확률이 압도적(80% 이상)이어야
//    "많이 본 문제는 외워서 맞힌다"는 연출이 성립한다
{
  const first = getDistribution(CALC_TWIN.easy, CALC_TWIN.easy.prompt.at(-1));
  if (first[0].token !== CORRECT.easy) fail(`쉬운 계산 1등 후보가 ${first[0].token}`);
  if (first[0].p < 0.8) fail(`쉬운 계산 정답 확률이 너무 낮음: ${first[0].p}`);
  console.log(`쉬운 계산에서 정답 46의 확률: ${(first[0].p * 100).toFixed(1)}%`);
}

// 4) 어려운 계산: 정직한 후보("계산기가 필요해요")가 존재하되 확률은 10% 미만
{
  const first = getDistribution(CALC_TWIN.hard, CALC_TWIN.hard.prompt.at(-1));
  const honest = first.filter((c) => HONEST_TOKENS.has(c.token));
  if (honest.length === 0) fail('어려운 계산에 정직한 후보가 없음');
  const honestP = honest.reduce((a, c) => a + c.p, 0);
  if (honestP >= 0.1) fail(`정직한 후보 확률이 너무 큼: ${honestP}`);
  console.log(`어려운 계산에서 "계산기가 필요해요"류 확률: ${(honestP * 100).toFixed(1)}%`);
}

// 5) 어려운 계산: 가능한 모든 생성 경로를 다 따라가도
//    진짜 정답(141,101,124)은 절대 나오지 않아야 한다
{
  const numbers = [];
  (function walk(token, acc) {
    for (const c of CALC_TWIN.hard.transitions[token] ?? []) {
      if (HONEST_TOKENS.has(c.t)) continue;              // 정직한 경로는 숫자가 아님
      if (c.t === END_TOKEN) continue;
      if (/^[\d,]+$/.test(c.t)) walk(c.t, acc + c.t);    // 숫자 조각이면 이어 붙임
      else numbers.push(acc);                            // '입니다'를 만나면 답 완성
    }
  })(CALC_TWIN.hard.prompt.at(-1), '');

  if (numbers.length === 0) fail('어려운 계산의 답 경로가 없음');
  for (const n of numbers) {
    if (n === CORRECT.hard) fail(`정답이 나올 수 있는 경로가 있음: ${n}`);
  }
  console.log(`어려운 계산의 가능한 답 ${numbers.length}가지 — 전부 오답 (예: ${numbers[0]})`);
}

console.log(failures === 0 ? '\n모든 테스트 통과 ✅' : `\n실패 ${failures}건 ❌`);
process.exit(failures === 0 ? 0 : 1);
