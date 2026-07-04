// tokens.test.mjs — '토큰의 비밀' 모형 토크나이저 검증.
// 브라우저 없이 실행: node tests/tokens.test.mjs
import { tokenize, tokenId } from '../js/tokens/tokenizer.js';

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

// 1) strawberry는 유명한 예시 그대로 st / raw / berry 세 조각이어야 한다
{
  const pieces = tokenize('strawberry').map((t) => t.text);
  if (pieces.join('/') !== 'st/raw/berry') {
    fail(`strawberry → ${pieces.join('/')} (기대: st/raw/berry)`);
  }
}

// 2) 같은 뜻의 문장 쌍: 한국어가 영어보다 토큰을 더 써야 이야기가 성립한다
for (const [ko, en] of [
  ['나는 학교에 간다', 'I go to school'],
  ['안녕하세요', 'hello'],
]) {
  const koCount = tokenize(ko).length;
  const enCount = tokenize(en).length;
  if (koCount <= enCount) fail(`"${ko}"(${koCount}) ≤ "${en}"(${enCount})`);
  console.log(`"${ko}" ${koCount}토큰 vs "${en}" ${enCount}토큰`);
}

// 3) 결정성: 같은 입력은 언제나 같은 조각·같은 번호
{
  const a = JSON.stringify(tokenize('위니브에서 만나요!'));
  const b = JSON.stringify(tokenize('위니브에서 만나요!'));
  if (a !== b) fail('같은 입력에 다른 결과');
}

// 4) 번호는 0 이상 50000 미만의 정수
for (const t of tokenize('AI가 문장을 123개로 잘라요, 진짜로!')) {
  if (!Number.isInteger(t.id) || t.id < 0 || t.id >= 50000) {
    fail(`"${t.text}" 번호 이상: ${t.id}`);
  }
  if (t.id !== tokenId(t.text)) fail(`"${t.text}" 번호 불일치`);
}

// 5) 빈 입력과 공백은 조용히 빈 목록
if (tokenize('').length !== 0) fail('빈 문자열이 토큰을 만듦');
if (tokenize('   ').length !== 0) fail('공백이 토큰을 만듦');

// 6) 조각을 이어 붙이면 (공백 제외) 원문이 복원돼야 한다 — 글자를 잃어버리면 안 됨
{
  const src = '안녕하세요, 저는 위니브에 다녀요';
  const joined = tokenize(src).map((t) => t.text).join('');
  if (joined !== src.replace(/\s/g, '')) fail(`복원 실패: ${joined}`);
}

console.log(failures === 0 ? '\n모든 테스트 통과 ✅' : `\n실패 ${failures}건 ❌`);
process.exit(failures === 0 ? 0 : 1);
