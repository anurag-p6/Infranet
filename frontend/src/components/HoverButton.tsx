import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type HoverButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

const variantClass = {
  primary: "hover-btn hover-btn--primary",
  secondary: "hover-btn hover-btn--secondary",
};

function ButtonLayers({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="hover-btn__layer hover-btn__layer--base" aria-hidden="false">
        <span className="hover-btn__text">{children}</span>
      </span>
      <span className="hover-btn__layer hover-btn__layer--hover" aria-hidden="true">
        <span className="hover-btn__text">{children}</span>
      </span>
    </>
  );
}

export function HoverButton({
  children,
  href,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  ...props
}: HoverButtonProps) {
  const classes = `${variantClass[variant]} ${className}`.trim();

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        <ButtonLayers>{children}</ButtonLayers>
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} {...props}>
      <ButtonLayers>{children}</ButtonLayers>
    </button>
  );
}
