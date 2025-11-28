export const MUSCLE_GROUPS = {
  Chest: ['Upper Chest', 'Middle Chest', 'Lower Chest'],
  Back: ['Traps', 'Rhomboids', 'Spinal Erectors', 'Lats'],
  Legs: [
    'Upper Glutes',
    'Middle Glutes',
    'Lower Glutes',
    'Quads',
    'Hamstring',
    'Calves',
  ],
  Shoulders: ['Front Delt', 'Side Delt', 'Rear Delt'],
  Arms: ['Bicep', 'Tricep', 'Forearm'],
  Core: ['Core'],
  Cardio: ['Cardio'],
} as const;

export type MainMuscleGroup = keyof typeof MUSCLE_GROUPS;
export type SubMuscleGroup =
  (typeof MUSCLE_GROUPS)[MainMuscleGroup][number];

export interface MuscleGroupSelection {
  main: MainMuscleGroup;
  sub: SubMuscleGroup | null; // null = all sub-groups
}

export const MAIN_MUSCLE_GROUPS = Object.keys(
  MUSCLE_GROUPS
) as MainMuscleGroup[];

export const getSubGroups = (main: MainMuscleGroup): readonly string[] => {
  return MUSCLE_GROUPS[main] || [];
};
