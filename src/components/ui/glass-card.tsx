import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card'

const glassCardVariants = cva(
  'rounded-xl transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'glass-card',
        elevated: 'glass-card-elevated',
        interactive: 'glass-card card-hover cursor-default',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface GlassCardProps
  extends React.ComponentProps<typeof Card>,
    VariantProps<typeof glassCardVariants> {}

function GlassCard({ className, variant, ...props }: GlassCardProps) {
  return (
    <Card
      className={cn(glassCardVariants({ variant }), className)}
      {...props}
    />
  )
}

export {
  GlassCard,
  glassCardVariants,
  // Re-export Card sub-components for convenience
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
}
