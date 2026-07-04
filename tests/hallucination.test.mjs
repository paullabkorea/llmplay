// hallucination.test.mjs — '환각의 비밀' 시나리오 검증.
// 브라우저 없이 실행: node tests/hallucination.test.mjs
import { TWIN, HONEST_TOKENS } from '../js/hallucination/data.js';
import { getDistribution, sampleIndex } from '../js/core/model.js';
import { END_TOKEN } from '../js/config.js';

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

for (const scenario of [TWIN.real, TWIN.fake]) {
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

// 3) 가짜 질문의 첫 분포: 정직한 후보가 존재하되, 확률은 10% 미만이어야
//    "기계는 모른다를 잘 안 뽑는다"는 연출이 성립한다
{
  const first = getDistribution(TWIN.fake, TWIN.fake.prompt.at(-1));
  const honest = first.filter((c) => HONEST_TOKENS.has(c.token));
  if (honest.length === 0) fail('가짜 질문에 정직한 후보가 없음');
  const honestP = honest.reduce((a, c) => a + c.p, 0);
  if (honestP >= 0.1) fail(`정직한 후보 확률이 너무 큼: ${honestP}`);
  console.log(`가짜 질문에서 "그런 건 없어요"류 확률: ${(honestP * 100).toFixed(1)}%`);
}

// 4) "확신은 비슷했다"는 평결이 성립하려면, 문장 전체(1등만 따라간 경로)의
//    평균 확신도가 두 질문에서 비슷해야 한다 (차이 20%p 미만)
{
  // 화면과 같은 기준: '(답 끝)'을 뽑은 단계는 확신도 집계에서 뺀다
  function greedyAvgConfidence(scenario) {
    let last = scenario.prompt.at(-1);
    const confidences = [];
    let guard = 0;
    while (guard++ < scenario.maxRounds + 2) {
      const top = getDistribution(scenario, last)[0];
      if (top.token === END_TOKEN) break;
      confidences.push(top.p);
      if (!scenario.transitions[top.token]) break;
      last = top.token;
    }
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  const avgReal = greedyAvgConfidence(TWIN.real);
  const avgFake = greedyAvgConfidence(TWIN.fake);
  if (Math.abs(avgReal - avgFake) > 0.2) {
    fail(`평균 확신도 차이가 너무 큼: 진짜 ${avgReal} vs 가짜 ${avgFake}`);
  }
  console.log(`평균 확신도 — 진짜 ${(avgReal * 100).toFixed(0)}% vs 가짜 ${(avgFake * 100).toFixed(0)}%`);
}

console.log(failures === 0 ? '\n모든 테스트 통과 ✅' : `\n실패 ${failures}건 ❌`);
process.exit(failures === 0 ? 0 : 1);
