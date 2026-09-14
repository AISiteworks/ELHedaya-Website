import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ChevronLeft,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { listGalleryImages } from "../services/galleryService";

const PAGE_SIZE = 12;

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [zoom, setZoom] = useState(1);
  const touchStartX = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listGalleryImages({ includeUnpublished: false })
      .then((data) => active && setImages(data))
      .catch((err) => active && setError(err?.message || "The gallery could not be loaded."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedIndex < 0) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") closeViewer();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
      if (event.key === "+" || event.key === "=") setZoom((value) => Math.min(3, value + 0.25));
      if (event.key === "-") setZoom((value) => Math.max(1, value - 0.25));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedIndex, images.length]);

  const visibleImages = useMemo(() => images.slice(0, visibleCount), [images, visibleCount]);
  const selected = selectedIndex >= 0 ? images[selectedIndex] : null;

  const openViewer = (index) => {
    setZoom(1);
    setSelectedIndex(index);
  };

  const closeViewer = () => {
    setZoom(1);
    setSelectedIndex(-1);
  };

  const showPrevious = () => {
    setZoom(1);
    setSelectedIndex((index) => cycleIndex(index - 1, images.length));
  };

  const showNext = () => {
    setZoom(1);
    setSelectedIndex((index) => cycleIndex(index + 1, images.length));
  };

  const onTouchStart = (event) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event) => {
    if (touchStartX.current == null || zoom > 1) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 55) return;
    if (delta > 0) showPrevious();
    else showNext();
  };

  return (
    <section className="gallery-page">
      <div className="gallery-page-hero">
        <div className="gallery-page-pattern" aria-hidden="true" />
        <div className="container gallery-page-hero-inner">
          <a className="gallery-back-link" href="/"><ChevronLeft size={17} /> Back to school home</a>
          <span className="kicker">EL Hedaya Picture Gallery</span>
          <h1>Moments of learning, friendship, and community.</h1>
          <p>
            Browse school memories in a distraction-free gallery. Select any picture to open the
            fullscreen viewer, zoom in, or move through the collection.
          </p>
          {!loading && images.length > 0 && (
            <span className="gallery-total"><Camera size={16} /> {images.length} {images.length === 1 ? "photo" : "photos"}</span>
          )}
        </div>
      </div>

      <div className="gallery-page-content">
        <div className="container">
          {error && <div className="gallery-alert gallery-alert-error">{error}</div>}

          {loading ? (
            <div className="gallery-loading gallery-page-loading">
              <Loader2 className="spin" size={26} /> Loading school pictures…
            </div>
          ) : images.length === 0 ? (
            <div className="gallery-empty gallery-page-empty">
              <div className="gallery-empty-icon"><Camera size={30} /></div>
              <span>Picture Gallery</span>
              <h3>School memories are coming soon.</h3>
              <p>Photos from EL Hedaya classes, projects, and community activities will appear here.</p>
            </div>
          ) : (
            <>
              <div className="photo-grid gallery-page-grid">
                {visibleImages.map((image, index) => (
                  <button
                    className={`photo-card photo-card-${(index % 7) + 1}`}
                    key={image.id}
                    onClick={() => openViewer(index)}
                    aria-label={`Open ${image.title || `gallery photo ${index + 1}`}`}
                  >
                    <img
                      src={image.image_url}
                      alt={image.title || image.caption || "EL Hedaya school gallery"}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="photo-shade" />
                    <span className="photo-open"><Maximize2 size={18} /></span>
                    {(image.title || image.caption) && (
                      <span className="photo-caption">
                        {image.title && <strong>{image.title}</strong>}
                        {image.caption && <small>{image.caption}</small>}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {visibleCount < images.length && (
                <div className="gallery-load-more-wrap">
                  <button
                    className="button button-secondary gallery-load-more"
                    onClick={() => setVisibleCount((count) => Math.min(images.length, count + PAGE_SIZE))}
                  >
                    Load More Photos
                    <span>{Math.min(images.length - visibleCount, PAGE_SIZE)} more</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selected && (
        <div
          className="lightbox gallery-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photo viewer"
          onMouseDown={closeViewer}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="gallery-viewer-topbar" onMouseDown={(event) => event.stopPropagation()}>
            <span>{selectedIndex + 1} / {images.length}</span>
            <div className="gallery-zoom-controls">
              <button onClick={() => setZoom((value) => Math.max(1, value - 0.25))} disabled={zoom <= 1} aria-label="Zoom out">
                <Minus size={18} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((value) => Math.min(3, value + 0.25))} disabled={zoom >= 3} aria-label="Zoom in">
                <Plus size={18} />
              </button>
              <button onClick={closeViewer} aria-label="Close photo viewer"><X size={21} /></button>
            </div>
          </div>

          {images.length > 1 && (
            <>
              <button className="lightbox-nav lightbox-prev" onMouseDown={(e) => e.stopPropagation()} onClick={showPrevious} aria-label="Previous photo">
                <ArrowLeft size={23} />
              </button>
              <button className="lightbox-nav lightbox-next" onMouseDown={(e) => e.stopPropagation()} onClick={showNext} aria-label="Next photo">
                <ArrowRight size={23} />
              </button>
            </>
          )}

          <figure className="lightbox-card gallery-viewer-card" onMouseDown={(event) => event.stopPropagation()}>
            <div className={`gallery-viewer-image-shell ${zoom > 1 ? "is-zoomed" : ""}`}>
              <img
                src={selected.image_url}
                alt={selected.title || selected.caption || "EL Hedaya school gallery"}
                style={{ transform: `scale(${zoom})` }}
                draggable="false"
              />
            </div>
            {(selected.title || selected.caption) && (
              <figcaption>
                {selected.title && <strong>{selected.title}</strong>}
                {selected.caption && <span>{selected.caption}</span>}
              </figcaption>
            )}
          </figure>

          <div className="gallery-swipe-hint" onMouseDown={(event) => event.stopPropagation()}>
            Swipe or use arrow keys to browse
          </div>
        </div>
      )}
    </section>
  );
}

function cycleIndex(index, length) {
  if (!length) return -1;
  if (index < 0) return length - 1;
  if (index >= length) return 0;
  return index;
}
