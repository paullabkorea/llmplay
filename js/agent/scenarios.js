// agent/scenarios.js — 데모 3개의 단계 설명과 세 패널 그리기.
// 각 시나리오: { id, title, panels: [왼쪽, 가운데, 오른쪽 제목], steps: [{ panel, badge, tip, duration }], render(index, ui) }
// render는 현재 단계 번호(index, 0이면 시작 전)를 받아 세 패널을 처음부터 다시 그린다.
// ui = { left, mid, right (패널 본문 요소), speed() (재생 배속), rerender() (같은 단계 다시 그리기) }

import { el } from '../utils.js';
import { GATHER, REQUESTS, PIPELINE } from './data.js';
import {
  ghost, note, label, bubble, checkList, clear,
  desk, requestSheet, requestBox, readChips, skillCards, workLog,
  outputCard, photo, skillTree, timeBadge,
} from './parts.js';

// ── 데모 1: 명령 두 줄, 모아줘 그리고 만들어줘 ──────────────
// AI의 시대에는 파일을 내가 찾아 첨부하고 답을 옮겨 적었다.
// Agent의 시대에는 '모아줘' 한 줄에 Agent가 컴퓨터를 뒤져 모으고, '만들어줘' 한 줄에 파일을 만든다.
// 질문지에서 무엇을 고르든 첫 명령과 폴더는 그대로다. 고른 것만 기억해 둔다.
let picked = 'edu';

const HUMAN_WORK = [
  { ok: true, text: '숫자와 날짜가 맞는지 확인하기' },
  { ok: true, text: '우리가 정말 지킬 수 있는 약속인지 고르기' },
  { ok: true, text: '심사위원에게 어떻게 들릴지 상상하기' },
];

const gatherScenario = {
  id: 'gather',
  title: '명령 두 줄: 모아줘, 그리고 만들어줘',
  panels: ['내 컴퓨터', 'Agent에게 시키기', '나온 결과물'],
  steps: [
    { panel: 'left', badge: '1단계 · 흩어진 재료', duration: 3200,
      tip: '파일이 바탕화면, 다운로드, 메일 첨부, 공유 드라이브에 흩어져 있어요. <strong>AI의 시대에는 이걸 내가 하나하나 찾아 채팅창에 첨부</strong>하고, 받은 답을 다시 문서에 옮겨 적었어요.' },
    { panel: 'mid', badge: '2단계 · 모아줘', duration: 3400,
      tip: '<strong>Agent의 시대에는 "모아줘" 한 줄</strong>이면 돼요. 끌어다 놓을 필요도, 어디 있는지 알 필요도 없어요. Agent는 답만 하는 게 아니라 <strong>내 컴퓨터를 직접 뒤져요.</strong>' },
    { panel: 'left', badge: '3단계 · 모였어요', duration: 3600,
      tip: 'Agent가 여섯 군데에서 <strong>파일 6개를 찾아 폴더 하나에 넣었어요.</strong> 이름만 보고 고른 게 아니라 내용을 읽고 관련된 것만 골랐어요.' },
    { panel: 'mid', badge: '4단계 · 만들어줘', duration: 3600,
      tip: '두 번째 명령이에요. 질문지에서 <strong>"이 제안서를 기반으로 제주 AX 교육 자료 만들어줘"</strong>를 골랐어요. 다른 칩을 눌러 보세요. 같은 폴더인데 나오는 것이 달라져요.' },
    { panel: 'mid', badge: '5단계 · 폴더 읽기', duration: 3200,
      tip: 'Agent가 폴더를 열어 <strong>필요한 파일만 골라 읽어요.</strong> 어떤 사업인지, 며칠짜리인지, 강사가 몇 명인지를 여기서 알아내요.' },
    { panel: 'mid', badge: '6단계 · Skill 꺼내기', duration: 3600,
      tip: '그다음 <strong>Skill</strong>을 꺼내요. Skill은 우리 회사의 서식과 규칙이 적힌 폴더예요. 이게 있어서 누가 시켜도 같은 모양으로 나와요.' },
    { panel: 'right', badge: '7단계 · 결과물', duration: 4200,
      tip: '<strong>답이 아니라 파일이 나와요.</strong> 여기 보이는 건 상상이 아니라 위니브가 실제 업무에서 이렇게 만든 파일의 화면이에요.' },
    { panel: 'right', badge: '8단계 · 사람의 자리', duration: 3800,
      tip: '사람이 없어진 게 아니에요. <strong>만드는 시간이 줄고 검토하는 시간이 남았어요.</strong> 무엇을 약속할지 정하는 건 여전히 사람의 일이에요.' },
  ],
  render(index, { left, mid, right, speed, rerender }) {
    clear(left, mid, right);
    const sp = speed();
    const req = REQUESTS.find((r) => r.id === picked);
    const gathered = index >= 3;

    // 왼쪽: 흩어진 파일 → Agent가 모은 폴더
    left.append(desk({ gathered, animate: index === 3, speed: sp }));
    left.append(note(gathered
      ? 'Agent가 찾아서 모았어요. 어디 있었는지 내가 몰라도 돼요.'
      : '여섯 군데에 흩어진 파일 6개예요. 이걸 사람이 찾아 첨부하던 시절이 있었어요.'));

    // 가운데: 모아줘 → 작업 기록 → 만들어줘(질문지) → 읽기 → Skill → 작업 기록
    if (index < 2) {
      mid.append(ghost('아직 아무것도 시키지 않았어요'));
    } else {
      mid.append(label('첫 번째 명령'), requestBox(GATHER.text, { animate: index === 2, speed: sp }));
      if (index >= 3) {
        mid.append(workLog(GATHER.log, { animate: index === 3, speed: sp, done: index >= 4 }));
      }
      if (index >= 4) {
        mid.append(requestSheet(REQUESTS, picked, (id) => { picked = id; rerender(); }));
        mid.append(label('두 번째 명령'), requestBox(req.text, { animate: index === 4, speed: sp }));
      }
      if (index >= 5) {
        mid.append(label('폴더에서 읽은 파일'), readChips(req.reads, { animate: index === 5, speed: sp }));
      }
      if (index >= 6) {
        if (req.skills.length) {
          mid.append(label('꺼내 읽은 Skill'), skillCards(req.skills, { animate: index === 6, speed: sp }));
        } else {
          mid.append(label('꺼내 읽은 Skill'), note(req.noSkillNote));
        }
      }
      if (index >= 7) {
        mid.append(label('작업 기록'), workLog(req.log, { animate: index === 7, speed: sp, done: index >= 8 }));
      }
    }

    // 오른쪽: 결과물 → 사람의 자리
    if (index < 7) {
      right.append(ghost('아직 결과물이 없어요'));
      return;
    }
    req.outputs.forEach((key, i) => {
      right.append(outputCard(key, { animate: index === 7, speed: sp, order: i }));
    });
    if (index >= 8) {
      right.append(timeBadge(req.minutes, req.then));
      right.append(label('이제 사람이 할 일'), checkList(HUMAN_WORK, 'ag-keep'));
    }
  },
};

// ── 데모 2: 프롬프트만 vs Skill과 함께 ────────────────────
const OLD_QUOTES = ['0416_견적서.xlsx', '0523_견적서_최종.xlsx', '0523_견적서_최종2.xlsx', '0711_견적서.xlsx', '0829_견적서_수정.xlsx'];

const WITHOUT_SKILL = [
  { ok: false, text: '어느 파일이 최신인지 매번 찾아야 해요' },
  { ok: false, text: '다섯 개 중 무엇을 기준 삼을지 AI가 골라요' },
  { ok: false, text: '그래서 단가가 주마다 조금씩 달라져요' },
  { ok: false, text: '절사 규칙은 어디에도 적혀 있지 않아요' },
];

const WITH_SKILL = [
  { ok: true, text: '첨부할 파일이 없어요. 요청 한 줄이면 돼요' },
  { ok: true, text: '단가와 양식이 늘 같아요' },
  { ok: true, text: '팀원 누구나 같은 결과를 뽑아요' },
];

const SKILL_CHECK = [
  { ok: true, text: '매주 돌아오나요? 견적은 매주 옵니다' },
  { ok: true, text: '재료만 바뀌나요? 일수와 인원만 바뀝니다' },
  { ok: true, text: '나 말고 누가 하나요? 팀원 누구나 뽑습니다' },
];

const compareScenario = {
  id: 'compare',
  title: '프롬프트만 쓸 때 vs Skill과 함께 쓸 때',
  panels: ['같은 명령 한 줄', 'A · Skill 없이', 'B · Skill과 함께'],
  steps: [
    { panel: 'left', badge: '1단계 · 같은 요청', duration: 3000,
      tip: '요청은 한 줄로 같아요. <strong>"5일짜리 하루 8시간 강의 견적서 만들어줘"</strong> 그런데 AI가 무엇을 아느냐에 따라 결과가 갈려요.' },
    { panel: 'mid', badge: '2단계 · 지난 파일 찾기', duration: 3400,
      tip: 'Skill이 없으면 <strong>지난 견적서를 찾아 첨부</strong>해야 해요. 어느 게 최신인지 고르는 것부터 사람의 일이에요.' },
    { panel: 'mid', badge: '3단계 · 매번 치르는 비용', duration: 3600,
      tip: '첨부한 다섯 개 중 <strong>무엇을 기준 삼을지 AI가 판단</strong>해요. 그래서 이번 주와 다음 주 견적서가 조금씩 달라져요.' },
    { panel: 'right', badge: '4단계 · 한 번만 적어두기', duration: 3600,
      tip: 'Skill은 <strong>폴더 하나</strong>예요. 단가표, 양식, 절사 규칙을 한 번 적어 두면 다음부터는 첨부가 필요 없어요.' },
    { panel: 'right', badge: '5단계 · 되묻기', duration: 3400,
      tip: '규칙이 있으니 <strong>확인할 것도 알아요.</strong> "절사는 만 원 단위로 할까요?" 하고 먼저 되물어요. 무엇을 물어야 하는지가 Skill에 적혀 있거든요.' },
    { panel: 'right', badge: '6단계 · 신호등 앞에서', duration: 4000,
      tip: '그래서 <strong>휴대폰만으로도</strong> 견적서가 나와요. 신호등 앞에서 지난 파일을 뒤질 수는 없지만, 규칙이 Skill에 있으니 한 줄이면 돼요.' },
  ],
  render(index, { left, mid, right, speed }) {
    clear(left, mid, right);
    const sp = speed();

    // 왼쪽: 요청 한 줄 + 이 일이 Skill감인지 가리는 세 가지 질문
    left.append(bubble('5일짜리 하루 8시간 강의 견적서 만들어줘'));
    left.append(note('매주 돌아오는 일이에요. 일수와 인원만 바뀌고 단가표는 그대로죠.'));
    left.append(label('Skill로 만들까? 세 가지 질문'), checkList(SKILL_CHECK, 'ag-keep'));

    // 가운데: Skill 없이
    if (index < 2) {
      mid.append(ghost('아직 시작 전이에요'));
    } else {
      mid.append(label('먼저 찾아서 첨부해야 하는 것'), readChips(OLD_QUOTES, { animate: index === 2, speed: sp }));
      mid.append(note('작년 것까지 세면 더 많아요. 첨부가 늘면 AI가 읽어야 하는 양도 같이 늘어요.'));
    }
    if (index >= 3) {
      mid.append(label('매번 다시 치르는 비용'), checkList(WITHOUT_SKILL, 'ag-lost'));
      mid.append(bubble('총액 2억 1,940만 원으로 잡았습니다. 단가는 7월 견적서를 참고했어요.', 'ai'));
    }

    // 오른쪽: Skill과 함께
    if (index < 4) {
      right.append(ghost('아직 시작 전이에요'));
      return;
    }
    right.append(skillTree('weniv-quote', [
      ['SKILL.md', '언제 쓰는지, 무엇을 물어야 하는지'],
      ['assets/단가표.md', '품목별 단가. 바뀌면 여기만 고쳐요'],
      ['assets/견적서_양식.xlsx', '도장까지 들어간 회사 양식'],
    ]));
    right.append(checkList(WITH_SKILL, 'ag-keep'));
    if (index >= 5) {
      right.append(bubble('절사는 만 원 단위로 할까요?', 'ai'));
      right.append(bubble('응, 만 원 단위로', 'me'));
    }
    if (index >= 6) {
      right.append(outputCard('quote', { animate: index === 6, speed: sp, order: 0 }));
      right.append(photo('phone', '휴대폰에서 견적서를 요청하자 Skill이 동작해 엑셀 파일을 만들어 준 화면',
        '위니브의 실제 화면이에요. 휴대폰에서 요청하니 Skill이 돌아 엑셀 파일이 나오고, 절사 방식을 되물었어요.'));
    }
  },
};

// ── 데모 3: 제안서 하나가 넷으로 ──────────────────────────
const pipelineScenario = {
  id: 'pipeline',
  title: '제안서 하나가 넷으로 퍼져요',
  panels: ['제안서 한 개', '차례로 시키는 일', '쌓이는 결과물'],
  steps: [
    { panel: 'left', badge: '1단계 · 시작은 제안서', duration: 3000,
      tip: '시작은 <strong>제안서 한 개</strong>예요. 공고가 요구한 내용, 예산, 일정, 인력이 여기 다 들어 있어요.' },
    { panel: 'mid', badge: '2단계 · 견적서', duration: 3000,
      tip: '먼저 <strong>견적서</strong>. 제안서에 적힌 인원과 기간을 금액으로 옮기는 일이에요.' },
    { panel: 'mid', badge: '3단계 · 발표 자료', duration: 3000,
      tip: '다음은 <strong>발표 자료</strong>. 35쪽을 심사위원이 볼 19장으로 줄여요.' },
    { panel: 'mid', badge: '4단계 · 대본', duration: 3000,
      tip: '<strong>대본</strong>도요. 19장에 15분을 나눠 담고 장마다 누적 시간을 적어요.' },
    { panel: 'mid', badge: '5단계 · 카드뉴스', duration: 3000,
      tip: '뽑히면 사람을 모아야죠. <strong>모집 카드뉴스</strong> 8장이에요.' },
    { panel: 'right', badge: '6단계 · 같은 내용, 다른 옷', duration: 4000,
      tip: '넷 다 <strong>제안서에 적힌 내용을 형식만 바꾼 것</strong>이에요. 그래서 제안서가 한가운데 있어요. 제안서가 정확하면 나머지도 정확해요.' },
  ],
  render(index, { left, mid, right, speed }) {
    clear(left, mid, right);
    const sp = speed();

    left.append(outputCard('proposal', { order: 0 }));
    left.append(note('여기서 모든 게 시작해요. 틀리면 나머지 넷이 같이 틀려요.'));

    const made = Math.max(0, Math.min(index - 1, PIPELINE.length));
    if (made === 0) {
      mid.append(ghost('아직 아무것도 시키지 않았어요'));
      right.append(ghost('아직 결과물이 없어요'));
      return;
    }

    PIPELINE.slice(0, made).forEach((p, i) => {
      mid.append(bubble(p.ask), el('p', 'ag-used', `📁 ${p.tag} Skill이 받았어요`));
      right.append(outputCard(p.key, { animate: index === i + 2, speed: sp, order: 0 }));
    });

    if (index >= 6) {
      right.append(note('제안서 한 개에서 넷이 나왔어요. 사람이 다시 쓴 문장은 하나도 없어요.'));
    }
  },
};

export const SCENARIOS = [gatherScenario, compareScenario, pipelineScenario];
