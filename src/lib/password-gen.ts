// 보호자 초대용 자동 생성 비밀번호
// 형식: 영어 형용사 + 대문자 시작 명사 + 4자리 숫자
// 예: smartMoon1234, braveRain5678

const ADJECTIVES = [
  "brave", "calm", "dear", "eager", "fair",
  "glad", "happy", "kind", "lively", "merry",
  "noble", "proud", "quiet", "smart", "sweet",
  "warm", "wise", "bold", "clear", "fresh",
  "gentle", "honest", "jolly", "loyal", "neat",
];

const NOUNS = [
  "Bird", "Dawn", "Dew", "Dream", "Fern",
  "Glen", "Hill", "Hope", "Lake", "Leaf",
  "Moon", "Rain", "Rose", "Star", "Stone",
  "Tree", "Wave", "Wind", "Wood", "Cloud",
  "Bell", "Cove", "Glow", "Mist", "Peak",
];

export function generateGuardianPassword(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(1000 + Math.random() * 9000); // 1000~9999
  return `${adj}${noun}${num}`;
}
