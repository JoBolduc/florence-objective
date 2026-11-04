export const strings = {
  tabs: {
    today: 'Aujourd’hui',
    history: 'Historique',
    settings: 'Réglages',
  },
  error: {
    title: 'Une erreur est survenue',
    message: 'L’application n’a pas pu afficher cet écran.',
    retry: 'Réessayer',
  },
  notFound: {
    title: 'Page introuvable',
    message: 'Cette page n’existe pas.',
    backHome: 'Retour à l’accueil',
  },
  today: {
    reminder: 'Un appui par séquence. Seulement les signes spontanés.',
    loading: 'Chargement…',
    saveFailed: 'L’enregistrement a échoué. Réessayez.',
    loadFailed: 'Impossible de charger les signes.',
    counterText: (count: number, target: number) => `${count} / ${target}`,
    counter: (count: number, target: number) => `${count} signes sur ${target} aujourd’hui`,
    celebration: 'Bravo ! 10 signes aujourd’hui 🎉',
    logType: (label: string, count: number) =>
      count > 0 ? `Enregistrer : ${label}, ${count} aujourd’hui` : `Enregistrer : ${label}`,
  },
};
