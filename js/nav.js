// nav.js — 상단 내비게이션 공통 동작 (모든 페이지에서 로드).
// '위니브 서비스' 드롭다운을 바깥 클릭이나 Esc 키로 닫는다.

const more = document.querySelector('.nav-more');

if (more) {
  document.addEventListener('click', (e) => {
    if (more.open && !more.contains(e.target)) more.open = false;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') more.open = false;
  });
}
