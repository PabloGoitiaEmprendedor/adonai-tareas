import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface-container-low/95 group-[.toaster]:text-foreground group-[.toaster]:border-white/5 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl overflow-hidden backdrop-blur-xl p-4 flex gap-3 ring-1 ring-black/5 dark:ring-white/5",
          title: "group-[.toast]:text-on-surface group-[.toast]:font-semibold group-[.toast]:text-sm",
          description: "group-[.toast]:text-on-surface-variant group-[.toast]:text-xs group-[.toast]:mt-1",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm",
          cancelButton: "group-[.toast]:bg-surface-container-high group-[.toast]:text-on-surface-variant group-[.toast]:rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-surface-container-highest transition-colors",
          icon: "group-[.toast]:text-primary group-[.toast]:mt-0.5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
