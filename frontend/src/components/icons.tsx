import { Calendar, Camera, MapPin } from 'lucide-react';

interface IconProps {
  className?: string;
  size?: number;
}

export function PinIcon({ className, size = 13 }: IconProps) {
  return <MapPin className={className} size={size} strokeWidth={2} aria-hidden="true" />;
}

export function CalendarIcon({ className, size = 13 }: IconProps) {
  return <Calendar className={className} size={size} strokeWidth={2} aria-hidden="true" />;
}

export function CameraIcon({ className, size = 13 }: IconProps) {
  return <Camera className={className} size={size} strokeWidth={2} aria-hidden="true" />;
}
