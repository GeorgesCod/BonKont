import * as React from 'react';
import * as togglePrimitive from '@radix-ui/react-toggle';
import { cva, VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover-muted hover-muted-foreground focus-visible-none focus-visible-1 focus-visible-ring disabled-events-none disabled-50 data-[state=on]-accent data-[state=on]-accent-foreground',
  {
    variants,
      size,
    },
    defaultVariants,
  }
);

const Toggle = React.forwardRef,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
