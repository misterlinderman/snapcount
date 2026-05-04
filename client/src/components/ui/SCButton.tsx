import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type SCButtonVariant = 'primary' | 'secondary' | 'blue' | 'gold' | 'danger' | 'ghost' | 'field';
export type SCButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface SCButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: SCButtonVariant;
  size?: SCButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const VARIANTS: Record<SCButtonVariant, { bg: string; border: string; color: string }> = {
  primary: { bg: 'var(--blitz-red)', border: 'var(--blitz-red)', color: '#ffffff' },
  secondary: { bg: 'var(--bg-raised)', border: 'var(--bg-border)', color: 'var(--text-primary)' },
  blue: { bg: 'var(--storm-blue)', border: 'var(--storm-blue)', color: '#ffffff' },
  gold: { bg: 'var(--gold)', border: 'var(--gold)', color: 'var(--text-inverse)' },
  danger: { bg: 'transparent', border: 'var(--blitz-red)', color: 'var(--blitz-red)' },
  ghost: { bg: 'transparent', border: 'var(--bg-border)', color: 'var(--text-secondary)' },
  field: { bg: 'var(--field-green-mid)', border: 'var(--field-green-line)', color: '#ffffff' },
};

const SIZES: Record<SCButtonSize, { padding: string; fontSize: number }> = {
  sm: { padding: '5px 12px', fontSize: 11 },
  md: { padding: '8px 18px', fontSize: 13 },
  lg: { padding: '12px 28px', fontSize: 15 },
  xl: { padding: '14px 36px', fontSize: 17 },
};

function SCButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth,
  icon,
  disabled,
  type = 'button',
  style,
  className = '',
  ...rest
}: SCButtonProps): JSX.Element {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        background: v.bg,
        border: `1.5px solid ${v.border}`,
        color: v.color,
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      {...rest}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </button>
  );
}

export default SCButton;
