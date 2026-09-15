import { useEffect, useState } from "react";
import { ArrowRight, Menu, MoonStar, X } from "lucide-react";
import Logo from "./Logo";

const nav = [
  { href: "/#about", label: "About" },
  { href: "/#programs", label: "Programs" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#schedule", label: "Schedule & Fees" },
  { href: "/#policies", label: "Policies" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/#contact", label: "Contact" },
  { href: "/register", label: "Register", featured: true },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const forceSolid = path !== "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  return (
    <header className={`site-header luxury-header ${scrolled || forceSolid ? "is-scrolled" : ""}`}>
      <div className="header-edge header-edge-left" aria-hidden="true">
        <span className="header-crescent"><MoonStar size={24} strokeWidth={1.7} /></span>
        <span className="header-silhouette header-silhouette-left" />
      </div>

      <div className="header-edge header-edge-right" aria-hidden="true">
        <span className="header-lantern">
          <i />
        </span>
      </div>

      <div className="header-gold-line" aria-hidden="true" />

      <div className="container nav-shell">
        <a className="brand-button" href="/" aria-label="EL Hedaya Islamic School home">
          <Logo />
        </a>

        <span className="nav-divider" aria-hidden="true" />

        <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="Main navigation">
          <div className="mobile-nav-head">
            <Logo />
            <button aria-label="Close menu" onClick={() => setOpen(false)}>
              <X size={22} />
            </button>
          </div>

          <div className="mobile-nav-kicker">EL Hedaya Islamic School</div>

          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={item.featured ? "nav-link register-nav" : "nav-link"}
              onClick={() => setOpen(false)}
            >
              <span>{item.label}</span>
              {item.featured && <ArrowRight size={16} aria-hidden="true" />}
            </a>
          ))}

          <div className="mobile-nav-footer">
            <span>Discovering the Deen.</span>
            <strong>Living the Sunnah.</strong>
          </div>
        </nav>

        <button
          className="menu-button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu size={23} />
        </button>
      </div>
    </header>
  );
}
