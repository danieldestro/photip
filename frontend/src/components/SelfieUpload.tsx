import { useRef, useState, type ChangeEvent } from 'react';

interface SelfieUploadProps {
  onSearch: (file: File) => Promise<void>;
  loading: boolean;
}

export function SelfieUpload({ onSearch, loading }: SelfieUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!selectedFile) return;
    await onSearch(selectedFile);
  }

  return (
    <div className="selfie-upload photip-card">
      <div className="selfie-upload__avatar">
        {preview ? (
          <img src={preview} alt="Prévia da selfie" />
        ) : (
          <div className="selfie-upload__avatar-placeholder" />
        )}
      </div>

      <h2 className="selfie-upload__title">Encontre suas fotos</h2>
      <p className="selfie-upload__hint">
        Envie uma selfie de rosto e usaremos reconhecimento facial para localizar automaticamente
        todas as suas fotos deste evento.
      </p>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        hidden
      />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />

      <div className="selfie-upload__actions">
        <button
          type="button"
          className="photip-btn photip-btn--outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={loading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 8h3l2-2h6l2 2h3v11H4V8Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="2" />
          </svg>
          Tirar foto
        </button>
        <button
          type="button"
          className="photip-btn photip-btn--outline"
          onClick={() => galleryInputRef.current?.click()}
          disabled={loading}
        >
          {preview ? 'Trocar foto' : 'Enviar foto'}
        </button>
      </div>

      <button
        type="button"
        className="photip-btn photip-btn--accent selfie-upload__submit"
        onClick={handleSubmit}
        disabled={!selectedFile || loading}
      >
        {loading ? 'Buscando...' : 'Buscar minhas fotos'}
      </button>

      <p className="selfie-upload__disclaimer">
        Ao prosseguir, você aceita nossa política de privacidade e o uso da sua imagem para
        encontrar suas fotos.
      </p>
    </div>
  );
}
