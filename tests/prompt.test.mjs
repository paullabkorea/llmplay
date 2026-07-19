// prompt.test.mjs — '프롬프트의 비밀' 시나리오 검증.
// 브라우저 없이 실행: node tests/prompt.test.mjs
import {
  DIRECTIONS, VARIANTS, HIDDEN_NOTES, QUESTION, HIDDEN_QUESTION,
  BUILD_QUESTION, BUILD_BASE, INGREDIENTS, BUILD_BRANCHES,
  buildScore, buildAnswer, branchProbs,
} from '../js/prompt/data.js';

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

// promptSim.toDistribution과 같은 계산 (DOM 없이 쓰려고 여기서 다시 정의)
function toDistribution(variant) {
  const sum = DIRECTIONS.reduce((a, d) => a + variant.weights[d.id], 0);
  return DIRECTIONS.map((d) => ({ id: d.id, p: variant.weights[d.id] / sum }));
}

// 1) 기본 데이터 모양
if (!QUESTION) fail('QUESTION이 비어 있음');
if (!HIDDEN_QUESTION) fail('HIDDEN_QUESTION이 비어 있음');
for (const d of DIRECTIONS) {
  if (!d.label || !d.answer) fail(`방향 ${d.id}: label 또는 answer가 비어 있음`);
}
for (const n of HIDDEN_NOTES) {
  if (!n.btn || !n.note || !n.answer) fail(`숨은 쪽지 ${n.id}: 내용이 비어 있음`);
}

// 2) 모든 변형은 모든 방향의 가중치를 갖고, 확률 합은 1
for (const v of VARIANTS) {
  for (const d of DIRECTIONS) {
    if (!(d.id in v.weights)) fail(`변형 ${v.id}: 방향 ${d.id}의 가중치가 없음`);
    if (v.weights[d.id] <= 0) fail(`변형 ${v.id}/${d.id}: 가중치는 0보다 커야 함 (확률 기계는 어떤 방향도 완전히 배제하지 않음)`);
  }
  const sum = toDistribution(v).reduce((a, c) => a + c.p, 0);
  if (Math.abs(sum - 1) > 1e-9) fail(`변형 ${v.id}: 확률 합 ${sum}`);
}

// 3) 앞글 없는 기본 변형: 1등 확률이 60% 미만이어야
//    "앞글이 없으면 기계는 어느 사과인지 모른다"는 연출이 성립한다
{
  const plain = VARIANTS.find((v) => v.id === 'plain');
  const top = Math.max(...toDistribution(plain).map((c) => c.p));
  if (top >= 0.6) fail(`기본 변형의 1등 확률이 너무 큼: ${top}`);
  console.log(`앞글 없이: 1등 방향 확률 ${(top * 100).toFixed(0)}% (애매함 유지)`);
}

// 4) 앞글이 있는 변형: 밀어 올리려는 방향(boost)이 압도적 1등(70% 이상)이어야
//    "맥락 한 줄이 확률을 통째로 옮긴다"는 연출이 성립한다
for (const v of VARIANTS.filter((v) => v.boost)) {
  const dist = toDistribution(v);
  const boosted = dist.find((c) => c.id === v.boost);
  const top = [...dist].sort((a, b) => b.p - a.p)[0];
  if (top.id !== v.boost) fail(`변형 ${v.id}: 1등이 ${top.id} (기대: ${v.boost})`);
  if (boosted.p < 0.7) fail(`변형 ${v.id}: ${v.boost} 확률이 너무 낮음 ${boosted.p}`);
  console.log(`"${v.btn}" → ${v.boost} 방향 ${(boosted.p * 100).toFixed(0)}%`);
}

// 5) 데모 3: 재료를 얹을수록 확률이 오르고, 다 담아도 100%는 아니어야
//    "재료는 확률을 끌어올리는 장치일 뿐"이라는 연출이 성립한다
{
  if (!BUILD_QUESTION) fail('BUILD_QUESTION이 비어 있음');
  for (const i of INGREDIENTS) {
    if (!i.tag || !i.btn || !i.text) fail(`재료 ${i.id}: 내용이 비어 있음`);
    if (!(i.gain > 0)) fail(`재료 ${i.id}: gain은 0보다 커야 함`);
    if (buildScore([i.id]) <= BUILD_BASE) fail(`재료 ${i.id}가 확률을 못 올림`);
  }
  const full = buildScore(INGREDIENTS.map((i) => i.id));
  if (full >= 100) fail(`재료를 다 담았는데 확률이 ${full}% — 100% 미만이어야 정직하다`);
  console.log(`재료 0개 ${BUILD_BASE}% → 4개 전부 ${full}%`);
}

// 6) 데모 3 답변 예시: 16가지 조합 전부 서로 다르고, 상황의 유무가 내용을 가른다
{
  const ids = INGREDIENTS.map((i) => i.id);
  const answers = [];
  for (let mask = 0; mask < 1 << ids.length; mask++) {
    answers.push(buildAnswer(ids.filter((_, k) => mask & (1 << k))));
  }
  if (answers.some((a) => !a)) fail('빈 답변이 있는 조합이 있음');
  if (new Set(answers).size !== answers.length) fail('재료 조합이 달라도 답이 같은 경우가 있음');
  if (!buildAnswer([]).includes('몰라서')) fail('상황 없는 답변이 막연함을 드러내지 않음');
  if (!buildAnswer(['situation']).includes('협재')) fail('상황을 줬는데 맞춤 답이 아님');
  console.log(`재료 조합 ${answers.length}가지 답변 전부 서로 다름`);
}

// 7) 데모 3 갈래 지도: 재료를 얹으면 확률 물줄기가 원하는 갈래로 옮겨 가야 한다
{
  const allIds = INGREDIENTS.map((i) => i.id);
  const desired = BUILD_BRANCHES.filter((b) => b.desired);
  if (desired.length !== 1) fail(`원하는 갈래는 정확히 1개여야 함 (현재 ${desired.length}개)`);
  const bestLeaves = BUILD_BRANCHES.flatMap((b) => b.leaves).filter((l) => l.best);
  if (bestLeaves.length !== 1) fail(`최선 잔가지는 정확히 1개여야 함 (현재 ${bestLeaves.length}개)`);
  if (!desired[0].leaves.some((l) => l.best)) fail('최선 잔가지가 원하는 갈래 안에 없음');

  for (const onIds of [[], ['situation'], ['example'], allIds]) {
    const p = branchProbs(onIds);
    const total = BUILD_BRANCHES.reduce((a, b) => a + p.branch[b.id], 0);
    if (Math.abs(total - 100) > 1e-9) fail(`갈래 확률 합이 ${total} (재료: ${onIds.join(',') || '없음'})`);
    for (const b of BUILD_BRANCHES) {
      const leafSum = b.leaves.reduce((a, l) => a + p.leaf[l.id], 0);
      if (Math.abs(leafSum - p.branch[b.id]) > 1e-9) fail(`갈래 ${b.id}: 잔가지 확률 합이 갈래 확률과 다름`);
      for (const l of b.leaves) {
        if (!(p.leaf[l.id] > 0)) fail(`잔가지 ${l.id}: 확률이 0 (어떤 갈래도 완전히 배제되면 안 됨)`);
      }
    }
    if (Math.abs(p.branch[desired[0].id] - buildScore(onIds)) > 1e-9) {
      fail('원하는 갈래의 확률이 게이지(buildScore)와 다름');
    }
  }

  // 재료가 없으면 원하는 갈래가 1등이 아니고, 다 얹으면 최선 잔가지가 잎 중 1등이어야
  const empty = branchProbs([]);
  const topBranch = Object.entries(empty.branch).sort((a, b) => b[1] - a[1])[0][0];
  if (topBranch === desired[0].id) fail('재료가 없는데 원하는 갈래가 이미 1등임');
  const full = branchProbs(allIds);
  const topLeaf = Object.entries(full.leaf).sort((a, b) => b[1] - a[1])[0][0];
  if (topLeaf !== bestLeaves[0].id) fail(`재료를 다 얹었는데 잎 1등이 ${topLeaf} (기대: ${bestLeaves[0].id})`);

  // 예시 재료는 원하는 갈래 안에서 최선 잔가지의 비중을 키워야
  const noExample = branchProbs(allIds.filter((id) => id !== 'example'));
  const bestShare = (p) => p.leaf[bestLeaves[0].id] / p.branch[desired[0].id];
  if (!(bestShare(full) > bestShare(noExample))) fail('예시 재료가 최선 잔가지의 비중을 못 올림');

  console.log(`갈래 지도: 원하는 갈래 ${empty.branch[desired[0].id]}% → ${full.branch[desired[0].id]}%, 최선 잔가지 ${full.leaf[bestLeaves[0].id].toFixed(1)}%`);
}

console.log(failures === 0 ? '\n모든 테스트 통과 ✅' : `\n실패 ${failures}건 ❌`);
process.exit(failures === 0 ? 0 : 1);
