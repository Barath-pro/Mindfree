import { Link } from "react-router-dom";

export default function AuthShell({ title, subtitle, alternateHref, alternateLabel, children }) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__panel">
        <div className="auth-shell__intro">
          <p className="eyebrow">Mindfree</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="auth-shell__card">
          {children}
          <p className="auth-shell__alternate">
            <Link to={alternateHref}>{alternateLabel}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

