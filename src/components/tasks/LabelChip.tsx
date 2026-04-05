'use client';

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelChipProps {
  label: Label;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1F2937' : '#FFFFFF';
}

function lightenHex(hex: string, amount = 0.85): string {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr},${lg},${lb})`;
}

export function LabelChip({ label, onRemove, size = 'sm' }: LabelChipProps) {
  const bg = lightenHex(label.color, 0.8);
  const textColor = label.color;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-chip font-medium ${sizeClass}`}
      style={{ backgroundColor: bg, color: textColor, borderRadius: '6px' }}
    >
      <span
        className="inline-block rounded-full flex-shrink-0"
        style={{ width: 6, height: 6, backgroundColor: label.color }}
      />
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 flex-shrink-0"
          style={{ lineHeight: 1 }}
        >
          ✕
        </button>
      )}
    </span>
  );
}
