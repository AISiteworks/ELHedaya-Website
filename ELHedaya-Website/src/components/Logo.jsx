import officialLogo from "../assets/el-hedaya-official-logo.png";

export default function Logo({ inverse = false }) {
  return (
    <div className={`logo official-logo ${inverse ? "logo-inverse" : ""}`}>
      <img
        className="official-logo-image"
        src={officialLogo}
        alt="EL Hedaya Islamic School, Clemmons Islamic Center"
      />
    </div>
  );
}
