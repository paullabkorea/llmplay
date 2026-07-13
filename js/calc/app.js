// calc/app.js — '계산의 비밀' 페이지 시작점.
// 트윈 시뮬레이션(외운 계산 vs 처음 보는 계산)과 핵심 개념을 연결한다.

import { $, formatPct } from '../utils.js';
import { initTwinSim } from '../ui/twinSim.js';
import { initConcepts } from '../ui/concepts.js';
import { getDistribution } from '../core/model.js';
import { CALC_TWIN, HONEST_TOKENS, CORRECT } from './data.js';

// 질문 문구는 데이터에서 가져와 화면에 채운다 (데이터만 고치면 화면도 바뀜)
$('#q-easy').textContent = CALC_TWIN.easy.question;
$('#q-hard').textContent = CALC_TWIN.hard.question;

/** 생성된 토큰에서 숫자 조각만 이어 붙여 답 숫자를 만든다 ('입니다' 등 제외) */
function joinNumber(generated) {
  return generated.filter((t) => /^[\d,]+$/.test(t)).join('');
}

initTwinSim(
  {
    panels: {
      easy: {
        answer: $('#answer-easy'),
        probList: $('#probs-easy'),
        conf: $('#conf-easy'),
      },
      hard: {
        answer: $('#answer-hard'),
        probList: $('#probs-hard'),
        conf: $('#conf-hard'),
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
    scenarios: { easy: CALC_TWIN.easy, hard: CALC_TWIN.hard },
    honestTokens: HONEST_TOKENS,
    stageLabels: {
      bars: '1단계: 두 계산 모두, 다음 숫자 조각 후보의 확률을 계산해요',
      pick: '2단계: 확률 룰렛을 돌려 조각 하나를 뽑아 답에 붙여요',
      done: '끝! 두 답을 진짜 정답과 비교해 보세요',
    },
    buildVerdict({ avg, states }) {
      const easyAnswer = joinNumber(states.easy.generated);
      const hardHonest = states.hard.generated.some((t) => HONEST_TOKENS.has(t));
      const hardAnswer = joinNumber(states.hard.generated);

      const easyPart = easyAnswer === CORRECT.easy
        ? `왼쪽 답 <strong>${easyAnswer}</strong>은 정답이에요. 하지만 계산해서 맞힌 게 아니라, ` +
          `훈련 데이터에서 수없이 본 문제라 "46"의 확률이 ${formatPct(avg.easy)}로 높았을 뿐이에요. 사실상 <strong>암기</strong>인 거예요.`
        : `왼쪽 답 <strong>${easyAnswer}</strong>은 틀렸어요! 정답 후보(46)의 확률이 압도적이어도 ` +
          `룰렛이라 아주 가끔 다른 숫자가 뽑혀요. 쉬운 계산조차 <strong>계산이 아니라 확률 뽑기</strong>라는 증거예요.`;

      const hardPart = hardHonest
        ? `오른쪽은 운 좋게 <strong>"계산기가 필요해요"</strong>가 뽑혔네요! 하지만 처음 확률표에서 이 후보는 ` +
          `${formatPct(getHonestP())}뿐이었어요. '처음부터'를 눌러 다시 돌리면 대부분 그럴듯한 가짜 숫자가 나와요.`
        : `오른쪽 답 <strong>${hardAnswer}</strong>는 자릿수 느낌만 그럴듯할 뿐, ` +
          `진짜 정답 <strong>${CORRECT.hard}</strong>가 아니에요. 그런데도 평균 확신도는 ${formatPct(avg.hard)}나 돼요. 당당하게 틀린 거예요.`;

      return `${easyPart}<br />${hardPart}`;
    },
  },
);

function getHonestP() {
  return getDistribution(CALC_TWIN.hard, CALC_TWIN.hard.prompt.at(-1))
    .filter((c) => HONEST_TOKENS.has(c.token))
    .reduce((a, c) => a + c.p, 0);
}

initConcepts($('#concept-row'));
