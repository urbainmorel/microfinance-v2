export const messages = {
  fr: {
    "nav.home": "Accueil",
    "nav.loans": "Mon prêt",
    "nav.operations": "Historiques",
    "nav.profile": "Profil",
    "common.hello": "Bonjour",
    "common.language": "Langue",
    "common.french": "Français",
    "common.english": "English",
    "profile.title": "Profil",
    "profile.resetPin": "Réinitialiser mon code PIN",
    "profile.logout": "Se déconnecter",
    "profile.privacy":
      "Pour exercer vos droits sur vos données, contactez l’administrateur de la microfinance.",
  },
  en: {
    "nav.home": "Home",
    "nav.loans": "My loans",
    "nav.operations": "History",
    "nav.profile": "Profile",
    "common.hello": "Hello",
    "common.language": "Language",
    "common.french": "Français",
    "common.english": "English",
    "profile.title": "Profile",
    "profile.resetPin": "Reset my PIN",
    "profile.logout": "Sign out",
    "profile.privacy": "To exercise your data rights, contact the microfinance administrator.",
  },
} as const;

export type ClientLocale = keyof typeof messages;
export type MessageKey = keyof (typeof messages)["fr"];
