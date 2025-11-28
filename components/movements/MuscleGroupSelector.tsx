'use client';

import { useState, useEffect, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, ChevronDown } from 'lucide-react';
import {
  MUSCLE_GROUPS,
  MAIN_MUSCLE_GROUPS,
  MainMuscleGroup,
  SubMuscleGroup,
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
  // Internal state: Map<mainGroup, Set<subGroup>>
  const [selections, setSelections] = useState<Map<string, Set<string>>>(
    new Map()
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Initialize from value prop
  useEffect(() => {
    const newSelections = new Map<string, Set<string>>();

    value.forEach(({ main, sub }) => {
      if (sub === null) {
        // null = all subs
        newSelections.set(main, new Set(MUSCLE_GROUPS[main]));
      } else {
        // Specific sub
        if (!newSelections.has(main)) {
          newSelections.set(main, new Set());
        }
        newSelections.get(main)!.add(sub);
      }
    });

    setSelections(newSelections);
  }, [value]);

  // Convert internal state to output format
  const toFormData = (
    newSelections: Map<string, Set<string>>
  ): MuscleGroupSelection[] => {
    const result: MuscleGroupSelection[] = [];

    newSelections.forEach((subs, main) => {
      const allSubs = MUSCLE_GROUPS[main as MainMuscleGroup];

      if (subs.size === allSubs.length) {
        // All subs selected → use null
        result.push({ main: main as MainMuscleGroup, sub: null });
      } else {
        // Specific subs → create entry for each
        subs.forEach((sub) => {
          result.push({
            main: main as MainMuscleGroup,
            sub: sub as SubMuscleGroup,
          });
        });
      }
    });

    return result;
  };

  // Toggle all sub-groups for a main group
  const handleMainGroupToggle = (mainGroup: MainMuscleGroup) => {
    const newSelections = new Map(selections);
    const subs = MUSCLE_GROUPS[mainGroup];
    const currentSubs = newSelections.get(mainGroup) || new Set();

    if (currentSubs.size === subs.length) {
      // All selected → deselect all
      newSelections.delete(mainGroup);
    } else {
      // Not all selected → select all
      newSelections.set(mainGroup, new Set(subs));
    }

    setSelections(newSelections);
    onChange(toFormData(newSelections));
  };

  // Toggle individual sub-group
  const handleSubToggle = (mainGroup: MainMuscleGroup, sub: string) => {
    const newSelections = new Map(selections);

    if (!newSelections.has(mainGroup)) {
      newSelections.set(mainGroup, new Set());
    }

    const subs = newSelections.get(mainGroup)!;
    if (subs.has(sub)) {
      subs.delete(sub);
      if (subs.size === 0) newSelections.delete(mainGroup);
    } else {
      subs.add(sub);
    }

    setSelections(newSelections);
    onChange(toFormData(newSelections));
  };

  // Toggle expansion
  const toggleExpand = (mainGroup: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(mainGroup)) {
      newExpanded.delete(mainGroup);
    } else {
      newExpanded.add(mainGroup);
    }
    setExpanded(newExpanded);
  };

  return (
    <div className="space-y-3">
      {MAIN_MUSCLE_GROUPS.map((mainGroup) => {
        const subs = MUSCLE_GROUPS[mainGroup];
        const selected = selections.get(mainGroup) || new Set();
        const allSelected = selected.size === subs.length && selected.size > 0;
        const someSelected = selected.size > 0 && selected.size < subs.length;
        const isExpanded = expanded.has(mainGroup);

        return (
          <div key={mainGroup} className="space-y-2">
            {/* Parent Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    // Set indeterminate state
                    const checkbox = el as HTMLButtonElement;
                    checkbox.dataset.state = someSelected
                      ? 'indeterminate'
                      : allSelected
                        ? 'checked'
                        : 'unchecked';
                  }
                }}
                onCheckedChange={() => handleMainGroupToggle(mainGroup)}
                className="h-5 w-5"
              />
              <button
                type="button"
                onClick={() => toggleExpand(mainGroup)}
                className="flex items-center gap-1 text-sm font-medium hover:underline min-h-11"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {mainGroup}
                {selected.size > 0 && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({selected.size === subs.length ? 'All' : selected.size})
                  </span>
                )}
              </button>
            </div>

            {/* Child Checkboxes */}
            {isExpanded && (
              <div className="pl-8 space-y-2">
                {subs.map((sub) => (
                  <div key={sub} className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.has(sub)}
                      onCheckedChange={() => handleSubToggle(mainGroup, sub)}
                      className="h-5 w-5"
                    />
                    <label className="text-sm">{sub}</label>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
