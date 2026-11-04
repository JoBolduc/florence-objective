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
  // Temporary (E0-S2): remove with the update check in E1-S2.
  updateCheck: {
    title: 'Test de mise à jour',
    buildVersion: (version: string | null) => `Version de build : ${version ?? '?'}`,
    openedAt: (time: string) => `Ouvert à ${time}`,
    loading: '…',
    failed: 'Impossible d’accéder au compteur.',
    increment: '+1',
    incrementLabel: 'Ajouter 1 au compteur',
  },
};
