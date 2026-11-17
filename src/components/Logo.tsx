// Logo Clap & Play (fichier public/logo.webp).
export default function Logo({ size = 44, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.webp" alt="" width={size} height={size} className={className} style={{ width: size, height: size }} />
  );
}
