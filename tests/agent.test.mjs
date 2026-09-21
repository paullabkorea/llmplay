// agent.test.mjs — '에이전트의 비밀' 페이지의 재료와 각본 검증.
// 브라우저 없이 실행: node tests/agent.test.mjs
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DESK_FILES, GATHER, OUTPUTS, FILES_DIR, REQUESTS, PIPELINE, WENIV_SKILLS, THEN_NOW } from '../js/agent/data.js';
import { SCENARIOS } from '../js/agent/scenarios.js';
import { StepPlayer } from '../js/core/stepPlayer.js';

const asset = (name) => fileURLToPath(new URL(`../assets/agent/${name}.webp`, import.meta.url));

// 1) 결과물 그림과 실제 파일이 있어야 화면에 깨진 이미지·죽은 링크가 뜨지 않는다.
const real = (name) => fileURLToPath(new URL(`../${FILES_DIR}${name}`, import.meta.url));
for (const [key, out] of Object.entries(OUTPUTS)) {
  assert.ok(existsSync(asset(out.img)), `${key}: assets/agent/${out.img}.webp 가 없음`);
  assert.ok(out.files.length > 0, `${key}: 실제 파일이 없음`);
  out.files.forEach((f) => {
    assert.ok(existsSync(real(f.file)), `${key}: ${FILES_DIR}${f.file} 가 없음`);
    assert.ok(/(열기|받기)$/.test(f.label), `${key}: 링크 이름은 '열기'나 '받기'로 끝나야 한다 (${f.label})`);
    if (f.download) assert.ok(!/\.(pdf|html)$/.test(f.file), `${key}: PDF·HTML은 받지 말고 열어야 한다`);
  });
}
assert.ok(existsSync(asset('phone')), '휴대폰 화면 사진이 없음');

// 2) 질문지: 아이디가 겹치지 않고, 고른 결과물이 모두 OUTPUTS에 있어야 한다.
const ids = REQUESTS.map((r) => r.id);
assert.equal(new Set(ids).size, ids.length, '질문지 아이디가 겹침');
assert.equal(REQUESTS[0].id, 'edu', '처음 보이는 명령은 교육 자료 요청이어야 한다');
assert.ok(REQUESTS[0].text.includes('제주 AX 교육 자료'), '첫 명령 문구가 바뀜');
for (const r of REQUESTS) {
  assert.ok(r.outputs.length > 0, `${r.id}: 결과물이 없음`);
  r.outputs.forEach((k) => assert.ok(OUTPUTS[k], `${r.id}: 모르는 결과물 ${k}`));
  // 읽는 파일은 폴더에 모은 파일 중 하나여야 한다
  const inFolder = new Set(DESK_FILES.map((f) => f.name));
  r.reads.forEach((n) => assert.ok(inFolder.has(n), `${r.id}: 폴더에 없는 파일 ${n}`));
  // Skill 없이 끝내는 요청은 그 이유가 적혀 있어야 한다
  if (r.skills.length === 0) assert.ok(r.noSkillNote, `${r.id}: Skill을 안 쓰는 이유가 없음`);
  assert.ok(r.minutes > 0 && r.then, `${r.id}: 걸린 시간 표시가 없음`);
}

// 3) 흩어진 파일(폭 40%)은 책상 밖으로 나가지 않고, 아래쪽 폴더 자리도 비워 둬야 한다.
//    파일마다 원래 있던 자리가 있어야 'Agent가 찾아 모은다'는 장면이 선다.
assert.ok(GATHER.text.includes('모아줘') && GATHER.log.length >= 2, '첫 명령(모아줘)과 작업 기록이 있어야 한다');
for (const f of DESK_FILES) {
  assert.ok(f.where, `${f.name}: 원래 있던 자리(where)가 없음`);
  assert.ok(f.x >= 0 && f.x <= 60, `${f.name}: 가로 위치 ${f.x}%가 책상 밖`);
  assert.ok(f.y >= 0 && f.y <= 55, `${f.name}: 세로 위치 ${f.y}%가 폴더 자리를 침범`);
}

// 4) 파이프라인: 결과물과 Skill 이름이 실제로 있는 것이어야 한다.
const skillTags = new Set(WENIV_SKILLS.map((s) => s.tag));
for (const p of PIPELINE) {
  assert.ok(OUTPUTS[p.key], `파이프라인: 모르는 결과물 ${p.key}`);
  assert.ok(skillTags.has(p.tag), `파이프라인: 목록에 없는 Skill ${p.tag}`);
}
REQUESTS.flatMap((r) => r.skills).forEach((s) => {
  assert.ok(skillTags.has(s.tag), `질문지: 목록에 없는 Skill ${s.tag}`);
});
assert.equal(WENIV_SKILLS.length, 9, '위니브 Skill은 아홉 가지');

// 5) 각본: 단계마다 패널, 배지, 설명, 시간이 있어야 한다.
const PANELS = new Set(['left', 'mid', 'right']);
for (const s of SCENARIOS) {
  assert.equal(s.panels.length, 3, `${s.id}: 패널 제목이 3개가 아님`);
  assert.ok(s.steps.length >= 6, `${s.id}: 단계가 너무 적음`);
  s.steps.forEach((step, i) => {
    assert.ok(PANELS.has(step.panel), `${s.id} ${i + 1}단계: 모르는 패널 ${step.panel}`);
    assert.ok(step.badge && step.tip, `${s.id} ${i + 1}단계: 배지나 설명이 없음`);
    assert.ok(step.duration >= 2000, `${s.id} ${i + 1}단계: 너무 빨리 넘어감`);
  });
  // 첫 단계는 왼쪽(재료)에서 시작해 오른쪽(결과)에서 끝난다
  assert.equal(s.steps[0].panel, 'left', `${s.id}: 첫 단계는 왼쪽이어야 한다`);
  assert.equal(s.steps.at(-1).panel, 'right', `${s.id}: 마지막 단계는 오른쪽이어야 한다`);
}

// 데모 1은 '모아줘'가 사람의 드래그가 아니라 명령으로 나와야 한다: 2단계는 가운데(명령), 3단계는 왼쪽(모임)
const gather = SCENARIOS.find((s) => s.id === 'gather');
assert.deepEqual([gather.steps[1].panel, gather.steps[2].panel], ['mid', 'left'], '모아줘 명령 다음에 파일이 모여야 한다');
assert.ok(gather.steps[1].tip.includes('모아줘'), '2단계 설명에 모아줘가 있어야 한다');

// 파이프라인 데모는 결과물 하나마다 단계 하나가 필요하다 (시작 1 + 결과물 N + 정리 1)
const pipeline = SCENARIOS.find((s) => s.id === 'pipeline');
assert.equal(pipeline.steps.length, PIPELINE.length + 2, '파이프라인 단계 수가 결과물 수와 맞지 않음');

// 6) 단계 재생기: 앞으로 갔다가 뒤로 돌아올 수 있고, 처음까지 돌아가면 reset이 난다.
{
  const p = new StepPlayer();
  const events = [];
  ['reset', 'step', 'done'].forEach((t) => p.addEventListener(t, () => events.push(t)));
  p.reset(SCENARIOS[0]);
  p.next(); p.next(); p.prev();
  assert.equal(p.index, 1, '두 번 가고 한 번 돌아오면 1단계');
  p.prev();
  assert.equal(p.index, 0);
  assert.deepEqual(events, ['reset', 'step', 'step', 'step', 'reset'], '처음까지 돌아가면 step 대신 reset');
  p.prev();
  assert.equal(events.length, 5, '0단계에서 이전은 아무 일도 없어야 한다');
  while (!p.done) p.next();
  assert.equal(events.at(-1), 'done');
  assert.equal(p.index, SCENARIOS[0].steps.length);
}

// 7) 그때와 지금: 지금이 더 빨라야 말이 된다.
for (const row of THEN_NOW) {
  assert.ok(row.thenH > row.nowH, `${row.job}: 지금이 더 느리게 적혀 있음`);
  assert.ok(row.nowH > 0, `${row.job}: 지금 시간이 0`);
}

console.log(`통과: 결과물 ${Object.keys(OUTPUTS).length}종, 질문지 ${REQUESTS.length}개, 데모 ${SCENARIOS.length}개`);
