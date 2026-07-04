// config.js — 시뮬레이션 전체에서 쓰는 상수 모음.
// 애니메이션 속도나 신경망 그림의 크기를 바꾸고 싶으면 이 파일만 고치면 된다.

/** 생성 1회(라운드)를 이루는 단계들. engine이 이 순서대로 진행한다. */
export const STAGES = ['tokenize', 'embed', 'compute', 'probs', 'sample', 'append'];

/** 각 단계의 기본 재생 시간(ms). 자동 재생 시 속도 배율로 나눠서 사용. */
export const STAGE_DURATIONS = {
  tokenize: 1800,
  embed: 2200,
  compute: 2800,
  probs: 2000,
  sample: 2000,
  append: 1600,
};

/** 신경망 캔버스 그림 설정 */
export const NETWORK = {
  layers: 7,      // 겹쳐 그릴 판(레이어) 수
  rows: 5,        // 판 하나의 다이얼 행 수
  cols: 9,        // 판 하나의 다이얼 열 수
  waveCount: 1,   // compute 단계 동안 신호 파도가 지나가는 횟수
};

/** 다이얼(파라미터) 총 개수 — 화면 안내 문구용 */
export const TOTAL_DIALS = NETWORK.layers * NETWORK.rows * NETWORK.cols;

/** 확률 패널에 보여줄 후보 최대 개수 */
export const MAX_PROB_ROWS = 8;

/** 벡터 표시: 토큰당 숫자 몇 개짜리 벡터로 보여줄지 */
export const VECTOR_DIMS = 4;

/** 벡터 목록에 보여줄 최근 토큰 최대 개수 */
export const MAX_VECTOR_ROWS = 6;

/** 문장 끝을 뜻하는 특수 토큰 */
export const END_TOKEN = '<end>';

/** 문장 끝 토큰을 화면에 표시할 때 쓰는 문구 */
export const END_LABEL = '(문장 끝)';
