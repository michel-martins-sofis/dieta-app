export interface DailyValue {
  date: string
  value: number
}

export interface AdherenceResult {
  loggedDays: number
  withinTargetDays: number
  percentage: number
}

export function calculateAdherence(totals: DailyValue[], target: number, toleranceRatio = 0.1): AdherenceResult {
  const loggedDays = totals.filter((total) => total.value !== 0)

  if (!target || loggedDays.length === 0) {
    return { loggedDays: loggedDays.length, withinTargetDays: 0, percentage: 0 }
  }

  const withinTargetDays = loggedDays.filter(
    (total) => Math.abs(total.value - target) / target <= toleranceRatio
  ).length

  return {
    loggedDays: loggedDays.length,
    withinTargetDays,
    percentage: Math.round((withinTargetDays / loggedDays.length) * 100),
  }
}
