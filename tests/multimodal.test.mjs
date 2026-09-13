import assert from 'node:assert/strict';
import { patchFeatures, audioFeatures, makeVoice, detailSurvives, VOICE_SYLLABLES, SYLLABLE_SECONDS } from '../js/multimodal/model.js';
import { HOUSE_ORIGINAL, HOUSE_REGENERATED } from '../js/multimodal/draw.js';
import { SCENARIOS, COLUMNS, SIZE } from '../js/multimodal/scenarios.js';

// 색이 다른 두 열을 합치거나 분리할 때, 공간과 평균을 모두 보존하는가?
const pixels = new Uint8ClampedArray([
  255, 0, 0, 255, 0, 0, 255, 255,
  255, 0, 0, 255, 0, 0, 255, 255,
]);
assert.deepEqual(patchFeatures(pixels, 2, 2, 1)[0].rgb, [.5, 0, .5]);
const split = patchFeatures(pixels, 2, 2, 2);
assert.deepEqual(split.map((p) => p.rgb), [[1, 0, 0], [0, 0, 1], [1, 0, 0], [0, 0, 1]]);
assert.deepEqual([split[3].row, split[3].col], [1, 1]);

// 구간의 마지막 나머지 표본도 포함하며, 무음에서 NaN이 나오지 않아야 한다.
assert.deepEqual(audioFeatures(Float32Array.of(0, 0, .5, -.5, 1), 2, 1), [
  { start: 0, end: 1, rms: 0, peak: 0 },
  { start: 1, end: 2, rms: .5, peak: .5 },
  { start: 2, end: 2.5, rms: 1, peak: 1 },
]);

// "정말~ 잘했네" 목소리: 음절 수만큼 시간 조각이 나오고, 길게 끄는 "말~"이 "했"보다 커야 한다.
const rate = 8000;
const voice = makeVoice(rate);
assert.equal(voice.length, rate * SYLLABLE_SECONDS * VOICE_SYLLABLES.length);
const chunks = audioFeatures(voice, rate, SYLLABLE_SECONDS);
assert.equal(chunks.length, VOICE_SYLLABLES.length);
assert.ok(chunks[1].rms > chunks[3].rms);
assert.ok(voice.every((v) => Math.abs(v) <= 1));

// 8칸 격자에서는 18px 글씨(OPEN 표지판)가 조각보다 작아 뭉개지고, 격자를 잘게 하면 살아남는다.
assert.equal(detailSurvives(SIZE, COLUMNS, 18), false);
assert.equal(detailSurvives(SIZE, 32, 18), true);

// 데모 3의 전제: 주문서대로 지붕은 바뀌지만, 부탁하지 않은 곳도 여러 군데 달라진다.
assert.notEqual(HOUSE_REGENERATED.roof, HOUSE_ORIGINAL.roof);
const drifted = Object.keys(HOUSE_ORIGINAL).filter((k) => k !== 'roof' && HOUSE_ORIGINAL[k] !== HOUSE_REGENERATED[k]);
assert.ok(drifted.length >= 3, `달라진 항목: ${drifted.join(', ')}`);
assert.ok(drifted.includes('sign') && drifted.includes('windows') && drifted.includes('door'));

// 시나리오 데이터: 패널 3개, 단계마다 말풍선을 띄울 패널·배지·설명·시간이 있고 번호가 1부터 이어진다.
assert.equal(SCENARIOS.length, 4);
assert.equal(new Set(SCENARIOS.map((s) => s.id)).size, 4);
for (const s of SCENARIOS) {
  assert.equal(s.panels.length, 3, s.id);
  assert.equal(typeof s.render, 'function', s.id);
  assert.ok(s.steps.length >= 5, s.id);
  s.steps.forEach((step, i) => {
    assert.ok(['left', 'mid', 'right'].includes(step.panel), `${s.id} ${i}`);
    assert.ok(step.badge.startsWith(`${i + 1}단계`), `${s.id} ${step.badge}`);
    assert.ok(step.tip.length > 20 && step.duration > 0, `${s.id} ${i}`);
    assert.ok(!step.tip.includes('—'), `${s.id} ${i}: 문구에 줄표 금지`);
  });
}

console.log('멀티모달 조각 계산·목소리 모형·시나리오 구조 검증 통과');
