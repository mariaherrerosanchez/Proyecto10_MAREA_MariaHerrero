import type { Platform } from '../../generation/types'

type PlatformResult = {
  platform: Platform
}

export function shouldInitializeResultTab(hadPreviousResult: boolean, hasCurrentResult: boolean): boolean {
  return !hadPreviousResult && hasCurrentResult
}

export function initialResultPlatform(
  result: { results: PlatformResult[] },
  preferredPlatform: Platform | null,
): Platform {
  return result.results.some((item) => item.platform === preferredPlatform)
    ? preferredPlatform as Platform
    : result.results[0].platform
}
