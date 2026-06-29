'use client'

import { formatLocalDate, formatLocalDateTime } from '@/lib/dateUtils'

export function LocalDate({ utc, className }: { utc: string; className?: string }) {
  return <span className={className}>{formatLocalDate(utc)}</span>
}

export function LocalDateTime({ utc, className }: { utc: string; className?: string }) {
  return <span className={className}>{formatLocalDateTime(utc)}</span>
}
