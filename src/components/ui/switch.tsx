'use client'

import * as React from 'react'
import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-[1.25rem] w-[2.25rem] shrink-0 cursor-pointer items-center rounded-[var(--radius-full)] border-[var(--border-width)] border-transparent shadow-sm transition-colors focus-visible:outline-[var(--ring-width)] focus-visible:outline-solid focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[var(--ring-offset)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--accent)] data-[state=unchecked]:bg-[var(--surface-3)]',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-[0.875rem] w-[0.875rem] rounded-[var(--radius-full)] bg-[var(--text-inverse)] shadow-sm transition-transform data-[state=checked]:translate-x-[0.875rem] data-[state=unchecked]:translate-x-[0.125rem]',
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
