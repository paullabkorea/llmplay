// hallucination/app.js — '환각의 비밀' 페이지 시작점.
// 트윈 시뮬레이션(진짜 질문 vs 지어낼 수밖에 없는 질문)과 핵심 개념을 연결한다.

import { $, formatPct } from '../utils.js';
import { initTwinSim } from '../ui/twinSim.js';
import { initConcepts } from '../ui/concepts.js';
import { getDistribution } from '../core/model.js';
import { TWIN, HONEST_TOKENS } from './data.js';

// 질문 문구는 데이터에서 가져와 화면에 채운다 (데이터만 고치면 화면도 바뀜)
$('#q-real').textContent = TWIN.real.question;
$('#q-fake').textContent = TWIN.fake.question;

initTwinSim(
  {
    panels: {
      real: {
        answer: $('#answer-real'),
        probList: $('#probs-real'),
        conf: $('#conf-real'),
      },
      fake: {
        answer: $('#answer-fake'),
        probList: $('#probs-fake'),
        conf: $('#conf-fake'),
      },
    },
    btnPlay: $('#btn-play'),
    btnStep: $('#btn-step'),
    btnReset: $('#btn-reset'),
    speedSelect: $('#speed-select'),
    stageLabel: $('#stage-label'),
    verdict: $('#twin-verdict'),
    verdictText: $('#twin-verdict-text'),
  },
  {
    scenarios: { real: TWIN.real, fake: TWIN.fake },
    honestTokens: HONEST_TOKENS,
    buildVerdict({ avg }) {
      const honestP = getDistribution(TWIN.fake, TWIN.fake.prompt.at(-1))
        .filter((c) => HONEST_TOKENS.has(c.token))
        .reduce((a, c) => a + c.p, 0);
      return (
        `두 답의 평균 확신도는 왼쪽 <strong>${formatPct(avg.real)}</strong>, ` +
        `오른쪽 <strong>${formatPct(avg.fake)}</strong>로 비슷했어요. ` +
        `하지만 오른쪽 답은 전부 지어낸 것이에요. 확률 기계에게 당당한 말투와 사실 여부는 별개예요. ` +
        `"그런 건 없어요"가 뽑힐 확률은 처음부터 <strong>${formatPct(honestP)}</strong>뿐이었거든요.`
      );
    },
  },
);

initConcepts($('#concept-row'));
