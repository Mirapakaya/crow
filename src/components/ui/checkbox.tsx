'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-[var(--control-sm)] w-[var(--control-sm)] shrink-0 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] transition-colors focus-visible:outline-[var(--ring-width)] focus-visible:outline-solid focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[var(--ring-offset)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--accent)] data-[state=checked]:border-[var(--accent)] data-[state=checked]:text-[var(--accent-fg)]',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
      <Check className="h-3.5 w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
