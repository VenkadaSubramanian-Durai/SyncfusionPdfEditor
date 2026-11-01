import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

function svg(path: ReactNode, viewBox = '0 0 24 24'): ReactNode {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

/**
 * The application mark. All other icons come from the Syncfusion icon font
 * through the `e-icons` class.
 */
export function AppMarkIcon({ size = 28, className }: IconProps) {
  return (
    <span className={className} style={{ display: 'inline-flex', width: size, height: size }}>
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="26" height="26" rx="7" fill="currentColor" />
        <path
          d="M11 10.5h10v11H11z"
          stroke="#05201c"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M11 14.5h10" stroke="#05201c" strokeWidth="2" />
      </svg>
    </span>
  );
}

export { svg };
