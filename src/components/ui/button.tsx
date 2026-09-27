import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-[var(--ring-width)] focus-visible:ring-ring focus-visible:ring-offset-[var(--ring-offset)] focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-accent-fg shadow-xs hover:bg-accent-hover active:bg-accent-active',
        destructive:
          'bg-danger text-danger-fg shadow-xs hover:bg-danger-hover active:bg-danger-hover',
        outline:
          'border border-border bg-surface shadow-xs hover:bg-surface-hover active:bg-surface-active text-text',
        secondary:
          'bg-surface-2 text-text shadow-xs hover:bg-surface-hover active:bg-surface-active',
        ghost:
          'hover:bg-surface-hover active:bg-surface-active text-text',
        link: 'text-accent-text underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-sm px-3 text-xs',
        lg: 'h-10 rounded-md px-6',
        icon: 'size-9',
        'icon-sm': 'size-8',
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
