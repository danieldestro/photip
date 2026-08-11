import { History, Pencil, RefreshCw } from 'lucide-react';

interface IconProps {
  className?: string;
  size?: number;
}

export function SyncIcon({ className, size = 16 }: IconProps) {
  return <RefreshCw className={className} size={size} strokeWidth={2} aria-hidden="true" />;
}

// History's clock-with-arrow face reads as "full/historical" sync next to SyncIcon's
// plain refresh arrows for "incremental".
export function SyncFullIcon({ className, size = 16 }: IconProps) {
  return <History className={className} size={size} strokeWidth={2} aria-hidden="true" />;
}

export function EditIcon({ className, size = 16 }: IconProps) {
  return <Pencil className={className} size={size} strokeWidth={2} aria-hidden="true" />;
}
