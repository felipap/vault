import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-contrast text-inverted hover:bg-contrast/90",
        primary: "bg-link text-white hover:bg-link/90",
        secondary: "bg-contrast/5 text-contrast hover:bg-contrast/10",
        link: "text-secondary hover:text-contrast hover:bg-one/5",
        outline: "border text-contrast hover:bg-contrast/5",
        danger:
          "bg-red-50 dark:bg-red-700 text-red-600 dark:text-red-100 hover:text-red-600 hover:bg-red-100",
      },
      size: {
        // I think it makes sense to use hard-coded font sizes
        sm: "h-7 px-2 text-[12px] rounded-md",
        md: "h-8 px-3 text-[13px] pb-[1px] rounded-md",
        lg: "h-10 px-5 text-[15px] rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    icon?: ReactNode
  }

export const Button = forwardRef<HTMLButtonElement, Props>(
  (
    { className, variant, size, asChild = false, icon, children, ...props },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot
          className={buttonVariants({ variant, size, className })}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      >
        {icon}
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"

export { buttonVariants }
