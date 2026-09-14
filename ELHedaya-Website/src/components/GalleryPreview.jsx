import { useEffect, useState } from "react";
import { ArrowRight, Maximize2, Sparkles } from "lucide-react";
import { listGalleryImages } from "../services/galleryService";
import officialLogo from "../assets/el-hedaya-official-logo.png";

export default function GalleryPreview() {
  const [featuredPhoto, setFeaturedPhoto] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadRandomGalleryPhoto() {
      try {
        const photos = await listGalleryImages();
        if (!active || !photos.length) return;

        const randomIndex = Math.floor(Math.random() * photos.length);
        setFeaturedPhoto(photos[randomIndex]);
      } catch (error) {
        console.warn("Homepage gallery preview could not load:", error);
      }
    }

    loadRandomGalleryPhoto();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="section gallery-preview-section" aria-labelledby="gallery-preview-title">
      <div className="container gallery-preview-card">
        <div className="gallery-preview-art">
          <span className="gallery-preview-orbit gallery-preview-orbit-one" aria-hidden="true" />
          <span className="gallery-preview-orbit gallery-preview-orbit-two" aria-hidden="true" />

          <div className={`gallery-preview-photo-frame ${featuredPhoto ? "has-photo" : "is-fallback"}`}>
            <img
              src={featuredPhoto?.image_url || officialLogo}
              alt={
                featuredPhoto
                  ? featuredPhoto.title || "A moment from EL Hedaya Islamic School"
                  : "EL Hedaya Islamic School"
              }
              loading="lazy"
            />
            {featuredPhoto && (
              <span className="gallery-preview-photo-label">From our gallery</span>
            )}
          </div>

          <span className="gallery-preview-chip chip-one"><Sparkles size={15} /> Classroom moments</span>
          <span className="gallery-preview-chip chip-two"><Maximize2 size={15} /> Fullscreen viewing</span>
        </div>

        <div className="gallery-preview-copy">
          <span className="kicker">Life at EL Hedaya</span>
          <h2 id="gallery-preview-title">A separate home for school memories.</h2>
          <p>
            Visit the picture gallery to explore classroom projects, celebrations, friendships,
            and community moments without crowding the main school website.
          </p>
          <a className="button button-gold gallery-preview-button" href="/gallery">
            View Picture Gallery <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}
