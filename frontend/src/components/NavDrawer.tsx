import { useNavigate } from 'react-router-dom';
import { getLastEventId } from '../lib/lastEvent';

interface NavDrawerProps {
  onClose: () => void;
}

export function NavDrawer({ onClose }: NavDrawerProps) {
  const navigate = useNavigate();
  const lastEventId = getLastEventId();

  function go(path: string) {
    onClose();
    navigate(path);
  }

  return (
    <>
      <div className="nav-drawer__overlay" onClick={onClose} />
      <div className="nav-drawer">
        <div className="nav-drawer__logo">POTOF</div>
        <button type="button" className="nav-drawer__item" onClick={() => go('/')}>
          Início
        </button>
        <button type="button" className="nav-drawer__item" onClick={() => go('/eventos')}>
          Todos os eventos
        </button>
        <button
          type="button"
          className="nav-drawer__item"
          disabled={!lastEventId}
          onClick={() => lastEventId && go(`/evento/${lastEventId}/favoritas`)}
        >
          Minhas favoritas
        </button>
        <div className="nav-drawer__footer">v{__APP_VERSION__}</div>
      </div>
    </>
  );
}
