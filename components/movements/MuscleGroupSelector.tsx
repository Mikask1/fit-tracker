'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, ChevronDown } from 'lucide-react';
import {
  MUSCLE_HIERARCHY,
  MainMuscleGroup,
  getCategories,
  getSpecificMuscles,
  MuscleGroupSelection,
} from '@/lib/constants/muscleGroups';

interface MuscleGroupSelectorProps {
  value: MuscleGroupSelection[];
  onChange: (selections: MuscleGroupSelection[]) => void;
}

export function MuscleGroupSelector({
  value,
  onChange,
}: MuscleGroupSelectorProps) {
  // State: Map<mainGroup, Map<category, Set<specific>>>
  const [selections, setSelections] = useState<Map<string, Map<string, Set<string>>>>(new Map());
  const [expandedMain, setExpandedMain] = useState<Set<string>>(new Set());
  const [expandedCategory, setExpandedCategory] = useState<Set<string>>(new Set());

  // Initialize from value prop
  useEffect(() => {
    const newSelections = new Map<string, Map<string, Set<string>>>();

    value.forEach(({ main, category, specific }) => {
      if (!newSelections.has(main)) {
        newSelections.set(main, new Map());
      }

      const mainMap = newSelections.get(main)!;

      if (category === null) {
        // All categories selected
        const categories = getCategories(main as MainMuscleGroup);
        categories.forEach((cat) => {
          const specifics = getSpecificMuscles(main as MainMuscleGroup, cat);
          mainMap.set(cat, new Set(specifics));
        });
      } else if (specific === null) {
        // All specifics in category selected
        const specifics = getSpecificMuscles(main as MainMuscleGroup, category);
        mainMap.set(category, new Set(specifics));
      } else {
        // Specific muscle selected
        if (!mainMap.has(category)) {
          mainMap.set(category, new Set());
        }
        mainMap.get(category)!.add(specific);
      }
    });

    setSelections(newSelections);
  }, [value]);

  // Convert internal state to output format
  const toFormData = (
    newSelections: Map<string, Map<string, Set<string>>>
  ): MuscleGroupSelection[] => {
    const result: MuscleGroupSelection[] = [];

    newSelections.forEach((categoryMap, main) => {
      const allCategories = getCategories(main as MainMuscleGroup);

      // Check if ALL categories are fully selected (select main)
      const allCategoriesSelected = allCategories.every((cat) => {
        const specifics = getSpecificMuscles(main as MainMuscleGroup, cat);
        const selected = categoryMap.get(cat);
        return selected && selected.size === specifics.length;
      });

      if (allCategoriesSelected && allCategories.length > 0) {
        result.push({ main, category: null, specific: null });
      } else {
        // Some categories selected
        categoryMap.forEach((specificsSet, category) => {
          const allSpecifics = getSpecificMuscles(main as MainMuscleGroup, category);

          if (specificsSet.size === allSpecifics.length) {
            // All specifics in category selected
            result.push({ main, category, specific: null });
          } else {
            // Some specifics selected
            specificsSet.forEach((specific) => {
              result.push({ main, category, specific });
            });
          }
        });
      }
    });

    return result;
  };

  // Toggle handlers
  const handleMainToggle = (main: MainMuscleGroup) => {
    const newSelections = new Map(selections);
    const categories = getCategories(main);
    const mainMap = newSelections.get(main) || new Map();

    const allSelected = categories.every((cat) => {
      const specifics = getSpecificMuscles(main, cat);
      const selected = mainMap.get(cat);
      return selected && selected.size === specifics.length;
    });

    if (allSelected) {
      // Deselect all
      newSelections.delete(main);
    } else {
      // Select all
      const newMainMap = new Map<string, Set<string>>();
      categories.forEach((cat) => {
        const specifics = getSpecificMuscles(main, cat);
        newMainMap.set(cat, new Set(specifics));
      });
      newSelections.set(main, newMainMap);
    }

    setSelections(newSelections);
    onChange(toFormData(newSelections));
  };

  const handleCategoryToggle = (main: MainMuscleGroup, category: string) => {
    const newSelections = new Map(selections);
    if (!newSelections.has(main)) {
      newSelections.set(main, new Map());
    }

    const mainMap = newSelections.get(main)!;
    const specifics = getSpecificMuscles(main, category);
    const selected = mainMap.get(category) || new Set();

    if (selected.size === specifics.length) {
      // Deselect all
      mainMap.delete(category);
      if (mainMap.size === 0) newSelections.delete(main);
    } else {
      // Select all
      mainMap.set(category, new Set(specifics));
    }

    setSelections(newSelections);
    onChange(toFormData(newSelections));
  };

  const handleSpecificToggle = (main: MainMuscleGroup, category: string, specific: string) => {
    const newSelections = new Map(selections);
    if (!newSelections.has(main)) {
      newSelections.set(main, new Map());
    }

    const mainMap = newSelections.get(main)!;
    if (!mainMap.has(category)) {
      mainMap.set(category, new Set());
    }

    const specificsSet = mainMap.get(category)!;
    if (specificsSet.has(specific)) {
      specificsSet.delete(specific);
      if (specificsSet.size === 0) {
        mainMap.delete(category);
        if (mainMap.size === 0) newSelections.delete(main);
      }
    } else {
      specificsSet.add(specific);
    }

    setSelections(newSelections);
    onChange(toFormData(newSelections));
  };

  // Toggle expansion
  const toggleExpandMain = (main: string) => {
    const newExpanded = new Set(expandedMain);
    if (newExpanded.has(main)) {
      newExpanded.delete(main);
    } else {
      newExpanded.add(main);
    }
    setExpandedMain(newExpanded);
  };

  const toggleExpandCategory = (key: string) => {
    const newExpanded = new Set(expandedCategory);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCategory(newExpanded);
  };

  return (
    <div className="space-y-3">
      {(Object.keys(MUSCLE_HIERARCHY) as MainMuscleGroup[]).map((main) => {
        const categories = getCategories(main);
        const mainMap = selections.get(main) || new Map();

        // Calculate selection state for main group
        const totalSpecifics = categories.reduce((sum, cat) => {
          return sum + getSpecificMuscles(main, cat).length;
        }, 0);
        const selectedSpecifics = Array.from(mainMap.values()).reduce((sum, set) => {
          return sum + set.size;
        }, 0);
        const allSelected = selectedSpecifics === totalSpecifics && totalSpecifics > 0;
        const someSelected = selectedSpecifics > 0 && selectedSpecifics < totalSpecifics;
        const isExpandedMain = expandedMain.has(main);

        return (
          <div key={main} className="space-y-2">
            {/* Main Group Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    const checkbox = el as HTMLButtonElement;
                    checkbox.dataset.state = someSelected
                      ? 'indeterminate'
                      : allSelected
                        ? 'checked'
                        : 'unchecked';
                  }
                }}
                onCheckedChange={() => handleMainToggle(main)}
                className="h-5 w-5"
              />
              <button
                type="button"
                onClick={() => toggleExpandMain(main)}
                className="flex items-center gap-1 text-sm font-medium hover:underline min-h-11"
              >
                {isExpandedMain ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {main}
                {selectedSpecifics > 0 && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({selectedSpecifics === totalSpecifics ? 'All' : selectedSpecifics})
                  </span>
                )}
              </button>
            </div>

            {/* Categories */}
            {isExpandedMain && (
              <div className="pl-8 space-y-2">
                {categories.map((category) => {
                  const specifics = getSpecificMuscles(main, category);
                  const selected = mainMap.get(category) || new Set();
                  const categoryAllSelected = selected.size === specifics.length && specifics.length > 0;
                  const categorySomeSelected = selected.size > 0 && selected.size < specifics.length;
                  const categoryKey = `${main}-${category}`;
                  const isExpandedCategory = expandedCategory.has(categoryKey);

                  return (
                    <div key={category} className="space-y-2">
                      {/* Category Checkbox */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={categoryAllSelected}
                          ref={(el) => {
                            if (el) {
                              const checkbox = el as HTMLButtonElement;
                              checkbox.dataset.state = categorySomeSelected
                                ? 'indeterminate'
                                : categoryAllSelected
                                  ? 'checked'
                                  : 'unchecked';
                            }
                          }}
                          onCheckedChange={() => handleCategoryToggle(main, category)}
                          className="h-4 w-4"
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpandCategory(categoryKey)}
                          className="flex items-center gap-1 text-xs hover:underline"
                        >
                          {isExpandedCategory ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          {category}
                          {selected.size > 0 && (
                            <span className="text-muted-foreground text-xs ml-1">
                              ({selected.size === specifics.length ? 'All' : selected.size})
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Specific Muscles */}
                      {isExpandedCategory && (
                        <div className="pl-6 space-y-1">
                          {specifics.map((specific) => (
                            <div key={specific} className="flex items-center gap-2">
                              <Checkbox
                                checked={selected.has(specific)}
                                onCheckedChange={() => handleSpecificToggle(main, category, specific)}
                                className="h-3 w-3"
                              />
                              <label className="text-xs cursor-pointer" onClick={() => handleSpecificToggle(main, category, specific)}>
                                {specific}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
