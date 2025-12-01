// 3-Level Muscle Hierarchy: Main → Category → Specific
export const MUSCLE_HIERARCHY = {
  Arms: {
    Biceps: ['Long head', 'Short head', 'Brachialis', 'Brachioradialis'],
    Triceps: ['Long head', 'Lateral head', 'Medial head'],
    Forearms: ['Flexors', 'Extensors'],
  },
  Shoulders: {
    Delts: ['Front delts', 'Side delts', 'Rear delts'],
    Traps: ['Upper traps', 'Mid traps', 'Lower traps'],
    'Rotator Cuff': ['Supraspinatus', 'Infraspinatus', 'Subscapularis'],
  },
  Chest: {
    Pecs: ['Upper chest', 'Mid chest', 'Lower chest'],
  },
  Back: {
    'Upper Back': ['Rhomboids', 'Rear delts', 'Upper/mid traps', 'Teres minor', 'Teres major'],
    Lats: ['Upper lats', 'Lower lats'],
    'Middle Back': ['Mid traps', 'Lower traps'],
    'Lower Back': ['Erectors'],
  },
  Core: {
    Abs: ['Upper abs', 'Lower abs', 'Obliques', 'Deep core'],
  },
  Legs: {
    Quads: ['Rectus femoris', 'Vastus lateralis', 'Vastus medialis', 'Vastus intermedius'],
    Hamstrings: ['Biceps femoris', 'Semitendinosus', 'Semimembranosus'],
    Glutes: ['Glute max', 'Glute med', 'Glute min'],
    Calves: ['Gastrocnemius', 'Soleus'],
  },
  Cardio: {
    Cardio: ['Cardio'], // Special case
  },
} as const;

export type MainMuscleGroup = keyof typeof MUSCLE_HIERARCHY;
export type CategoryMuscleGroup<T extends MainMuscleGroup> = keyof typeof MUSCLE_HIERARCHY[T];

// Helper to get categories for a main group
export const getCategories = (main: MainMuscleGroup): string[] => {
  return Object.keys(MUSCLE_HIERARCHY[main]);
};

// Helper to get specific muscles for a category
export const getSpecificMuscles = (
  main: MainMuscleGroup,
  category: string
): string[] => {
  return (MUSCLE_HIERARCHY[main] as any)[category] || [];
};

// Get all main muscle groups
export const MAIN_MUSCLE_GROUPS = Object.keys(MUSCLE_HIERARCHY) as MainMuscleGroup[];

// Backward compatibility: Keep legacy constants for reference
export const LEGACY_MUSCLE_GROUPS = {
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

// Keep old types for backward compatibility
export type SubMuscleGroup = (typeof LEGACY_MUSCLE_GROUPS)[keyof typeof LEGACY_MUSCLE_GROUPS][number];

// New 3-level interface
export interface MuscleGroupSelection {
  main: string;
  category: string | null;
  specific: string | null;
}

// Migration helper: Map old 'sub' to new 'category' (backward compatibility)
export const migrateLegacyMuscleGroup = (
  main: string,
  sub: string | null
): { main: string; category: string | null; specific: string | null } => {
  // Special case: Cardio
  if (main === 'Cardio') {
    return { main, category: 'Cardio', specific: 'Cardio' };
  }

  // Map old sub-groups to new categories (keep current naming where possible)
  const categoryMap: Record<string, string> = {
    // Arms
    'Bicep': 'Biceps',
    'Tricep': 'Triceps',
    'Forearm': 'Forearms',
    // Shoulders
    'Front Delt': 'Delts',
    'Side Delt': 'Delts',
    'Rear Delt': 'Delts',
    'Traps': 'Traps',
    // Chest
    'Upper Chest': 'Pecs',
    'Middle Chest': 'Pecs',
    'Lower Chest': 'Pecs',
    // Back
    'Lats': 'Lats',
    'Rhomboids': 'Upper Back',
    'Spinal Erectors': 'Lower Back',
    // Legs
    'Quads': 'Quads',
    'Hamstring': 'Hamstrings',
    'Upper Glutes': 'Glutes',
    'Middle Glutes': 'Glutes',
    'Lower Glutes': 'Glutes',
    'Calves': 'Calves',
    // Core
    'Core': 'Abs',
  };

  const category = sub ? (categoryMap[sub] || sub) : null;

  return { main, category, specific: null };
};

// Helper to check if a muscle group is using old format
export const isLegacyFormat = (mg: any): boolean => {
  return mg.sub !== undefined && mg.category === undefined;
};

// Runtime normalization helper for backward compatibility (for client components)
export const normalizeMuscleGroup = (mg: {
  main: string;
  category?: string | null;
  specific?: string | null;
  sub?: string | null;
}): {
  main: string;
  category: string | null;
  specific: string | null;
  sub: string | null;
} => {
  // If new format (category exists), return as-is
  if (mg.category) {
    return {
      main: mg.main,
      category: mg.category,
      specific: mg.specific ?? null,
      sub: mg.sub ?? null,
    };
  }

  // If old format (sub exists), migrate on-the-fly
  if (mg.sub) {
    const migrated = migrateLegacyMuscleGroup(mg.main, mg.sub);
    return {
      main: migrated.main,
      category: migrated.category,
      specific: migrated.specific,
      sub: mg.sub, // Keep for reference
    };
  }

  // If only main exists (all sub-groups selected)
  return {
    main: mg.main,
    category: null,
    specific: null,
    sub: null,
  };
};
