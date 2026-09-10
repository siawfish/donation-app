import { flattenLeaves } from "./categoryTree"

/**
 * Size only makes sense for wearable things. What "size" actually means
 * varies by who it's for — adults size clothing in letters and shoes in
 * numbers, but kids' and baby clothing is sized by age, not by letter, so
 * each bracket gets the scale people actually shop by.
 */
export type SizeKind =
  | "adult-clothing"
  | "adult-shoes"
  | "kids-clothing-2-8"
  | "kids-clothing-9-16"
  | "baby-clothing"
  | "kids-shoes"

const SIZE_SETS: Record<SizeKind, string[]> = {
  "adult-clothing": ["S", "M", "L", "XL", "XXL"],
  // UK sizing — what's actually printed on shoeboxes sold locally.
  "adult-shoes": ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"],
  "kids-clothing-2-8": ["2-3Y", "3-4Y", "4-5Y", "5-6Y", "6-7Y", "7-8Y"],
  "kids-clothing-9-16": ["9-10Y", "10-11Y", "11-12Y", "12-13Y", "13-14Y", "14-15Y", "15-16Y"],
  "baby-clothing": ["0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M"],
  // Junior UK shoe sizing, the range between baby soft-soles and adult sizing.
  "kids-shoes": ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "1", "2"],
}

export function sizesFor(kind: SizeKind): string[] {
  return SIZE_SETS[kind]
}

/**
 * Looks up the picked subcategory's department/category to decide whether —
 * and on what scale — a size applies. Matches on category name content
 * rather than the department's own `gender` tag alone, since Kids & Baby
 * spans several age brackets that each need their own scale.
 */
export function sizeKindFor(categoryLeafId?: string | null): SizeKind | null {
  if (!categoryLeafId) return null
  const found = flattenLeaves().find((entry) => entry.leaf.id === categoryLeafId)
  if (!found) return null
  const { department, category } = found
  const name = category.name

  if (department.gender === "women" || department.gender === "men") {
    if (name === "Clothing") return "adult-clothing"
    if (name === "Shoes") return "adult-shoes"
    return null
  }

  if (department.gender === "kids") {
    if (name === "Kids' Shoes") return "kids-shoes"
    if (name.startsWith("Baby & Toddler Clothing")) return "baby-clothing"
    // Matched on the digits rather than the exact dash character in
    // "(9–16 yrs)" / "(2–8 yrs)" — those two ranges never overlap in digits.
    if (name.includes("Clothing") && name.includes("9") && name.includes("16")) return "kids-clothing-9-16"
    if (name.includes("Clothing") && name.includes("2") && name.includes("8")) return "kids-clothing-2-8"
    return null
  }

  return null
}
