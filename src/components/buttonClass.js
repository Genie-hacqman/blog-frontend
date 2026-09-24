const variants = {
  primary: 'border border-ink bg-ink text-paper hover:border-accent hover:bg-accent',
  secondary: 'border border-ink bg-transparent text-ink hover:bg-paper-2',
  danger: 'border border-danger bg-transparent text-danger hover:bg-danger hover:text-paper',
  ghost: 'link-slide px-0! py-0.5! text-ink hover:text-accent',
}

export const buttonClass = (variant = 'primary') =>
  `inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 font-mono text-xs font-medium tracking-[0.12em] uppercase transition-colors duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`
