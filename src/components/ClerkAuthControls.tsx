import { LogIn, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { Show, UserButton } from "@clerk/react";
import { hasClerkConfig } from "@/lib/clerkConfig";

interface ClerkAuthControlsProps {
  mobile?: boolean;
  onAction?: () => void;
}

export function ClerkAuthControls({ mobile = false, onAction }: ClerkAuthControlsProps) {
  if (!hasClerkConfig) {
    return null;
  }

  const signInClassName = mobile
    ? "inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#151820] transition hover:bg-white/90"
    : "inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-[#151820] transition hover:bg-white/88";

  const signUpClassName = mobile
    ? "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5B7CFA] px-5 py-3 text-sm font-black text-white transition hover:bg-[#4F6EE8]"
    : "inline-flex items-center gap-1.5 rounded-full bg-[#5B7CFA] px-4 py-2 text-xs font-black text-white transition hover:bg-[#4F6EE8]";

  return (
    <>
      <Show when="signed-out">
        <Link to="/auth" onClick={onAction} className={signInClassName}>
          <LogIn className={mobile ? "h-4 w-4" : "h-3.5 w-3.5"} />
          Entrar
        </Link>
        <Link to="/auth?mode=signup" onClick={onAction} className={signUpClassName}>
          <UserPlus className={mobile ? "h-4 w-4" : "h-3.5 w-3.5"} />
          Crear cuenta
        </Link>
      </Show>
      <Show when="signed-in">
        <div className={mobile ? "flex justify-center py-2" : "flex items-center"}>
          <UserButton afterSignOutUrl="/" />
        </div>
      </Show>
    </>
  );
}
