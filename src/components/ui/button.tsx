import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-[var(--space-2)] whitespace-nowrap min-h-[var(--control-lg)] rounded-[var(--radius-md)] border border-transparent px-[var(--space-4)] text-[var(--step-0)] font-[var(--weight-medium)] cursor-pointer select-none transition-[background,border-color,color,opacity] focus-visible:outline-[var(--ring-width)] focus-visible:outline-solid focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[var(--ring-offset)] disabled:pointer-events-none disabled:bg-[var(--surface-2)] disabled:border-[var(--border)] disabled:text-[var(--text-faint)] disabled:shadow-none disabled:cursor-not-allowed active:translate-y-px active:transition-duration-[var(--duration-instant)]',
  {
    variants: {
      variant: {
        default: 'bg-[var(--surface-2)] border border-transparent text-[var(--text)] hover:bg-[var(--surface-3)] active:bg-[var(--surface-active)]',
        solid: 'bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]',
        destructive: 'bg-[var(--danger)] text-[var(--danger-fg)] hover:bg-[var(--danger-hover)]',
        outline: 'border-[var(--border-strong)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)]',
        secondary: 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]',
        ghost: 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] active:bg-[var(--surface-3)]',
        link: 'text-[var(--accent-text)] underline-offset-4 hover:underline',
        'danger-soft': 'bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-[var(--danger-fg)]',
      },
      size: {
        default: 'h-auto px-[var(--space-4)]',
        sm: 'min-h-[var(--control-md)] px-[var(--space-3)] text-[var(--step--1)]',
        lg: 'min-h-[var(--control-xl)] px-[var(--space-5)]',
        icon: 'min-h-[var(--control-lg)] w-[var(--control-lg)] px-0',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      block: false,
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, block, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
