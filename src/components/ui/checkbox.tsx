'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onCheckedChange'> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(event)
      onCheckedChange?.(event.target.checked)
    }
    return (
      <span className={cn('relative inline-flex h-5 w-5 shrink-0 items-center justify-center', className)}>
        <input
          ref={ref}
          type="checkbox"
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded border border-border bg-background text-foreground transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          onChange={handleChange}
          {...props}
        />
        <Check className="pointer-events-none absolute h-3.5 w-3.5 opacity-0 peer-checked:opacity-100" />
      </span>
    )
  },
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
