"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { ChevronDown, CircleAlertIcon, CircleCheckIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConditionType } from "@/app/types"

interface Option {
  value: string
  label: string
  icon?: React.ReactNode
}

interface SelectInputProps {
  label?: string
  containerClassName?: string
  error?: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onTouched?: () => void
  disabled?: boolean
}

const Icon = ({ condition }: { condition: ConditionType }) => {
  return (
    <>
      {condition === ConditionType.GOOD && <CircleCheckIcon className="w-4 h-4 text-green-500" />}
      {condition === ConditionType.FAIR && <CircleAlertIcon className="w-4 h-4 text-yellow-500" />}
      {condition === ConditionType.POOR && <CircleAlertIcon className="w-4 h-4 text-red-500" />}
    </>
  )
}

export default function SelectInput({
  label,
  containerClassName,
  error,
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  onTouched,
  disabled = false
}: SelectInputProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = options.find(o => o.value === value)?.label

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
            <div className="flex items-center gap-1">
                {<Icon condition={value as ConditionType} />}
                <span className={cn("font-cabinetLight mt-[2px]", !selectedLabel && "text-muted-foreground")}>
                    {selectedLabel || placeholder}
                </span>
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
                if (!disabled) onChange(option.value)
              }}
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                {<Icon condition={option.value as ConditionType} />}
                <span className="mt-[2px]">{option.label}</span>
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


