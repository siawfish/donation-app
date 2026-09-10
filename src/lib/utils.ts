import { ConditionType } from "@/app/types";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  if (!name) return ''
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
}

// Best to worst, both for the lister's picker and anywhere condition is displayed.
export const Conditions = [
  {
    label: "New",
    value: ConditionType.NEW
  },
  {
    label: "Like New",
    value: ConditionType.LIKE_NEW
  },
  {
    label: "Good",
    value: ConditionType.GOOD
  },
  {
    label: "Fair",
    value: ConditionType.FAIR
  },
  {
    label: "Poor",
    value: ConditionType.POOR
  }
]

/** Display label for a condition value — a lookup rather than title-casing the
 * raw enum value, since "like_new" doesn't title-case into "Like New" on its own. */
export const ConditionLabels: Record<ConditionType, string> = Object.fromEntries(
  Conditions.map((c) => [c.value, c.label])
) as Record<ConditionType, string>

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};