import { ISet } from '@/types';

/**
 * Calculate total volume for a set of exercises
 * Volume = weight × reps for all sets
 */
export function calculateVolume(sets: ISet[]): number {
  return sets.reduce((total, set) => {
    return total + set.weight * set.reps;
  }, 0);
}

/**
 * Format volume for display
 */
export function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k kg`;
  }
  return `${volume.toFixed(0)} kg`;
}
