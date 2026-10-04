// Building blocks of direction F, matching design/mockups/f.css and the component table in design spec 4.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { back, navigate, type Route } from '../lib/router';

export type LampState = 'off' | 'on' | 'part' | 'done';
const LAMP_TEXT: Record<LampState, string> = { off: 'not started', on: 'next', part: 'in progress', done: 'done' };

export function Lamp({ state, label }: { state: LampState; label?: string }) {
  const cls = 'lamp' + (state === 'off' ? '' : ' ' + state);
  return <span className={cls} role="img" aria-label={label ?? LAMP_TEXT[state]} />;
}

export function NavRow({ left, title, right }: { left?: ReactNode; title?: ReactNode; right?: ReactNode }) {
  return (
    <div className="navrow">
      <div style={{ minWidth: 44, display: 'flex' }}>{left}</div>
      {title != null && <div className="ttl">{title}</div>}
      <div style={{ minWidth: 44, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  );
}

export function BackButton({ label, to }: { label: string; to: Route }) {
  return (
    <button type="button" className="back" onClick={() => back(to)}>
      <Icon name="back" />{label}
    </button>
  );
}

export function LargeTitle({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <header className="ltitle">
      <h1 className="t-large">{title}</h1>
      {sub != null && <div className="sub">{sub}</div>}
    </header>
  );
}

export function DetailTitle({ title, sub, lang }: { title: ReactNode; sub?: ReactNode; lang?: string }) {
  return (
    <header className="ltitle">
      <h1 className="t-title1" lang={lang}>{title}</h1>
      {sub != null && <div className="sub">{sub}</div>}
    </header>
  );
}

export function SectionHeader({ left, right, style }: { left: ReactNode; right?: ReactNode; style?: React.CSSProperties }) {
  return <h2 className="sh" style={style}><span>{left}</span>{right != null && <span>{right}</span>}</h2>;
}

export function Group({ children, flush, className, style }: { children: ReactNode; flush?: boolean; className?: string; style?: React.CSSProperties }) {
  return <div className={'grp' + (flush ? ' flush' : '') + (className ? ' ' + className : '')} style={style}>{children}</div>;
}

export interface RowProps {
  lamp?: LampState;
  lampLabel?: string;
  icon?: IconName;
  lead?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  external?: boolean;
  done?: boolean;
  selected?: boolean;
  onClick?: () => void;
  to?: Route;
  disabled?: boolean;
  label?: string;
  lang?: string;
}

export function Row(p: RowProps) {
  const cls = 'cl' + (p.done ? ' done' : '') + (p.selected ? ' sel' : '');
  const inner = (
    <>
      {p.lamp && <Lamp state={p.lamp} label={p.lampLabel} />}
      {p.icon && <Icon name={p.icon} />}
      {p.lead}
      <div className="ct"><b lang={p.lang}>{p.title}</b>{p.sub != null && <span>{p.sub}</span>}</div>
      {p.detail != null && <span className="det">{p.detail}</span>}
      {p.trailing}
      {p.external && <Icon name="ext" className="ext" />}
      {p.chevron && <Icon name="chev" className="chev" />}
    </>
  );
  if (p.onClick || p.to) {
    const go = p.onClick ?? (() => navigate(p.to!));
    return <button type="button" className={cls} onClick={go} disabled={p.disabled} aria-label={p.label}>{inner}</button>;
  }
  return <div className={cls}>{inner}</div>;
}

export function Foot({ children }: { children: ReactNode }) {
  return <p className="foot">{children}</p>;
}

export function GoKey({ children, icon, onClick, disabled, center, label }: { children: ReactNode; icon?: IconName; onClick?: () => void; disabled?: boolean; center?: boolean; label?: string }) {
  return (
    <button type="button" className={'go' + (center || !icon ? ' center' : '')} onClick={onClick} disabled={disabled} aria-label={label}>
      <span>{children}</span>{icon && <Icon name={icon} />}
    </button>
  );
}

export function Key2({ children, icon, onClick, disabled, small, danger, style, label }: { children: ReactNode; icon?: IconName; onClick?: () => void; disabled?: boolean; small?: boolean; danger?: boolean; style?: React.CSSProperties; label?: string }) {
  return (
    <button type="button" className={'key2' + (small ? ' sm' : '') + (danger ? ' danger' : '')} onClick={onClick} disabled={disabled} style={style} aria-label={label}>
      {icon && <Icon name={icon} />}{children}
    </button>
  );
}

export function RKey({ icon, label, onClick, size, disabled, className }: { icon: IconName; label: string; onClick?: () => void; size?: 'lg' | 'skip'; disabled?: boolean; className?: string }) {
  return (
    <button type="button" className={'rkey' + (size ? ' ' + size : '') + (className ? ' ' + className : '')} onClick={onClick} aria-label={label} disabled={disabled}>
      <Icon name={icon} className={size === 'skip' ? 'big' : undefined} />
    </button>
  );
}

export function TextButton({ children, icon, onClick, danger, disabled }: { children: ReactNode; icon?: IconName; onClick?: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={'tbtn' + (danger ? ' danger' : '')} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} />}{children}
    </button>
  );
}

export function Chip({ children, icon, onClick, label }: { children: ReactNode; icon?: IconName; onClick?: () => void; label?: string }) {
  return (
    <button type="button" className="chip" onClick={e => { e.stopPropagation(); onClick?.(); }} aria-label={label}>
      {icon && <Icon name={icon} />}{children}
    </button>
  );
}

export function Seg<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(o => (
        <button type="button" key={String(o.value)} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <input type="checkbox" role="switch" className="sw" checked={checked} disabled={disabled} aria-label={label}
      onChange={e => onChange(e.currentTarget.checked)} />
  );
}

export function Notice({ kind = 'info', title, children, icon }: { kind?: 'info' | 'err'; title: ReactNode; children?: ReactNode; icon?: IconName }) {
  return (
    <div className={'notice' + (kind === 'err' ? ' err' : '')} role={kind === 'err' ? 'alert' : undefined}>
      <Icon name={icon ?? (kind === 'err' ? 'warn' : 'info')} />
      <div><b>{title}</b>{children != null && <span>{children}</span>}</div>
    </div>
  );
}

export function Pad({ children, top = 16, bottom = 0, side = 16, style }: { children: ReactNode; top?: number; bottom?: number; side?: number; style?: React.CSSProperties }) {
  return <div style={{ padding: `${top}px ${side}px ${bottom}px`, ...style }}>{children}</div>;
}

/** Bottom sheet: dismiss by pulling down, tapping the dim area, or its own button. */
export function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const [dy, setDy] = useState(0);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
      prev?.focus?.();
    };
  }, [onClose]);

  const start = (e: React.TouchEvent) => {
    if ((ref.current?.scrollTop ?? 0) > 0) return;
    drag.current = { y: e.touches[0].clientY, dy: 0 };
  };
  const move = (e: React.TouchEvent) => {
    if (!drag.current) return;
    const d = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = d;
    setDy(d);
  };
  const end = () => {
    const d = drag.current?.dy ?? 0;
    drag.current = null;
    if (d > 90) onClose(); else setDy(0);
  };

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet" ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
        style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}>
        <div className="grab" aria-hidden="true" />
        {children}
      </div>
    </>
  );
}

// ---- Toasts: a dark pill for 3 s, optionally with Undo ----
type ToastState = { id: number; text: string; action?: { label: string; run: () => void } } | null;
let toast: ToastState = null;
let toastId = 0;
const toastListeners = new Set<() => void>();
export function showToast(text: string, action?: { label: string; run: () => void }) {
  const id = ++toastId;
  toast = { id, text, action };
  toastListeners.forEach(l => l());
  setTimeout(() => { if (toast?.id === id) { toast = null; toastListeners.forEach(l => l()); } }, 3000);
}
function hideToast() { toast = null; toastListeners.forEach(l => l()); }

export function ToastHost({ position }: { position: 'tabs' | 'mini' | 'focus' }) {
  const t = useSyncExternalStore(l => { toastListeners.add(l); return () => { toastListeners.delete(l); }; }, () => toast, () => toast);
  if (!t) return null;
  const cls = 'toast' + (position === 'mini' ? ' high' : position === 'focus' ? ' focus' : '');
  return (
    <div className={cls} role="status">
      <span>{t.text}</span>
      {t.action && <button type="button" onClick={() => { t.action!.run(); hideToast(); }}>{t.action.label}</button>}
    </div>
  );
}
