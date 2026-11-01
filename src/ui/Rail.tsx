import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

export type RailItem =
  | 'view'
  | 'annotate'
  | 'sign'
  | 'redact'
  | 'organize'
  | 'compare'
  | 'pages'
  | 'more';

interface RailProps {
  active: RailItem;
  onSelect: (item: RailItem) => void;
  variant: 'desktop' | 'phone';
  hidden?: boolean;
}

interface RailEntry {
  id: RailItem;
  label: string;
  /** Syncfusion icon font class. */
  iconCss: string;
  group?: boolean;
}

const DESKTOP_ITEMS: RailEntry[] = [
  { id: 'view', label: 'View', iconCss: 'e-icons e-home' },
  { id: 'annotate', label: 'Annotate', iconCss: 'e-icons e-annotation-edit' },
  { id: 'sign', label: 'Fill & Sign', iconCss: 'e-icons e-signature' },
  { id: 'redact', label: 'Redact', iconCss: 'e-icons e-text-redact' },
  { id: 'organize', label: 'Organize', iconCss: 'e-icons e-organize-pdf', group: true },
  { id: 'compare', label: 'Compare', iconCss: 'e-icons e-building-block' },
  { id: 'pages', label: 'Pages', iconCss: 'e-icons e-thumbnail' }
];

const PHONE_ITEMS: RailEntry[] = [
  { id: 'view', label: 'View', iconCss: 'e-icons e-home' },
  { id: 'annotate', label: 'Annotate', iconCss: 'e-icons e-annotation-edit' },
  { id: 'sign', label: 'Sign', iconCss: 'e-icons e-signature' },
  { id: 'pages', label: 'Pages', iconCss: 'e-icons e-thumbnail' },
  { id: 'more', label: 'More', iconCss: 'e-icons e-more-vertical-1' }
];

export function Rail({ active, onSelect, variant, hidden }: RailProps) {
  if (hidden) {
    return null;
  }

  const items = variant === 'phone' ? PHONE_ITEMS : DESKTOP_ITEMS;

  return (
    <nav
      className={`rail rail-${variant}`}
      aria-label={variant === 'phone' ? 'Primary' : 'Tools'}
    >
      {items.map((item) => {
        const isActive = active === item.id;

        return (
          <ButtonComponent
            key={item.id}
            cssClass={`rail-item${isActive ? ' is-active' : ''}${
              item.group ? ' rail-group-start' : ''
            }`}
            iconCss={item.iconCss}
            content={item.label}
            title={item.label}
            onClick={() => onSelect(item.id)}
          />
        );
      })}
    </nav>
  );
}
