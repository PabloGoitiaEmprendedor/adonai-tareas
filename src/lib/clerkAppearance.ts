import { esES } from "@clerk/localizations";

export const adonaiClerkLocalization = {
  ...esES,
  dividerText: "o",
  formButtonPrimary: "Continuar",
  formButtonPrimary__verify: "Verificar",
  formFieldLabel__emailAddress: "Correo electronico",
  formFieldLabel__password: "Contrasena",
  formFieldInputPlaceholder__emailAddress: "tu@email.com",
  socialButtonsBlockButton: "Continuar con {{provider|titleize}}",
  signIn: {
    ...esES.signIn,
    start: {
      ...esES.signIn?.start,
      title: "Entrar a Adonai",
      subtitle: "Usa tu correo o una cuenta conectada para continuar.",
      titleCombined: "Entrar a Adonai",
      subtitleCombined: "Usa tu correo o una cuenta conectada para continuar.",
      actionText: "No tienes cuenta?",
      actionLink: "Crear cuenta",
    },
    emailCode: {
      ...esES.signIn?.emailCode,
      title: "Revisa tu correo",
      subtitle: "Enviamos un codigo para entrar a Adonai.",
      formTitle: "Codigo de verificacion",
      resendButton: "Reenviar codigo",
    },
  },
  signUp: {
    ...esES.signUp,
    start: {
      ...esES.signUp?.start,
      title: "Crear cuenta en Adonai",
      subtitle: "Guarda tus tareas y sincroniza tu progreso.",
      titleCombined: "Crear cuenta en Adonai",
      subtitleCombined: "Guarda tus tareas y sincroniza tu progreso.",
      actionText: "Ya tienes cuenta?",
      actionLink: "Entrar",
    },
    emailCode: {
      ...esES.signUp?.emailCode,
      title: "Verifica tu correo",
      subtitle: "Enviamos un codigo para activar tu cuenta.",
      formTitle: "Codigo de verificacion",
      formSubtitle: "Escribe el codigo que recibiste por correo.",
      resendButton: "Reenviar codigo",
    },
  },
};

export const adonaiClerkAppearance = {
  variables: {
    colorPrimary: "#5B7CFA",
    colorBackground: "transparent",
    colorForeground: "#151820",
    colorInputBackground: "#F8FAFC",
    colorInputText: "#151820",
    colorText: "#151820",
    colorTextSecondary: "#667085",
    borderRadius: "14px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  elements: {
    rootBox: "adonai-clerk-root",
    cardBox: "adonai-clerk-card-box",
    card: "adonai-clerk-card",
    header: "adonai-clerk-hidden",
    logoBox: "adonai-clerk-hidden",
    footer: "adonai-clerk-hidden",
    footerAction: "adonai-clerk-hidden",
    footerPages: "adonai-clerk-hidden",
  },
};
