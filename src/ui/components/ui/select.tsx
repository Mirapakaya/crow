import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-9 w-full appearance-none rounded-lg border border-[#eaeaea] bg-[#fafafa] px-3 py-2 pr-8 text-sm text-[#111] shadow-sm focus:border-[#0070f3] focus:outline-none focus:ring-1 focus:ring-[#0070f3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#333] dark:bg-[#111] dark:text-white',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888]" />
    </div>
  )
})
Select.displayName = 'Select'

export { Select }
