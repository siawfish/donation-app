"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckIcon, ChevronDown, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Option {
  value: string
  label: string
}

interface CustomMultiSelectProps {
  label?: string
  containerClassName?: string
  error?: string
  options: Option[]
  values: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  onTouched?: () => void
  disabled?: boolean
}

export default function MultiSelectInput({
  label,
  containerClassName,
  error,
  options,
  values,
  onChange,
  placeholder = "Select options...",
  onTouched,
  disabled = false
}: CustomMultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleValueChange = (selectedValue: string) => {
    if (disabled) return;
    if (values.includes(selectedValue)) {
      onChange(values.filter((v) => v !== selectedValue))
    } else {
      onChange([...values, selectedValue])
    }
  }

  const selectedLabels = values.map(v => options.find(o => o.value === v)?.label).filter(Boolean)

  return (
    <div className={cn("space-y-1 p-3 pb-5 bg-white rounded-md relative", containerClassName, disabled && "cursor-not-allowed")}>
      {label && <Label>{label}</Label>}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button 
            variant="outline" 
            className={cn(
              "w-full h-fit justify-between px-2 hover:bg-white", 
              error ? "border-red-500" : "", 
              open ? "border-primary border-2" : "",
              disabled && "cursor-not-allowed"
            )} 
            onBlur={onTouched}
          >
            <div className="flex flex-wrap gap-1 items-center">
              {selectedLabels.length > 0 ? (
                selectedLabels.map((label, index) => (
                  <Badge key={index} variant="secondary" className="font-cabinetLight text-black">
                    {label}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground font-cabinetLight">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 min-w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              className={cn("cursor-pointer", disabled && "cursor-not-allowed opacity-50")}
              onSelect={(e) => {
                e.preventDefault()
                handleValueChange(option.value)
              }}
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                <CheckIcon id={option.value} className={cn("h-4 w-4", values.includes(option.value) ? "opacity-100" : "opacity-0")} />
                {option.label}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <p
        className={cn(
          "text-xs font-cabinetLight text-red-500 absolute bottom-1 mt-1",
          error ? "visible" : "invisible"
        )}
      >
        {error}
      </p>
    </div>
  )
}