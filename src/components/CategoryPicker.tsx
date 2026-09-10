"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ChevronDown, ChevronRight, ChevronLeft, Check, X } from "lucide-react"
import {
  CategoryLeaf,
  Department,
  getDepartments,
  getCategoriesFor,
  getSubcategoriesFor,
} from "@/lib/categoryTree"

interface CategoryPickerProps {
  label?: string
  containerClassName?: string
  error?: string
  /**
   * The item's single category — still an array (0 or 1 leaf) so the stored
   * shape and every existing query/filter against it stay unchanged.
   */
  value: CategoryLeaf[]
  onChange: (value: CategoryLeaf[]) => void
  onTouched?: () => void
  disabled?: boolean
}

/**
 * Vinted-style drill-down: department → category → subcategory. An item sits
 * in exactly one subcategory — picking a leaf replaces whatever was picked
 * before and closes the sheet, the way a native select behaves, rather than
 * collecting a set of tags.
 */
export default function CategoryPicker({
  label,
  containerClassName,
  error,
  value,
  onChange,
  onTouched,
  disabled = false,
}: CategoryPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [deptId, setDeptId] = React.useState<string | null>(null)
  const [catId, setCatId] = React.useState<string | null>(null)

  const departments = React.useMemo(() => getDepartments(), [])
  const categories = deptId ? getCategoriesFor(deptId) : []
  const subcategories = deptId && catId ? getSubcategoriesFor(deptId, catId) : []
  const activeDept = departments.find((d) => d.id === deptId) ?? null
  const activeCat = categories.find((c) => c.id === catId) ?? null

  const selected = value[0] ?? null
  const selectedIds = new Set(value.map((v) => v.id))

  function selectLeaf(leaf: CategoryLeaf) {
    onChange([leaf])
    // Closes without also calling onTouched: that runs a validation pass off
    // whatever Formik's `values` closure still holds at this exact tick, which
    // can be a beat behind the onChange above and briefly flash a stale
    // "pick a category" error even though one was just picked.
    setOpen(false)
    setDeptId(null)
    setCatId(null)
  }

  function clearSelection() {
    onChange([])
  }

  function handleOpenChange(next: boolean) {
    if (disabled) return
    setOpen(next)
    if (!next) {
      onTouched?.()
      setDeptId(null)
      setCatId(null)
    }
  }

  // What the sheet is currently showing, most specific first.
  const level: "subcategory" | "category" | "department" =
    activeDept && activeCat ? "subcategory" : activeDept ? "category" : "department"

  return (
    <div className={cn("space-y-1 p-3 pb-5 bg-white rounded-md relative", containerClassName, disabled && "cursor-not-allowed")}>
      {label && <Label>{label}</Label>}

      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full h-fit justify-between px-2 hover:bg-white",
          error ? "border-red-500" : "",
          open ? "border-primary border-2" : "",
          disabled && "cursor-not-allowed"
        )}
        disabled={disabled}
        onClick={() => handleOpenChange(true)}
      >
        <div className="flex items-center gap-1 min-w-0">
          {selected ? (
            <span className="font-cabinetLight text-black truncate">{selected.name}</span>
          ) : (
            <span className="text-muted-foreground font-cabinetLight">Choose a category…</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                clearSelection()
              }}
              className="opacity-60 hover:opacity-100 p-1"
              aria-label="Clear category"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50 min-w-4" />
        </div>
      </Button>

      <p className={cn("text-xs font-cabinetLight text-red-500 absolute bottom-1 mt-1", error ? "visible" : "invisible")}>
        {error}
      </p>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="min-w-[100vw] lg:min-w-[420px] px-0 bg-white flex flex-col gap-0">
          <SheetTitle className="sr-only">Choose a category</SheetTitle>

          {/* Breadcrumb / back */}
          <div className="px-5 pt-2 pb-3 border-b border-gray-200/70 flex items-center gap-2 shrink-0">
            {level !== "department" ? (
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-semibold text-ink shrink-0"
                onClick={() => (level === "subcategory" ? setCatId(null) : setDeptId(null))}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <span className="text-sm font-semibold text-ink">All departments</span>
            )}
            <span className="text-xs text-gray-400 truncate">
              {activeDept?.name}
              {activeCat ? ` › ${activeCat.name}` : ""}
            </span>
          </div>

          {/* Rows for the current level */}
          <div className="flex-1 overflow-y-auto">
            {level === "department" &&
              departments.map((dept) => (
                <DeptRow key={dept.id} dept={dept} onClick={() => setDeptId(dept.id)} />
              ))}

            {level === "category" &&
              categories.map((cat) => (
                <NavRow key={cat.id} label={cat.name} onClick={() => setCatId(cat.id)} />
              ))}

            {level === "subcategory" &&
              subcategories.map((sub) => (
                <LeafRow
                  key={sub.id}
                  label={sub.name}
                  checked={selectedIds.has(sub.id)}
                  onClick={() => selectLeaf(sub)}
                />
              ))}
          </div>

          {/* Picking a leaf above closes the sheet immediately — this is only
              an escape hatch for backing out without choosing anything. */}
          <div className="px-5 py-4 border-t border-gray-200/70 shrink-0">
            <Button type="button" variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DeptRow({ dept, onClick }: { dept: Department; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 border-b border-gray-100"
    >
      <span className="text-sm font-medium text-ink">{dept.name}</span>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </button>
  )
}

function NavRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 border-b border-gray-100"
    >
      <span className="text-sm text-ink">{label}</span>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </button>
  )
}

function LeafRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 border-b border-gray-100"
    >
      <span className="text-sm text-ink">{label}</span>
      <Check className={cn("h-4 w-4 text-primary", checked ? "opacity-100" : "opacity-0")} />
    </button>
  )
}
