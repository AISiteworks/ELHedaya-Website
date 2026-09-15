import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";

const nav = [
  { href: "/#about", label: "About" },
  { href: "/#programs", label: "Programs" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#schedule", label: "Schedule & Fees" },
  { href: "/#policies", label: "Policies" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/#contact", label: "Contact" },
  { href: "/register", label: "Register" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const forceSolid = window.location.pathname.replace(/\/$/, "") !== "" && window.location.pathname.replace(/\/$/, "") !== "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled || forceSolid ? "is-scrolled" : ""}`}>
      <div className="container nav-shell">
        <a className="brand-button" href="/" aria-label="EL Hedaya home">
          <Logo />
        </a>

        <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="Main navigation">
          <div className="mobile-nav-head">
            <Logo />
            <button aria-label="Close menu" onClick={() => setOpen(false)}><X size={22} /></button>
          </div>
          {nav.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>
          ))}
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
