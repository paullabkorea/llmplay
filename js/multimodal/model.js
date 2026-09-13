// multimodal/model.js — 화면을 모르는 순수 계산 모음 (교육용 모형).
// 실제 모델의 임베딩·토큰 수·요금을 재현하지 않는다.

/**
 * 이미지 픽셀을 columns × columns 격자로 나누고, 조각마다 평균 색(0~1)을 구한다.
 * '눈 역할 전용 모델'이 사진을 조각(패치)으로 잘라 숫자 묶음으로 바꾸는 과정의 모형.
 */
export function patchFeatures(pixels, width, height, columns) {
  const rows = Math.ceil(height / (width / columns));
  return Array.from({ length: columns * rows }, (_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x0 = Math.floor(col * width / columns);
    const x1 = Math.floor((col + 1) * width / columns);
    const y0 = Math.floor(row * height / rows);
    const y1 = Math.floor((row + 1) * height / rows);
    const sums = [0, 0, 0];
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const offset = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) sums[c] += pixels[offset + c];
      }
    }
    const count = (x1 - x0) * (y1 - y0);
    return { row, col, rgb: sums.map((n) => n / count / 255) };
  });
}

/**
 * 소리 표본을 seconds 길이의 시간 조각으로 나누고 조각마다 세기(RMS)와 최대 진폭을 구한다.
 * '귀 역할 전용 모델'이 소리를 시간 순서대로 자르는 과정의 모형.
 */
export function audioFeatures(samples, sampleRate, seconds) {
  const size = Math.max(1, Math.round(sampleRate * seconds));
  const features = [];
  for (let start = 0; start < samples.length; start += size) {
    const end = Math.min(start + size, samples.length);
    let sum = 0;
    let peak = 0;
    for (let i = start; i < end; i++) {
      sum += samples[i] ** 2;
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    features.push({
      start: start / sampleRate,
      end: end / sampleRate,
      rms: Math.sqrt(sum / (end - start)),
      peak,
    });
  }
  return features;
}

/** "정말~ 잘했네"를 비꼬듯 말한 목소리의 모형. 음절 5개, 각 0.4초. */
export const VOICE_SYLLABLES = [
  { text: '정', amp: 0.55, pitch: 220 },
  { text: '말~', amp: 0.75, pitch: 300 }, // 길게 끌며 올라가는 억양
  { text: '잘', amp: 0.45, pitch: 210 },
  { text: '했', amp: 0.4, pitch: 190 },
  { text: '네', amp: 0.6, pitch: 260 }, // 끝을 올리는 비꼬는 말투
];
export const SYLLABLE_SECONDS = 0.4;

export function makeVoice(sampleRate = 8000) {
  const total = Math.round(sampleRate * SYLLABLE_SECONDS * VOICE_SYLLABLES.length);
  return Float32Array.from({ length: total }, (_, i) => {
    const t = i / sampleRate;
    const index = Math.min(VOICE_SYLLABLES.length - 1, Math.floor(t / SYLLABLE_SECONDS));
    const { amp, pitch } = VOICE_SYLLABLES[index];
    const local = (t - index * SYLLABLE_SECONDS) / SYLLABLE_SECONDS; // 0~1
    const envelope = Math.sin(Math.PI * local) ** 0.6; // 음절마다 부드럽게 커졌다 작아짐
    return amp * envelope * Math.sin(2 * Math.PI * pitch * t);
  });
}

/**
 * 조각 하나의 폭이 detailSize보다 크면 그 세부(작은 글씨 등)는 평균 색에 묻힌다.
 * 격자를 바꿨을 때 "작은 글씨가 살아남는가"를 판단하는 단순한 규칙.
 */
export function detailSurvives(imageSize, columns, detailSize) {
  return imageSize / columns <= detailSize;
}
