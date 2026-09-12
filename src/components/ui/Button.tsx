import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const variantClasses = {
  primary:
    "bg-primary text-white hover:bg-primary-dark shadow-card hover:shadow-card-hover",
  secondary:
    "bg-secondary text-white hover:bg-secondary-dark shadow-card hover:shadow-card-hover",
  accent: "bg-accent text-white hover:bg-accent-dark shadow-card hover:shadow-card-hover",
  outline:
    "border border-white/40 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20",
  outlineDark:
    "border border-midnight/15 text-midnight bg-transparent hover:bg-midnight/5",
  white: "bg-white text-midnight hover:bg-white/90 shadow-card hover:shadow-card-hover",
  ghost: "text-midnight hover:bg-midnight/5",
} as const;

const sizeClasses = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
} as const;

type Variant = keyof typeof variantClasses;
type Size = keyof typeof sizeClasses;

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

interface ButtonAsButton
  extends BaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  href?: undefined;
}

interface ButtonAsLink extends BaseProps {
  href: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

function isLinkProps(props: ButtonProps): props is ButtonAsLink {
  return typeof props.href === "string";
}

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children, icon, iconPosition = "right" } = props;

  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 ease-out-luxury cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  const content = (
    <>
      {icon && iconPosition === "left" && icon}
      {children}
      {icon && iconPosition === "right" && icon}
    </>
  );

  if (isLinkProps(props)) {
    const { href, target, rel, onClick } = props;
    return (
      <Link href={href} target={target} rel={rel} onClick={onClick} className={classes}>
        {content}
      </Link>
    );
  }

  const { variant: _1, size: _2, className: _3, children: _4, icon: _5, iconPosition: _6, ...rest } = props;

  return (
    <button {...rest} className={classes}>
      {content}
    </button>
  );
}
