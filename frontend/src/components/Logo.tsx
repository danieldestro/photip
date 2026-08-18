interface LogoProps {
  // "light": logo.png — navy wordmark, for light/white backgrounds (default).
  // "dark": logo2.png — white wordmark on its own navy backdrop, for dark/navy backgrounds.
  background?: 'light' | 'dark';
  className?: string;
}

export function Logo({ background = 'light', className }: LogoProps) {
  return (
    <img
      src={background === 'dark' ? '/logo2.png' : '/logo.png'}
      alt="photip"
      className={`photip-logo${className ? ` ${className}` : ''}`}
    />
  );
}
