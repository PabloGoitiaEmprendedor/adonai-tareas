import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  alt?: string;
};

export function BrandLogo({ className, imageClassName, alt = "Adonai" }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center justify-center overflow-hidden rounded-full", className)}>
      <img
        src="./logo.png"
        alt={alt}
        className={cn("h-full w-full object-contain", imageClassName)}
        draggable={false}
      />
    </span>
  );
}

export default BrandLogo;
