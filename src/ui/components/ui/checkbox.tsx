import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded border border-[#eaeaea] bg-white text-[#0070f3] accent-[#0070f3] focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:ring-offset-1 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#333] dark:bg-[#111] dark:focus:ring-offset-black',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Checkbox.displayName = 'Checkbox'

export { Checkbox }
