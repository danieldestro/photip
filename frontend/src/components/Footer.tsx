import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { Logo } from './Logo';

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com/photip', Icon: FaInstagram },
  { label: 'TikTok', href: 'https://tiktok.com/@photip', Icon: FaTiktok },
  { label: 'Facebook', href: 'https://facebook.com/photip', Icon: FaFacebook },
  { label: 'X (Twitter)', href: 'https://x.com/photip', Icon: FaXTwitter },
  { label: 'YouTube', href: 'https://youtube.com/@photip', Icon: FaYoutube },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/photip', Icon: FaLinkedin },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="photip-footer">
      <div className="photip-footer__row">
        <div className="photip-footer__brand">
          <Logo background="dark" />
          <p className="photip-footer__tagline">
            Encontre seus melhores momentos.
          </p>
          <p className="photip-footer__tagline photip-footer__tagline--default">
            <strong>Para você:</strong> compre fotos de eventos. <br/>
            <strong>Fotógrafos:</strong> venda fotos de eventos.
          </p>
          <div className="photip-footer__contact">
            <a href="mailto:contato@photip.com" className="photip-footer__link">
              <Mail size={15} strokeWidth={2} aria-hidden="true" />
              contato@photip.com
            </a>
            <span className="photip-footer__link photip-footer__link--static">
              <MapPin size={15} strokeWidth={2} aria-hidden="true" />
              Rua das Avenidas, 1000 — São Paulo, SP
            </span>
          </div>

          <div className="photip-footer__social">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="photip-footer__social-link"
                aria-label={label}
                title={label}
              >
                <Icon size={17} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <nav className="photip-footer__col" aria-label="Mapa do site">
          <h3 className="photip-footer__heading">Navegação</h3>
          <Link to="/" className="photip-footer__link">
            Início
          </Link>
          <Link to="/eventos" className="photip-footer__link">
            Eventos
          </Link>
          <Link to="/evento/favoritas" className="photip-footer__link">
            Favoritas
          </Link>
        </nav>

        <nav className="photip-footer__col" aria-label="Legal">
          <h3 className="photip-footer__heading">Legal</h3>
          <Link to="/termos" className="photip-footer__link">
            Termos de Uso
          </Link>
          <Link to="/privacidade" className="photip-footer__link">
            Política de Privacidade
          </Link>
          <Link to="/cookies" className="photip-footer__link">
            Política de Cookies
          </Link>
        </nav>
      </div>

      <div className="photip-footer__bottom">
        <span>© {year} Photip Participações · CNPJ 00.000.0000/0000-00</span>
        <span>v{__APP_VERSION__}</span>
      </div>
    </footer>
  );
}
