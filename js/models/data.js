// models/data.js — '모델의 비밀' 페이지의 모델·작업 데이터.
// 가격이나 성능 지수가 바뀌면 이 파일만 고치면 된다.
//
// 데이터 출처 (페이지 하단 '자료 출처와 기준일' 섹션과 함께 관리):
// - 가격·상대 속도: Anthropic 공식 문서 Models overview / Pricing, 2026-07-19 확인
//   https://platform.claude.com/docs/en/about-claude/models/overview
// - 성능 지수: Artificial Analysis Intelligence Index v4.1, 2026년 7월
//   https://artificialanalysis.ai/models

export const USD_TO_KRW = 1400; // 원화 어림 환산용. 출처 섹션에 명시된 가정값.

// 가격: 100만 토큰당 미국 달러, 정가 기준 (기간 한정 할인은 반영하지 않음).
// dials: 데모 1의 다이얼 판에 그릴 개수. 실제 파라미터 수는 비공개라서
// "작은 모델일수록 다이얼이 적다"는 상대 크기만 나타내는 교육용 어림 모형이다.
// raceTokens: 데모 3의 경주 연출에서 같은 시간 동안 만드는 토큰 수(상대 속도 어림).
export const MODELS = [
  { name: 'Haiku 4.5', input: 1, output: 5, perf: 37, speed: '가장 빠름', raceTokens: 60, dials: 100, mult: '1배' },
  { name: 'Sonnet 5', input: 3, output: 15, perf: 53, speed: '빠름', raceTokens: 42, dials: 1000, mult: '10배' },
  { name: 'Opus 4.8', input: 5, output: 25, perf: 56, speed: '보통', raceTokens: 26, dials: 10000, mult: '100배' },
  { name: 'Fable 5', input: 10, output: 50, perf: 60, speed: '느림', raceTokens: 14, dials: 100000, mult: '1,000배' },
];

// 데모 4의 작업 목록. inTok/outTok은 1회 실행에 드는 대략적인 토큰 수,
// need는 결과 품질이 괜찮으려면 필요한 최소 성능 지수(교육용 어림값).
export const TASKS = [
  {
    label: '맞춤법 고치기',
    desc: '짧은 글의 맞춤법과 띄어쓰기를 고쳐요. 1회에 대략 입력 600 + 출력 600 토큰.',
    inTok: 600, outTok: 600, need: 30,
  },
  {
    label: '기사 3줄 요약',
    desc: '뉴스 기사 한 편을 3줄로 줄여요. 1회에 대략 입력 2,000 + 출력 200 토큰.',
    inTok: 2000, outTok: 200, need: 30,
  },
  {
    label: '보고서 초안 쓰기',
    desc: '주제와 개요를 주면 수행평가 보고서 초안을 써요. 1회에 대략 입력 800 + 출력 2,500 토큰.',
    inTok: 800, outTok: 2500, need: 50,
  },
  {
    label: '코드 버그 찾기',
    desc: '꽤 긴 코드를 읽고 숨은 버그를 찾아 고쳐요. 1회에 대략 입력 6,000 + 출력 2,500 토큰.',
    inTok: 6000, outTok: 2500, need: 55,
  },
  {
    label: '긴 자동화 작업',
    desc: '자료 조사부터 정리까지 여러 단계를 혼자 처리하는 어려운 작업이에요. 1회에 대략 입력 30,000 + 출력 10,000 토큰.',
    inTok: 30000, outTok: 10000, need: 60,
  },
];
