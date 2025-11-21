// Utility para formatear tiempo en formato tradicional
export const formatTiempoTradicional = (minutosTotales: number): string => {
  if (!minutosTotales || minutosTotales <= 0) {
    return '0 minutos';
  }

  const dias = Math.floor(minutosTotales / 1440); // 1440 minutos = 1 día
  const horasRestantes = Math.floor((minutosTotales % 1440) / 60);
  const minutosRestantes = Math.floor(minutosTotales % 60);

  const partes: string[] = [];

  if (dias > 0) {
    partes.push(`${dias} día${dias > 1 ? 's' : ''}`);
  }

  if (horasRestantes > 0) {
    partes.push(`${horasRestantes} hora${horasRestantes > 1 ? 's' : ''}`);
  }

  if (minutosRestantes > 0 || partes.length === 0) {
    partes.push(`${minutosRestantes} minuto${minutosRestantes > 1 ? 's' : ''}`);
  }

  return partes.join(', ');
};

// Convertir horas decimales a formato tradicional
export const formatHorasATradicional = (horasDecimales: number): string => {
  if (!horasDecimales || horasDecimales <= 0) {
    return '0 minutos';
  }

  const minutosTotales = Math.floor(horasDecimales * 60);
  return formatTiempoTradicional(minutosTotales);
};