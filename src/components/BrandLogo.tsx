import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  alt?: string;
};

export function BrandLogo({ className, imageClassName, alt = "Adonai" }: BrandLogoProps) {
  const logoSrc = `${import.meta.env.BASE_URL || ''}logo.png`;

  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", className)}>
      <img
        src={logoSrc}
        alt={alt}
        className={cn("h-full w-full object-contain", imageClassName)}
        draggable={false}
        onError={(event) => {
          const img = event.currentTarget;
          if (img.dataset.fallbackApplied === 'true') return;
          img.dataset.fallbackApplied = 'true';
          img.src = '/logo.png';
        }}
      />
    </span>
  );
}

export default BrandLogo;
