'use client'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CheckIcon, Filter } from 'lucide-react'

interface FilterOption {
  value: string;
  label: string;
}

interface FilterButtonProps {
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export default function FilterButton({
  value,
  options,
  onChange
}:FilterButtonProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="w-10 h-10 rounded-sm min-w-10"
                    aria-label={`Filter: ${value || 'Select option'}`}
                >
                    <Filter className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {options.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onSelect={() => onChange(option.value)}
                        className={value === option.value ? "bg-accent" : ""}
                    >
                        <div className="flex flex-row gap-2 items-center">
                            <div className="size-4">
                                {   
                                    value === option.value && (
                                        <CheckIcon className="h-4 w-4" />
                                    )
                                }
                            </div>
                            <span>{option.label}</span>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}