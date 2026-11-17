// Clap de cinéma stylisé, aux couleurs du site.
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="12" width="26" height="16" rx="3" fill="#F5C542" />
      <g transform="rotate(-14 3 12)">
        <rect x="3" y="5" width="26" height="6" rx="2" fill="#F4F1E8" />
        <path d="M8 5h4l-3 6H5zM16 5h4l-3 6h-4zM24 5h4l-3 6h-4z" fill="#0F1014" />
      </g>
      <path d="M14 16.5v7l6-3.5z" fill="#0F1014" />
    </svg>
  );
}
