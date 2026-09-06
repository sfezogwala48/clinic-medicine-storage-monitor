import { Link, type LinkComponentProps } from "@tanstack/react-router";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RouterButtonProps = LinkComponentProps<"a"> &
  VariantProps<typeof buttonVariants> & {
    activeClassName?: string;
  };

/**
 * A TanStack Router `Link` styled with shadcn button variants.
 *
 * This renders a real `<a>` element (correct link semantics, cmd+click,
 * preloading, active-state tracking) instead of forcing router props through
 * `createLink` onto a `<button>`, which would drop `href` semantics.
 * `to`/`params`/`search` remain fully type-safe against the route tree.
 */
export function RouterButton({
  className,
  variant,
  size,
  activeClassName,
  activeProps,
  ...props
}: RouterButtonProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size, className }))}
      activeProps={activeClassName ? { className: activeClassName } : activeProps}
      {...props}
    />
  );
}
