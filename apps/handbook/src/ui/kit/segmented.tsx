import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export interface SegmentedOption {
  value: string;
  label: ReactNode;
}

interface Props {
  /** Names the group for the browser, so two on one page do not merge. */
  name: string;
  /** What the group is choosing between. Rendered, so keep it short. */
  legend: string;
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Off where the group already stands under a heading that says what it is. */
  showLegend?: boolean;
  className?: string;
}

/**
 * One exclusive choice, drawn as a row of segments.
 *
 * Radios in labels, not buttons carrying `aria-pressed`. There were three
 * hand-written copies of this control and two of them were buttons, which is
 * wrong twice over: `aria-pressed` says "this is on" where the question is "which
 * one", and a row of buttons is a row of tab stops where a radio group is one,
 * with the arrow keys moving inside it. The browser does all of that for a
 * fieldset of radios and none of it for buttons.
 *
 * The input is the control and the span is the paint: `peer sr-only` keeps the
 * radio where the keyboard and the screen reader expect it while `peer-checked`
 * and `peer-focus-visible` draw it.
 */
export function Segmented({
  name,
  legend,
  value,
  options,
  onChange,
  disabled,
  showLegend = false,
  className,
}: Props) {
  return (
    <fieldset
      disabled={disabled}
      className={cn(
        'inline-flex min-w-0 flex-wrap items-center gap-4xs rounded-md border border-stroke bg-canvas p-4xs',
        'disabled:opacity-60',
        className,
      )}
    >
      <legend className={showLegend ? 'mb-2xs text-s text-on-canvas-muted' : 'sr-only'}>
        {legend}
      </legend>
      {options.map((option) => (
        <label key={option.value} className="min-w-0">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          <span
            className={cn(
              'block cursor-pointer rounded-s px-xs py-3xs text-s font-medium transition-colors',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-accent',
              value === option.value
                ? 'bg-accent text-white'
                : 'text-on-canvas-muted hover:bg-surface hover:text-on-canvas',
            )}
          >
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
