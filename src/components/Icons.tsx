import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const baseProps: IconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const ArrowRightIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

export const BotIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><rect x="4" y="7" width="16" height="13" rx="4" /><path d="M9 12h.01M15 12h.01M9 16h6M12 7V3M9 3h6" /></svg>
)

export const CheckIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><path d="m5 12 4 4L19 6" /></svg>
)

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><path d="m9 18 6-6-6-6" /></svg>
)

export const ClockIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)

export const FileIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><path d="M6 2h8l4 4v16H6zM14 2v5h5M9 13h6M9 17h5" /></svg>
)

export const LockIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
)

export const RefreshIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 8a7 7 0 0 1 11.6-2.6L20 8M4 16l2.3 2.6A7 7 0 0 0 17.9 16" /></svg>
)

export const ShieldIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><path d="M12 3 4.5 6v5.5c0 4.8 3.1 8 7.5 9.5 4.4-1.5 7.5-4.7 7.5-9.5V6z" /><path d="m9 12 2 2 4-4" /></svg>
)

export const SparkleIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4zM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></svg>
)

export const UserIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>
)

export const WarningIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><path d="M12 3 2.5 20h19z" /><path d="M12 9v4M12 17h.01" /></svg>
)

export const XIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>
)
