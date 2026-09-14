import { useState } from 'react';
import { Lightbulb, Video, Image as ImageIcon, Keyboard, Info, AlertCircle, X } from 'lucide-react';
import ReactMarkdown from "react-markdown";

/**
 * Composant Hint 
 * 
 * Types disponibles:
 * - "tip" (défaut): tooltip texte simple avec icône ampoule
 * - "video": ouvre une vidéo (YouTube ou fichier MP4/WebM)
 * - "image": affiche une image en grand
 * - "shortcut": raccourci clavier (icône clavier)
 * - "info": information supplémentaire (icône i)
 * - "warning": avertissement (icône alerte)
 */

const ICON_MAP = {
  tip: Lightbulb,
  video: Video,
  image: ImageIcon,
  shortcut: Keyboard,
  info: Info,
  warning: AlertCircle,
};

const COLOR_MAP = {
  tip: 'orange',
  video: 'purple',
  image: 'green',
  shortcut: 'blue',
  info: 'gray',
  warning: 'red',
};

export default function Hint({
  type = 'tip',
  label = null,
  iconPosition = 'after', // 'before' | 'after'
  children
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const IconComponent = ICON_MAP[type] || Lightbulb;
  const color = COLOR_MAP[type] || 'orange';

  // Pour les types riches (video, image), utiliser un modal
  const isRichContent = ['video', 'image'].includes(type);

  const handleClick = (e) => {
    if (isRichContent) {
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  // Détecte si c'est une URL YouTube
  const isYouTube = (url) => {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
  };

  // Convertit une URL YouTube en embed
  const getYouTubeEmbedUrl = (url) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  // Rendu du contenu du modal
  const renderModalContent = () => {
    if (type === 'video') {
      const url = children;
      if (isYouTube(url)) {
        const embedUrl = getYouTubeEmbedUrl(url);
        return (
          <iframe
            src={embedUrl}
            className="hint-video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      } else {
        return (
          <video controls className="hint-video" autoPlay>
            <source src={url} type="video/mp4" />
            <source src={url} type="video/webm" />
            Votre navigateur ne supporte pas la vidéo.
          </video>
        );
      }
    } else if (type === 'image') {
      return <img src={children} alt="Contenu du hint" className="hint-image" />;
    }
    return null;
  };

  return (
    <>
      <span className={`hint-wrapper hint-${type}`}>
        {label ? (
          // Version avec label cliquable
          <span
            className={`hint-label hint-label-${color}`}
            onClick={handleClick}
            onMouseEnter={() => !isRichContent && setIsVisible(true)}
            onMouseLeave={() => !isRichContent && setIsVisible(false)}
            onFocus={() => !isRichContent && setIsVisible(true)}
            onBlur={() => !isRichContent && setIsVisible(false)}
            tabIndex={0}
            role="button"
            aria-label={`Afficher ${type === 'video' ? 'la vidéo' : type === 'image' ? "l'image" : "l'astuce"}`}
          >
            {iconPosition === 'before' && <IconComponent size={14} className="hint-label-icon" />}
            <span className="hint-label-text">
              <ReactMarkdown components={{ p: ({ children }) => <span>{children}</span> }}>
                {label}
              </ReactMarkdown>
            </span>
            {iconPosition === 'after' && <IconComponent size={14} className="hint-label-icon" />}
          </span>
        ) : (
          // Version icône seule (comportement original)
          <span
            className={`hint-icon hint-icon-${color}`}
            onClick={handleClick}
            onMouseEnter={() => !isRichContent && setIsVisible(true)}
            onMouseLeave={() => !isRichContent && setIsVisible(false)}
            onFocus={() => !isRichContent && setIsVisible(true)}
            onBlur={() => !isRichContent && setIsVisible(false)}
            tabIndex={0}
            role="button"
            aria-label={`Afficher ${type === 'video' ? 'la vidéo' : type === 'image' ? "l'image" : "l'astuce"}`}
          >
            <IconComponent size={16} />
          </span>
        )}

        {/* Tooltip pour les types non-riches */}
        {!isRichContent && isVisible && (
          <span className="hint-tooltip" role="tooltip">
            {children}
          </span>
        )}
      </span>

      {/* Modal pour vidéo/image */}
      {isRichContent && isModalOpen && (
        <div className="hint-modal-overlay" onClick={handleClose}>
          <div className="hint-modal" onClick={(e) => e.stopPropagation()}>
            <button className="hint-modal-close" onClick={handleClose} aria-label="Fermer">
              <X size={24} />
            </button>
            {renderModalContent()}
          </div>
        </div>
      )}

      <style jsx>{`
        .hint-wrapper {
          position: relative;
          display: inline-block;
          margin: 0;
        }

        /* Icône seule */
        .hint-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.2em;
          height: 1.2em;
          vertical-align: middle;
          cursor: help;
          transition: all 0.2s ease;
          border-radius: 50%;
          outline: none;
        }

        .hint-icon-orange { color: var(--sl-color-orange-high); }
        .hint-icon-purple { color: var(--sl-color-purple-high); }
        .hint-icon-green { color: var(--sl-color-green-high); }
        .hint-icon-blue { color: var(--sl-color-blue-high); }
        .hint-icon-gray { color: var(--sl-color-gray-3); }
        .hint-icon-red { color: var(--sl-color-red-high); }

        .hint-icon:hover,
        .hint-icon:focus {
          transform: scale(1.15);
        }

        .hint-icon-orange:hover,
        .hint-icon-orange:focus {
          color: var(--sl-color-orange);
          background-color: var(--sl-color-orange-low);
        }

        .hint-icon-purple:hover,
        .hint-icon-purple:focus {
          color: var(--sl-color-purple);
          background-color: var(--sl-color-purple-low);
        }

        .hint-icon-green:hover,
        .hint-icon-green:focus {
          color: var(--sl-color-green);
          background-color: var(--sl-color-green-low);
        }

        .hint-icon-blue:hover,
        .hint-icon-blue:focus {
          color: var(--sl-color-blue);
          background-color: var(--sl-color-blue-low);
        }

        .hint-icon-red:hover,
        .hint-icon-red:focus {
          color: var(--sl-color-red);
          background-color: var(--sl-color-red-low);
        }

        .hint-icon:focus {
          box-shadow: 0 0 0 2px currentColor;
        }

        /* Label cliquable */
        .hint-label {
          display: inline-flex;
          align-items: center;
          gap: 0.25em;
          padding: 0.15em;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          outline: none;
          border: 1px solid transparent;
        }

        .hint-label-icon {
          flex-shrink: 0;
        }

        .hint-label-text {
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 2px;
        }

        .hint-label-orange {
          color: var(--sl-color-orange-high);
        }

        .hint-label-purple {
          color: var(--sl-color-purple-high);
        }

        .hint-label-green {
          color: var(--sl-color-green-high);
        }

        .hint-label-blue {
          color: var(--sl-color-blue-high);
        }

        .hint-label-red {
          color: var(--sl-color-red-high);
        }

        .hint-label:hover {
          background-color: var(--sl-color-gray-6);
          border-color: var(--sl-color-gray-5);
        }

        .hint-label:focus {
          box-shadow: 0 0 0 2px var(--sl-color-accent);
        }

        /* Tooltip */
        .hint-tooltip {
          position: absolute;
          bottom: calc(100% + 0.5rem);
          left: 50%;
          transform: translateX(-50%);
          padding: 0.5rem 0.75rem;
          background: var(--sl-color-bg-nav);
          color: var(--sl-color-text);
          border: 1px solid var(--sl-color-gray-5);
          border-radius: 0.375rem;
          font-size: 0.875rem;
          line-height: 1.4;
          white-space: nowrap;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
                      0 2px 4px -1px rgba(0, 0, 0, 0.06);
          z-index: 1000;
          pointer-events: none;
          animation: fadeIn 0.2s ease;
        }

        .hint-tooltip::before {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 0.375rem solid transparent;
          border-top-color: var(--sl-color-bg-nav);
        }

        .hint-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 0.5rem solid transparent;
          border-top-color: var(--sl-color-gray-5);
          z-index: -1;
        }

        /* Modal */
        .hint-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease;
          padding: 1rem;
        }

        .hint-modal {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          background: var(--sl-color-bg);
          border-radius: 0.5rem;
          padding: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3),
                      0 10px 10px -5px rgba(0, 0, 0, 0.2);
        }

        .hint-modal-close {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: var(--sl-color-bg-nav);
          border: 1px solid var(--sl-color-gray-5);
          border-radius: 0.25rem;
          padding: 0.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          z-index: 1;
        }

        .hint-modal-close:hover {
          background: var(--sl-color-gray-6);
          transform: scale(1.1);
        }

        .hint-video {
          width: 80vw;
          max-width: 1000px;
          aspect-ratio: 16 / 9;
          border-radius: 0.375rem;
        }

        .hint-image {
          max-width: 80vw;
          max-height: 80vh;
          border-radius: 0.375rem;
          object-fit: contain;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-0.25rem);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @media (max-width: 768px) {
          .hint-tooltip {
            white-space: normal;
            max-width: 280px;
            left: 0;
            transform: translateX(0);
          }

          .hint-tooltip::before,
          .hint-tooltip::after {
            left: 1rem;
            transform: translateX(0);
          }

          .hint-video {
            width: 90vw;
          }
        }
      `}</style>
    </>
  );
}
