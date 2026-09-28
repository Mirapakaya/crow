import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
  {
    variants: {
      variant: {
        default: 'bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]',
        destructive: 'bg-[var(--danger)] text-[var(--danger-fg)] hover:bg-[var(--danger-hover)]',
        outline:
          'border border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
        secondary: 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]',
        ghost: 'hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
        link: 'text-[var(--accent-text)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[var(--control-md)] px-4 py-2',
        sm: 'h-[var(--control-sm)] rounded-md px-3 text-xs',
        lg: 'h-[var(--control-lg)] rounded-md px-6',
        icon: 'h-[var(--control-md)] w-[var(--control-md)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
