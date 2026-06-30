/**
 * 날짜 포맷 유틸
 *
 * 중요: 사용자에게 보여주는 날짜는 가급적 LocalTime 컴포넌트(src/components/LocalTime.tsx)를
 * 사용하세요. 그래야 브라우저의 타임존과 언어를 자동으로 감지합니다.
 * 이 함수들은 locale을 지정하지 않아 브라우저/Node 환경의 기본 설정을 따르지만,
 * 서버 컴포넌트에서 호출하면 서버 타임존(UTC) 기준이 되어 사용자 시간과 다를 수 있습니다.
 */

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// 하위 호환 — 기존 이름으로도 작동
export const formatDateTimeKo = formatDateTime;
export const formatDateKo = formatDate;
