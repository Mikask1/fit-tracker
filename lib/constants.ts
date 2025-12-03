/**
 * Reserved routine names that users cannot use
 */
export const RESERVED_ROUTINE_NAMES = ['Custom Routine'];

/**
 * Virtual routine ID for custom routines (not stored in DB)
 */
export const CUSTOM_ROUTINE_ID = '__custom_routine__';

/**
 * Check if a routine name is reserved (case-insensitive)
 */
export function isReservedRoutineName(name: string): boolean {
  return RESERVED_ROUTINE_NAMES.some(
    reserved => reserved.toLowerCase() === name.toLowerCase().trim()
  );
}
