import { AppLogo } from './AppLogo';

export function TitleBar() {
  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <AppLogo size={17} compact />
        <span className="titlebar-text">MRF Generator — Material Request Form Tool</span>
      </div>
      <div className="titlebar-buttons">
        <button className="win-btn" title="Minimize (decorative in web version)">─</button>
        <button className="win-btn" title="Maximize (decorative in web version)">❐</button>
        <button className="win-btn close" title="Close (decorative in web version)">✕</button>
      </div>
    </div>
  );
}
