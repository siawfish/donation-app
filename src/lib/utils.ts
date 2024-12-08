import { ConditionType } from "@/app/types";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  if (!name) return ''
  return name.split(' ').map(n => n[0]).join('');
}

export const Conditions = [
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