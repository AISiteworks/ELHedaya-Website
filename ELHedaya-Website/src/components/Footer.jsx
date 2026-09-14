import Logo from "./Logo";
import { PORTAL_URL } from "../data/content";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-top">
        <div>
          <Logo inverse />
          <p>
            The Sunday School of Clemmons Islamic Center, nurturing knowledge, faith, character,
            and community.
          </p>
        </div>
        <div className="footer-links">
          <span>School</span>
          <a href="/#about">About</a>
          <a href="/#programs">Programs</a>
          <a href="/gallery">Gallery</a>
          <a href="/#policies">Policies</a>
        </div>
        <div className="footer-links">
          <span>Families</span>
          <a href="/register">Register Online</a>
          <a href={PORTAL_URL}>Parent Portal</a>
          <a href="/#newsletter">Newsletter</a>
          <a href="/#contact">Contact</a>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Clemmons Islamic Center</span>
        <span>EL Hedaya Islamic School · Clemmons, NC</span>
      </div>
    </footer>
  );
}
