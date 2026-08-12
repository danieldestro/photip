interface LegalPageProps {
  title: string;
}

export function LegalPage({ title }: LegalPageProps) {
  return (
    <div className="legal-page">
      <h1>{title}</h1>
      <p className="legal-page__placeholder">Conteúdo em breve.</p>
    </div>
  );
}
