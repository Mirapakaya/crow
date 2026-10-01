'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-[var(--space-0-5)] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] p-[var(--space-0-5)]',
      className,
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] px-[var(--space-2)] min-h-[calc(var(--control-md)-var(--space-1))] text-[var(--step--1)] font-[var(--weight-medium)] text-[var(--text-muted)] transition-[background,color] focus-visible:outline-[var(--ring-width)] focus-visible:outline-solid focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[var(--ring-offset)] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--text)] data-[state=active]:border data-[state=active]:border-[var(--border)] data-[state=active]:shadow-[var(--shadow-sm)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-[var(--space-4)] focus-visible:outline-[var(--ring-width)] focus-visible:outline-solid focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[var(--ring-offset)]',
      className,
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
