interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  return <div className="photip-toast">{message}</div>;
}
