"use client";

/**
 * 사용자의 브라우저 로케일과 타임존을 자동으로 감지해 날짜/시간을 표시하는 클라이언트 컴포넌트.
 *
 * 왜 클라이언트 컴포넌트인가?
 *  - 서버(Node.js)에서는 사용자의 타임존을 알 수 없습니다.
 *    서버에서 포맷하면 항상 UTC 또는 서버 시간 기준이 되어 버립니다.
 *  - 브라우저에서 toLocaleString()을 locale 인자 없이 호출하면
 *    브라우저가 설정한 언어와 기기의 타임존을 자동으로 사용합니다.
 *    (한국 → 한국어+KST, 미국 → 영어+EST, 일본 → 일본어+JST, 등)
 *
 * Hydration 불일치 방지:
 *  - 서버에서는 suppressed placeholder를 렌더링하고, 마운트 후(useEffect)
 *    실제 로컬 시간으로 교체합니다. suppressHydrationWarning으로 경고도 억제합니다.
 */

import { useEffect, useState } from "react";

type Props = {
  iso: string;           // ISO 8601 형식의 UTC 시간 문자열
  className?: string;
  showTime?: boolean;    // true: 날짜+시간, false: 날짜만 (기본: true)
};

export default function LocalTime({ iso, className, showTime = true }: Props) {
  const [formatted, setFormatted] = useState<string>("");

  useEffect(() => {
    if (!iso) return;

    const d = new Date(iso);
    const options: Intl.DateTimeFormatOptions = showTime
      ? { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
      : { year: "numeric", month: "long", day: "numeric" };

    // locale 인자를 undefined로 두면 브라우저가 사용자 시스템 언어+타임존으로 자동 포맷
    setFormatted(d.toLocaleString(undefined, options));
  }, [iso, showTime]);

  // 마운트 전(SSR/hydration): 빈 span. 깜박임을 줄이기 위해 최소 너비 지정
  // suppressHydrationWarning: 서버/클라이언트 값이 달라도 경고를 억제
  return (
    <span className={className} suppressHydrationWarning>
      {formatted}
    </span>
  );
}
