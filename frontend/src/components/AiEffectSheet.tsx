import { useState } from 'react';
import { X } from 'lucide-react';
import { generatePhotoAiEffect, type AiEffect } from '../api/client';
import type { Photo } from '../types';

const EFFECT_OPTIONS: Array<{ value: AiEffect; label: string; icon: string }> = [
  { value: 'remove_people', label: 'Remover pessoas', icon: '🧍‍♂️🚫' },
  { value: 'superhero', label: 'Super-herói', icon: '🦸' },
  { value: 'military', label: 'Militar', icon: '🎖️' },
  { value: 'artistic', label: 'Efeito visual', icon: '✨' },
  { value: 'fantasy', label: 'Fantasia', icon: '🧚' },
];

type SheetState =
  | { step: 'options' }
  | { step: 'loading' }
  | { step: 'result'; dataUrl: string }
  | { step: 'error'; message: string };

interface AiEffectSheetProps {
  photo: Photo;
  onClose: () => void;
}

export function AiEffectSheet({ photo, onClose }: AiEffectSheetProps) {
  const [state, setState] = useState<SheetState>({ step: 'options' });

  async function runEffect(effect: AiEffect) {
    setState({ step: 'loading' });
    try {
      const result = await generatePhotoAiEffect(photo.thumbs.g, effect);
      setState({ step: 'result', dataUrl: `data:${result.mimeType};base64,${result.base64}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível gerar o efeito agora.';
      setState({ step: 'error', message });
    }
  }

  return (
    <div className="ai-effect-sheet__overlay" onClick={onClose}>
      <div className="ai-effect-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ai-effect-sheet__header">
          <span>Efeitos com IA</span>
          <button type="button" className="ai-effect-sheet__close" onClick={onClose} aria-label="Fechar">
            <X size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        {state.step === 'options' && (
          <div className="ai-effect-sheet__options">
            {EFFECT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className="ai-effect-sheet__option"
                onClick={() => runEffect(option.value)}
              >
                <span className="ai-effect-sheet__option-icon" aria-hidden="true">
                  {option.icon}
                </span>
                {option.label}
              </button>
            ))}
          </div>
        )}

        {state.step === 'loading' && (
          <div className="ai-effect-sheet__status">
            <div className="ai-effect-sheet__spinner" />
            <p>Gerando sua foto com IA…</p>
          </div>
        )}

        {state.step === 'result' && (
          <div className="ai-effect-sheet__result">
            <img src={state.dataUrl} alt="Foto gerada por IA" />
            <div className="ai-effect-sheet__result-actions">
              <a className="photip-btn photip-btn--primary" href={state.dataUrl} download="photip-ia.png">
                Baixar
              </a>
              <button
                type="button"
                className="photip-btn photip-btn--outline"
                onClick={() => setState({ step: 'options' })}
              >
                Tentar outro efeito
              </button>
            </div>
          </div>
        )}

        {state.step === 'error' && (
          <div className="ai-effect-sheet__status">
            <p className="ai-effect-sheet__error">{state.message}</p>
            <button
              type="button"
              className="photip-btn photip-btn--outline"
              onClick={() => setState({ step: 'options' })}
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
