import { Icon } from './icons';

export type RailItem = 'view' | 'annotate' | 'sign' | 'redact' | 'organize' | 'compare' | 'pages' | 'more';

const DESKTOP: (RailItem | '|')[] = ['view', 'annotate', 'sign', 'redact', '|', 'organize', 'compare', '|', 'pages'];
const PHONE: RailItem[] = ['view', 'annotate', 'sign', 'organize', 'more'];
const META: Record<RailItem, { icon: string; label: string; short?: string }> = {
  view: { icon: 'view', label: 'View' },
  annotate: { icon: 'annotate', label: 'Annotate' },
  sign: { icon: 'sign', label: 'Fill & Sign', short: 'Sign' },
  redact: { icon: 'redact', label: 'Redact' },
  organize: { icon: 'organize', label: 'Organize', short: 'Pages' },
  compare: { icon: 'compare', label: 'Compare' },
  pages: { icon: 'pages', label: 'Pages' },
  more: { icon: 'more', label: 'More' },
};

interface Props {
  phone: boolean;
  isOn: (item: RailItem) => boolean;
  onSelect: (item: RailItem) => void;
}

/** Left rail on desktop and tablet; bottom tabs on phones. Labels are always visible. */
export function Rail({ phone, isOn, onSelect }: Props) {
  if (phone) {
    return (
      <nav className="bottom-tabs" aria-label="Features">
        {PHONE.map((id) => (
          <button key={id} aria-pressed={isOn(id)} onClick={() => onSelect(id)}>
            <Icon name={META[id].icon} size={21} />
            {META[id].short ?? META[id].label}
          </button>
        ))}
      </nav>
    );
  }
  return (
    <nav className="rail" aria-label="Features">
      {DESKTOP.map((id, i) =>
        id === '|' ? (
          <hr key={`sep${i}`} />
        ) : (
          <button key={id} aria-pressed={isOn(id)} onClick={() => onSelect(id)}>
            <Icon name={META[id].icon} />
            {META[id].label}
          </button>
        ),
      )}
    </nav>
  );
}
