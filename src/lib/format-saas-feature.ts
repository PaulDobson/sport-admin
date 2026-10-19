export function formatSaasFeature(feature: string): string {
  switch (feature) {
    case "reports": return "Reportes";
    case "offline": return "Modo sin conexión";
    case "realtime": return "Tiempo real";
    case "push": return "Notificaciones push";
    default: return feature;
  }
}
