// model.js — "장난감 언어 모델".
// 시나리오의 확률표에서 다음 단어 후보를 찾고,
// 온도(temperature)를 적용해 확률을 만들고, 그중 하나를 뽑는다.

import { END_TOKEN } from '../config.js';

/**
 * 마지막 토큰을 보고 다음 단어 후보들의 확률 분포를 만든다.
 *
 * 온도 적용 방식: 가중치를 (1/온도) 제곱한 뒤 정규화.
 *  - 온도가 낮으면(0.2) 1등 확률이 더 커지고 (안정적)
 *  - 온도가 높으면(2.0) 확률이 고르게 퍼진다 (창의적)
 *
 * @returns {Array<{token: string, p: number}>} 확률 내림차순 정렬
 */
export function getDistribution(scenario, lastToken, temperature = 1) {
  const candidates = scenario.transitions[lastToken] ?? [{ t: END_TOKEN, w: 1 }];

  const powered = candidates.map((c) => Math.pow(c.w, 1 / temperature));
  const sum = powered.reduce((a, b) => a + b, 0);

  return candidates
    .map((c, i) => ({ token: c.t, p: powered[i] / sum }))
    .sort((a, b) => b.p - a.p);
}

/**
 * 확률 분포에서 단어 하나를 무작위로 뽑는다 (확률 룰렛).
 * @returns {number} 뽑힌 후보의 인덱스
 */
export function sampleIndex(distribution) {
  let r = Math.random();
  for (let i = 0; i < distribution.length; i++) {
    r -= distribution[i].p;
    if (r <= 0) return i;
  }
  return distribution.length - 1; // 부동소수점 오차 대비
}
