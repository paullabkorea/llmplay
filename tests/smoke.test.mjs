// 임시 스모크 테스트 — 엔진/모델/시나리오가 브라우저 없이도 올바로 동작하는지 확인.
import { SCENARIOS } from '../js/data/scenarios.js';
import { GenerationEngine } from '../js/core/engine.js';
import { getDistribution } from '../js/core/model.js';
import { END_TOKEN, STAGES } from '../js/config.js';

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

// 1) 모든 시나리오: 확률 합이 1인지, 전이표의 모든 후보가 표에 있거나 종결되는지
for (const s of SCENARIOS) {
  for (const [key, cands] of Object.entries(s.transitions)) {
    const dist = getDistribution(s, key, 1);
    const sum = dist.reduce((a, c) => a + c.p, 0);
    if (Math.abs(sum - 1) > 1e-9) fail(`${s.id}/${key}: 확률 합 ${sum}`);
    for (const c of cands) {
      if (c.t !== END_TOKEN && !s.transitions[c.t]) {
        // 표에 없는 토큰은 자동 종결 — 오류는 아니지만 확인용 출력
        // console.log(`  (자동 종결) ${s.id}: ${key} -> ${c.t}`);
      }
    }
  }
}

// 2) 온도 효과: 온도가 낮으면 1등 확률이 커져야 한다
// (시나리오 순서가 바뀌어도 깨지지 않게, 첫 시나리오의 프롬프트 마지막 토큰을 쓴다)
{
  const s = SCENARIOS[0];
  const key = s.prompt[s.prompt.length - 1];
  const cold = getDistribution(s, key, 0.2)[0].p;
  const base = getDistribution(s, key, 1)[0].p;
  const hot = getDistribution(s, key, 2)[0].p;
  if (!(cold > base && base > hot)) fail(`온도 효과 이상: ${cold} / ${base} / ${hot}`);
}

// 3) 각 시나리오를 100회씩 끝까지 실행 — 무한 루프/예외 없이 종료되는지
for (const s of SCENARIOS) {
  for (let trial = 0; trial < 100; trial++) {
    const engine = new GenerationEngine();
    let doneEvents = 0;
    let stageEvents = 0;
    engine.addEventListener('done', () => doneEvents++);
    engine.addEventListener('stage', () => stageEvents++);
    engine.setTemperature(0.2 + Math.random() * 1.8);
    engine.reset(s);

    let guard = 0;
    while (!engine.done && guard++ < 500) engine.next();

    if (!engine.done) fail(`${s.id}: 500스텝 안에 끝나지 않음`);
    if (doneEvents !== 1) fail(`${s.id}: done 이벤트 ${doneEvents}회`);
    if (engine.generated.length > s.maxRounds) fail(`${s.id}: maxRounds 초과 (${engine.generated.length})`);
    const expectedMin = STAGES.length; // 최소 한 라운드
    if (stageEvents < expectedMin) fail(`${s.id}: stage 이벤트가 너무 적음 (${stageEvents})`);
  }
  // 예시 출력 한 번
  const engine = new GenerationEngine();
  engine.reset(s);
  let guard = 0;
  while (!engine.done && guard++ < 500) engine.next();
  console.log(`${s.id}: "${engine.contextTokens().join(' ')}"`);
}

console.log(failures === 0 ? '\n모든 테스트 통과 ✅' : `\n실패 ${failures}건 ❌`);
process.exit(failures === 0 ? 0 : 1);
