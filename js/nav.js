// nav.js — 상단 내비게이션 공통 동작 (모든 페이지에서 로드).
// 페이지가 9개로 늘어 탭을 한 줄로 나열하지 않고,
// 1) 페이지 탭 전체를 '현재 페이지 이름 ▾' 드롭다운 하나로 접는다.
// 2) 드롭다운(페이지 메뉴, '위니브 서비스')을 바깥 클릭이나 Esc 키로 닫는다.
// HTML의 .nav-links는 그대로 두어 자바스크립트가 꺼진 환경에서도 탭이 보이게 한다.

// 드롭다운 안에서 각 페이지 아래에 붙는 한 줄 소개
const PAGE_INTROS = {
  'index.html': 'AI가 다음 단어를 맞히는 원리',
  'tokens.html': 'AI가 글을 자르는 단위',
  'hallucination.html': 'AI는 왜 그럴듯한 거짓말을 할까',
  'calc.html': 'AI는 왜 계산 실수를 할까',
  'prompt.html': '질문이 달라지면 답이 달라져요',
  'context.html': 'AI는 대화를 어떻게 기억할까',
  'training.html': '다이얼을 돌려 맞추는 과정',
  'models.html': '크기, 가격, 속도 비교해 고르기',
  'usage.html': '세계는 AI를 얼마나 쓸까',
};

const links = document.querySelector('.nav-links');

if (links) {
  const menu = document.createElement('details');
  menu.className = 'nav-more nav-pages';
  menu.innerHTML = '<summary></summary><div class="nav-more-menu"></div>';

  // 버튼 라벨은 현재 페이지 이름 — 어디에 와 있는지도 함께 보여준다
  const active = links.querySelector('a.active');
  menu.querySelector('summary').textContent = active ? active.textContent : '메뉴';

  const box = menu.querySelector('.nav-more-menu');
  while (links.firstElementChild) {
    const a = links.firstElementChild;
    box.appendChild(a);
    const intro = PAGE_INTROS[a.getAttribute('href')];
    if (intro) {
      const span = document.createElement('span');
      span.textContent = intro;
      a.appendChild(span);
    }
  }
  links.replaceWith(menu);
}

const dropdowns = document.querySelectorAll('.nav-more');

document.addEventListener('click', (e) => {
  dropdowns.forEach((d) => {
    if (d.open && !d.contains(e.target)) d.open = false;
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') dropdowns.forEach((d) => (d.open = false));
});
