import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';
import type { Photo } from '../types';

type Status = 'review' | 'processing' | 'success';

function formatBRL(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function CheckoutPage() {
  const { eventId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('review');
  const { clearFavorites } = useFavorites(eventId);

  const state = location.state as { photos?: Photo[]; total?: number; eventName?: string | null } | null;
  const photos = state?.photos ?? [];
  const total = state?.total ?? 0;
  const eventName = state?.eventName ?? null;

  function confirmPayment() {
    setStatus('processing');
    // Simulates payment processing — there's no real payment gateway behind this.
    setTimeout(() => {
      setStatus('success');
      // The purchased photos are exactly this event's current favorites — clear them
      // so they don't linger as "favorited" (and re-purchasable) after checkout.
      clearFavorites();
    }, 1400);
  }

  if (photos.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-page__empty photip-card">
          <p>Nenhuma foto selecionada para compra.</p>
          <button
            type="button"
            className="photip-btn photip-btn--primary"
            onClick={() => navigate(`/evento/${eventId}/favoritas`)}
          >
            Voltar para favoritas
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="checkout-page">
        <div className="checkout-page__success photip-card">
          <div className="checkout-page__check">✓</div>
          <h1 className="checkout-page__title">Compra realizada com sucesso!</h1>
          <p className="checkout-page__subtitle">
            {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
            {eventName ? ` de ${eventName}` : ''} — R$ {formatBRL(total)}
          </p>
          <p className="checkout-page__hint">
            Enviamos os links para download por e-mail. Esta é uma simulação de compra.
          </p>
          <button
            type="button"
            className="photip-btn photip-btn--primary"
            onClick={() => navigate(`/evento/${eventId}`)}
          >
            Voltar para o evento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1 className="checkout-page__title">Finalizar compra</h1>

      <div className="checkout-page__summary photip-card">
        {eventName && <p className="checkout-page__event-name">{eventName}</p>}
        <div className="checkout-page__row">
          <span>
            {photos.length} {photos.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
          </span>
          <span>R$ {formatBRL(total)}</span>
        </div>
        <div className="checkout-page__row checkout-page__row--total">
          <span>Total</span>
          <span>R$ {formatBRL(total)}</span>
        </div>
      </div>

      <div className="checkout-page__payment photip-card">
        <p className="checkout-page__payment-label">Pagamento</p>
        <div className="checkout-page__payment-mock">
          <span>💳</span>
          <span>•••• •••• •••• 4242</span>
        </div>
        <p className="checkout-page__hint">Simulação de pagamento — nenhuma cobrança real será feita.</p>
      </div>

      <button
        type="button"
        className="photip-btn photip-btn--accent checkout-page__cta"
        onClick={confirmPayment}
        disabled={status === 'processing'}
      >
        {status === 'processing' ? 'Processando…' : `Confirmar pagamento — R$ ${formatBRL(total)}`}
      </button>
    </div>
  );
}
