// agent/data.js — '에이전트의 비밀' 페이지가 쓰는 재료.
// 화면을 그리지 않는 순수 데이터라서 브라우저 없이도 검사할 수 있다.
//
// 결과물 그림은 위니브가 실제 업무에서 만든 파일의 화면 사진이다.
// (『에센셜 Claude Skill』 2장의 공개 샘플, assets/agent/*.webp)

/** 컴퓨터 여기저기 흩어져 있다가 폴더 하나로 모이는 파일들. where는 원래 있던 자리 */
export const DESK_FILES = [
  { icon: '📄', name: '사업공고문.pdf', kind: '발주처가 올린 공고', where: '다운로드', x: 3, y: 5 },
  { icon: '📘', name: '제주AX_제안서.hwpx', kind: '우리가 낸 35쪽 제안서', where: '바탕화면', x: 50, y: 4 },
  { icon: '🏢', name: '위니브_회사소개.pdf', kind: '기관 현황, 실적', where: '공유 드라이브', x: 1, y: 27 },
  { icon: '📊', name: '작년_결과보고서.pdf', kind: '지난해 같은 사업', where: '작년 사업 폴더', x: 52, y: 26 },
  { icon: '💰', name: '강의_단가표.xlsx', kind: '품목별 단가', where: '메일 첨부', x: 4, y: 49 },
  { icon: '🧑‍🏫', name: '강사_프로필.docx', kind: '투입 인력 12명', where: '메신저로 받음', x: 49, y: 48 },
];

export const FOLDER_NAME = '제주AX_제안';

/** 첫 번째 명령: 파일을 사람이 끌어다 모으지 않는다. Agent가 컴퓨터를 뒤져 찾아 모은다. */
export const GATHER = {
  text: '제주 AX 제안 관련 파일 한 폴더에 모아줘',
  log: [
    '바탕화면, 다운로드, 메일 첨부, 공유 드라이브를 뒤지는 중',
    '이름과 내용이 제주 AX 제안과 관련된 파일 6개를 찾는 중',
    '제주AX_제안 폴더를 만들고 6개를 옮기는 중',
  ],
};

/**
 * 결과물 카드. img는 assets/agent/ 아래 그림 이름, files는 assets/agent/files/ 아래 실제 파일.
 * files의 첫 항목이 그림을 눌렀을 때 열리는 대표 파일이다. download가 참이면 열지 않고 받는다.
 */
export const OUTPUTS = {
  dashboard: {
    img: 'dashboard', name: '사업 탐색 대시보드', meta: '공고 20건 · 적합도 순',
    note: '공고문 30건을 훑어 지원할 만한 7건만 골라냈어요',
    files: [{ label: 'HTML 열기', file: '04-dashboard.html' }],
  },
  proposal: {
    img: 'proposal', name: '제안서', meta: '35쪽 · HWPX, PDF',
    note: '공고가 요구한 목차 그대로, 회사 서식으로 채웠어요',
    files: [{ label: 'PDF 열기', file: '01-proposal.pdf' }, { label: 'HTML 열기', file: '01-proposal.html' }],
  },
  quote: {
    img: 'quote', name: '견적서', meta: 'Excel · 2억 2,860만 원',
    note: '단가표와 절사 규칙이 Skill 안에 있어서 금액이 흔들리지 않아요',
    files: [{ label: 'PDF 열기', file: '06-quote.pdf' }, { label: 'Excel 받기', file: '06-quote.xlsx', download: true }],
  },
  slides: {
    img: 'slides', name: '발표 자료', meta: '19장 · HTML, PDF',
    note: '제안서 35쪽에서 심사위원이 볼 19장만 남겼어요',
    files: [{ label: 'PDF 열기', file: '02-slides.pdf' }, { label: 'HTML 열기', file: '02-slides.html' }],
  },
  script: {
    img: 'script', name: '발표 대본', meta: '15분 · 장별 시간 배분',
    note: '19장에 15분을 나눠 담고 누적 시간까지 적었어요',
    files: [{ label: 'PDF 열기', file: '03-script.pdf' }, { label: 'HTML 열기', file: '03-script.html' }],
  },
  cardnews: {
    img: 'cardnews', name: '모집 카드뉴스', meta: '8장 · 인스타그램용',
    note: '모집 요강을 여덟 장으로 옮겼어요. 색과 글꼴은 회사 규칙대로예요',
    files: [{ label: 'HTML 열기', file: '05-cardnews.html' }],
  },
};

export const FILES_DIR = 'assets/agent/files/';

/**
 * 두 번째 명령(질문지): 같은 폴더를 두고 무엇을 시키느냐에 따라 나오는 것이 달라진다.
 * skills의 tag는 위니브가 실제로 쓰는 Skill 이름이다.
 */
export const REQUESTS = [
  {
    id: 'edu',
    text: '이 제안서를 기반으로 제주 AX 교육 자료 만들어줘',
    reads: ['제주AX_제안서.hwpx', '사업공고문.pdf', '강사_프로필.docx'],
    skills: [
      { tag: 'html-slides', role: '정리된 내용을 발표 슬라이드로' },
      { tag: 'program-plan-proposal', role: '교육 운영 계획 서식' },
      { tag: 'instagram-card-news', role: '모집 안내를 카드뉴스로' },
    ],
    log: [
      '폴더에서 파일 6개를 읽는 중',
      '제안서에서 교육 과정 4개와 일정을 뽑는 중',
      'html-slides Skill의 회사 서식을 불러오는 중',
      '발표 자료 19장을 배치하는 중',
      '15분 발표에 맞춰 장별 시간을 나누는 중',
      '모집 카드뉴스 8장을 쓰는 중',
    ],
    outputs: ['slides', 'script', 'cardnews'],
    minutes: 40, then: '이틀',
  },
  {
    id: 'quote',
    text: '이 제안서로 5일짜리 교육 견적서 만들어줘',
    reads: ['제주AX_제안서.hwpx', '강의_단가표.xlsx'],
    skills: [{ tag: 'weniv-quote', role: '단가표와 양식으로 견적 작성' }],
    log: [
      '제안서에서 인원, 기간, 장소를 읽는 중',
      'weniv-quote Skill의 단가표를 불러오는 중',
      '품목 22줄의 수량과 횟수를 채우는 중',
      '절사 규칙을 적용해 합계를 맞추는 중',
    ],
    outputs: ['quote'],
    minutes: 3, then: '반나절',
  },
  {
    id: 'scan',
    text: '지원할 만한 공고를 골라서 한 장으로 정리해 줘',
    reads: ['사업공고문.pdf', '위니브_회사소개.pdf', '작년_결과보고서.pdf'],
    skills: [],
    log: [
      '공고 30건의 과업 내용을 읽는 중',
      '회사 실적과 겹치는 정도를 매기는 중',
      '마감이 7일 이내인 건을 앞으로 옮기는 중',
      '한 장짜리 대시보드로 묶는 중',
    ],
    outputs: ['dashboard'],
    minutes: 12, then: '사흘',
    noSkillNote: '이건 한 번 하고 마는 일이라 Skill 없이 프롬프트로 끝냈어요',
  },
];

/** 데모 3: 제안서 하나에서 갈라져 나오는 결과물 */
export const PIPELINE = [
  { key: 'quote', tag: 'weniv-quote', ask: '이 제안서로 견적서 만들어줘' },
  { key: 'slides', tag: 'html-slides', ask: '이 제안서로 15분 발표 자료 만들어줘' },
  { key: 'script', tag: 'html-slides', ask: '이 발표 자료에 맞는 대본 써줘' },
  { key: 'cardnews', tag: 'instagram-card-news', ask: '모집 카드뉴스 8장 만들어줘' },
];

/** 위니브가 실제로 쓰는 Skill 아홉 가지 (책 2장의 표) */
export const WENIV_SKILLS = [
  { tag: 'md-to-hwpx', role: '마크다운을 한글 문서로 바꿔요' },
  { tag: 'proposal-writer', role: '공고와 회사 자료로 발주처 양식을 채워요' },
  { tag: 'program-plan-proposal', role: '사업 시작 전 계획서를 써요' },
  { tag: 'program-result-report', role: '출석, 설문, 일지로 결과보고서를 써요' },
  { tag: 'weniv-quote', role: '단가표와 양식으로 견적을 내요' },
  { tag: 'html-slides', role: '정리된 내용을 발표 슬라이드로 만들어요' },
  { tag: 'program-bid-proposal', role: '회사 자료로 공모, 입찰 제안서를 써요' },
  { tag: 'public-bid-proposal', role: '기관 정보만 바꿔 쓰는 범용 제안서예요' },
  { tag: 'instagram-card-news', role: '모집 안내를 카드뉴스로 만들어요' },
];

/**
 * 그때와 지금. 숫자는 위니브가 겪은 정도를 보여 주기 위한 예시이고,
 * 일마다 사람마다 다르다.
 */
export const THEN_NOW = [
  { job: '제안서 35쪽', then: '3명이 5일', now: '1명이 2시간', thenH: 120, nowH: 2 },
  { job: '발표 자료 19장', then: '디자이너 2일', now: '10분', thenH: 16, nowH: 0.2 },
  { job: '견적서 1부', then: '지난 파일 찾아 30분', now: '휴대폰으로 1분', thenH: 0.5, nowH: 0.02 },
  { job: '카드뉴스 8장', then: '디자이너 3일', now: '20분', thenH: 24, nowH: 0.35 },
];
