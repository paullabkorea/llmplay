// nav.js — 상단 내비게이션 공통 동작 (모든 페이지에서 로드).
// 1) 폭이 모자라 넘치는 페이지 탭을 '더보기' 드롭다운으로 옮긴다.
// 2) 드롭다운('더보기', '위니브 서비스')을 바깥 클릭이나 Esc 키로 닫는다.

const links = document.querySelector('.nav-links');

// '더보기' 드롭다운은 페이지마다 HTML을 고치지 않도록 여기서 생성해
// 탭 목록과 '위니브 서비스' 사이에 끼워 넣는다.
const overflow = document.createElement('details');
overflow.className = 'nav-more';
overflow.innerHTML = '<summary>더보기</summary><div class="nav-more-menu"></div>';
overflow.hidden = true;
const overflowMenu = overflow.querySelector('.nav-more-menu');

function updateOverflow() {
  overflow.open = false;

  // 일단 탭을 전부 원래 자리로 되돌린 뒤 넘치는지 다시 측정
  while (overflowMenu.firstChild) links.appendChild(overflowMenu.firstChild);
  overflow.hidden = true;
  if (links.scrollWidth <= links.clientWidth) return;

  // '더보기' 버튼이 차지할 공간을 먼저 확보하고,
  // 한 줄에 들어갈 때까지 오른쪽 탭부터 드롭다운으로 이동
  overflow.hidden = false;
  while (links.scrollWidth > links.clientWidth && links.children.length > 1) {
    overflowMenu.prepend(links.lastElementChild);
  }
}

if (links) {
  links.after(overflow);
  updateOverflow();
  window.addEventListener('resize', updateOverflow);
  // 웹폰트가 늦게 로드되면 탭 폭이 달라지므로 한 번 더 측정
  document.fonts?.ready.then(updateOverflow);
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
