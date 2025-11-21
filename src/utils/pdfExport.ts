import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface IncidenciaData {
  id: string;
  titulo: string;
  descripcion: string;
  observaciones: string | null;
  area_id: string;
  clasificacion_id: string;
  prioridad: string;
  reportado_por: string;
  fecha_incidencia: string;
  created_at: string;
  updated_at: string;
  areas?: {
    nombre: string;
    descripcion: string | null;
  };
  clasificaciones?: {
    nombre: string;
    color: string | null;
  };
  imagenes_incidencias?: Array<{
    id: string;
    url_imagen: string;
    nombre_archivo: string;
  }>;
}

export const exportToPDF = (incidencias: IncidenciaData[], filtros: any) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  const footerHeight = 20;
  const headerHeight = 35;

  // Colores corporativos (ajusta a tu branding)
  const colors = {
    primary: [20, 53, 147] as [number, number, number],      // Azul corporativo
    secondary: [107, 114, 128] as [number, number, number],  // Gris texto
    accent: [59, 130, 246] as [number, number, number],      // Azul acento
    success: [16, 185, 129] as [number, number, number],
    warning: [245, 158, 11] as [number, number, number],
    danger: [239, 68, 68] as [number, number, number],
    light: [248, 250, 252] as [number, number, number],
    white: [255, 255, 255] as [number, number, number]
  };

  const COMPANY_NAME = 'ULTRAVALORES S.A.';
  const SYSTEM_NAME = 'Sistema de Monitoreo Corporativo';

  let currentPage = 1;

  // ===== HEADER =====
  const addHeader = () => {
    // Banda superior
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Logo (placeholder) – puedes reemplazar por doc.addImage(...)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 10, 20, 15, 2, 2, 'S');

    // Nombre de la empresa
    doc.setTextColor(...colors.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(COMPANY_NAME, margin + 25, 16);

    // Nombre del sistema
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(SYSTEM_NAME, margin + 25, 23);

    // Título de la página (lado derecho)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Reporte de incidencias', pageWidth - margin, 18, {
      align: 'right',
    });

    // Línea separadora
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.6);
    doc.line(margin, headerHeight - 2, pageWidth - margin, headerHeight - 2);
  };

  // ===== FOOTER =====
  const addFooter = () => {
    const footerY = pageHeight - 8;

    doc.setDrawColor(...colors.secondary);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFontSize(7);
    doc.setTextColor(...colors.secondary);
    doc.setFont('helvetica', 'normal');

    const fechaGeneracion = format(new Date(), 'dd/MM/yyyy HH:mm', {
      locale: es,
    });

    doc.text(`Generado: ${fechaGeneracion}`, margin, footerY);
    doc.text(`Página ${currentPage}`, pageWidth / 2, footerY, {
      align: 'center',
    });
    doc.text(SYSTEM_NAME, pageWidth - margin, footerY, {
      align: 'right',
    });
  };

  // ===== NUEVA PÁGINA =====
  const addNewPage = () => {
    doc.addPage();
    currentPage++;
    addHeader();
    addFooter();
    return headerHeight + 10;
  };

  // ===== ESPACIO DISPONIBLE =====
  const checkSpace = (currentY: number, neededSpace: number) => {
    if (currentY + neededSpace > pageHeight - footerHeight) {
      return addNewPage();
    }
    return currentY;
  };

  // ===== SECCIÓN CON TÍTULO =====
  const addSection = (title: string, yPosition: number) => {
    yPosition = checkSpace(yPosition, 12);

    doc.setFillColor(...colors.light);
    doc.roundedRect(margin, yPosition - 4, usableWidth, 10, 1.5, 1.5, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 3, yPosition + 3);

    return yPosition + 12;
  };

  // ===== PRIMERA PÁGINA (PORTADA + RESUMEN) =====
  addHeader();
  addFooter();
  let yPosition = headerHeight + 15;

  // Título grande del reporte
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('REPORTE EJECUTIVO DE INCIDENCIAS', pageWidth / 2, yPosition, {
    align: 'center',
  });
  yPosition += 10;

  // Periodo
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const periodoTexto =
    filtros.fechaInicio && filtros.fechaFin
      ? `${format(new Date(filtros.fechaInicio), 'dd/MM/yyyy', {
          locale: es,
        })} - ${format(new Date(filtros.fechaFin), 'dd/MM/yyyy', {
          locale: es,
        })}`
      : 'Todos los períodos';

  doc.text(`Período analizado: ${periodoTexto}`, pageWidth / 2, yPosition, {
    align: 'center',
  });
  yPosition += 15;

  // ===== INFORMACIÓN DEL REPORTE =====
  yPosition = addSection('Información del reporte', yPosition);

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const totalIncidencias = incidencias.length;
  const fechaGeneracion = format(new Date(), 'dd/MM/yyyy HH:mm', {
    locale: es,
  });

  const infoData = [
    ['Total de incidencias registradas', totalIncidencias.toString()],
    ['Fecha de generación', fechaGeneracion],
    ['Período analizado', periodoTexto],
  ];

  autoTable(doc, {
    body: infoData,
    startY: yPosition,
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold', fillColor: colors.light },
      1: { cellWidth: usableWidth - 60 },
    },
    margin: { left: margin, right: margin },
    theme: 'plain',
  });

  yPosition = (doc as any).lastAutoTable.finalY + 12;

  // ===== ESTADÍSTICAS =====
  const stats = {
    total: totalIncidencias,
    porPrioridad: incidencias.reduce((acc: any, inc) => {
      acc[inc.prioridad] = (acc[inc.prioridad] || 0) + 1;
      return acc;
    }, {}),
    conImagenes: incidencias.filter(
      (inc) => inc.imagenes_incidencias && inc.imagenes_incidencias.length > 0
    ).length,
  };

  yPosition = addSection('Análisis estadístico', yPosition);

  const porcentajeConImagenes =
    stats.total > 0 ? ((stats.conImagenes / stats.total) * 100).toFixed(1) : '0.0';

  const statsData = [
    ['Prioridad crítica', (stats.porPrioridad.critica || 0).toString()],
    ['Prioridad alta', (stats.porPrioridad.alta || 0).toString()],
    ['Prioridad media', (stats.porPrioridad.media || 0).toString()],
    ['Prioridad baja', (stats.porPrioridad.baja || 0).toString()],
    [
      'Con evidencia fotográfica',
      `${stats.conImagenes} (${porcentajeConImagenes}%)`,
    ],
  ];

  autoTable(doc, {
    body: statsData,
    startY: yPosition,
    styles: { fontSize: 9, cellPadding: 3 },
    head: [['Indicador', 'Valor']],
    headStyles: {
      fillColor: colors.primary,
      textColor: colors.white,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: usableWidth - 80, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
    theme: 'grid',
  });

  yPosition = (doc as any).lastAutoTable.finalY + 12;

  // ===== RESUMEN TABULAR DE INCIDENCIAS =====
  yPosition = addSection('Resumen tabular de incidencias', yPosition);

  const tableData = incidencias.map((inc) => [
    inc.titulo.length > 35 ? inc.titulo.substring(0, 32) + '...' : inc.titulo,
    inc.areas?.nombre || 'N/A',
    inc.prioridad.toUpperCase(),
    format(new Date(inc.fecha_incidencia), 'dd/MM', { locale: es }),
    (inc.imagenes_incidencias?.length || 0).toString(),
  ]);

  autoTable(doc, {
    head: [['Título', 'Área', 'Prioridad', 'Fecha', 'Imgs']],
    body: tableData,
    startY: yPosition,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: colors.primary,
      textColor: colors.white,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: colors.light,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 50 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data: any) => {
      // Pintar la celda de prioridad como badge de color
      if (data.section === 'body' && data.column.index === 2) {
        const prioridad = (data.cell.raw as string).toLowerCase();
        if (prioridad === 'critica') {
          data.cell.styles.fillColor = colors.danger;
          data.cell.styles.textColor = colors.white;
          data.cell.styles.fontStyle = 'bold';
        } else if (prioridad === 'alta') {
          data.cell.styles.fillColor = colors.warning;
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fontStyle = 'bold';
        } else if (prioridad === 'media') {
          data.cell.styles.fillColor = [229, 231, 235]; // gris claro
          data.cell.styles.textColor = [55, 65, 81];
        } else if (prioridad === 'baja') {
          data.cell.styles.fillColor = colors.success;
          data.cell.styles.textColor = colors.white;
        }
      }
    },
    didDrawPage: () => {
      addFooter();
    },
  });

  // ===== DETALLE DE INCIDENCIAS CRÍTICAS / ALTAS =====
  const incidenciasCriticas = incidencias
    .filter((inc) => inc.prioridad === 'critica' || inc.prioridad === 'alta')
    .slice(0, 10); // Máximo 10 detalladas

  incidenciasCriticas.forEach((inc, index) => {
    let y = addNewPage();

    doc.setFontSize(12);
    doc.setTextColor(...colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(`Incidencia detallada ${index + 1}`, margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const tituloLines = doc.splitTextToSize(
      inc.titulo.toUpperCase(),
      usableWidth
    );
    tituloLines.forEach((line: string) => {
      doc.text(line, margin, y);
      y += 5;
    });
    y += 4;

    const detallesInfo = [
      ['Área', inc.areas?.nombre || 'No especificada'],
      ['Clasificación', inc.clasificaciones?.nombre || 'No clasificada'],
      ['Prioridad', inc.prioridad.toUpperCase()],
      ['Reportado por', inc.reportado_por],
      [
        'Fecha',
        format(new Date(inc.fecha_incidencia), 'dd/MM/yyyy HH:mm', {
          locale: es,
        }),
      ],
      ['Evidencias', `${inc.imagenes_incidencias?.length || 0} archivos`],
    ];

    autoTable(doc, {
      body: detallesInfo,
      startY: y,
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold', fillColor: colors.light },
        1: { cellWidth: usableWidth - 40 },
      },
      margin: { left: margin, right: margin },
      theme: 'grid',
      didDrawPage: () => {
        addFooter();
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Descripción
    y = addSection('Descripción', y);
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    const descripcionLines = doc.splitTextToSize(
      inc.descripcion,
      usableWidth - 10
    );
    descripcionLines.forEach((line: string) => {
      y = checkSpace(y, 5);
      doc.text(line, margin + 5, y);
      y += 4;
    });

    // Observaciones
    if (inc.observaciones) {
      y += 6;
      y = addSection('Observaciones', y);
      const observacionesLines = doc.splitTextToSize(
        inc.observaciones,
        usableWidth - 10
      );
      observacionesLines.forEach((line: string) => {
        y = checkSpace(y, 5);
        doc.text(line, margin + 5, y);
        y += 4;
      });
    }
  });

  // ===== CONCLUSIONES =====
  let yConclusiones = addNewPage();
  yConclusiones = addSection('Conclusiones y recomendaciones', yConclusiones);

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const total = stats.total || 0;
  const criticas = stats.porPrioridad.critica || 0;
  const altas = stats.porPrioridad.alta || 0;

  const conclusiones: string[] = [];

  conclusiones.push(`Se registraron ${total} incidencias en el período analizado.`);

  if (total > 0) {
    conclusiones.push(
      `${criticas} incidencias de prioridad crítica y ${altas} de prioridad alta requieren atención prioritaria.`
    );
    conclusiones.push(
      `El ${porcentajeConImagenes}% de incidencias cuenta con evidencia fotográfica, lo que facilita el análisis y la trazabilidad.`
    );
  } else {
    conclusiones.push('No se registraron incidencias en el período seleccionado.');
  }

  conclusiones.push(
    'Se recomienda reforzar controles y medidas preventivas en las áreas con mayor recurrencia de incidencias.'
  );
  conclusiones.push(
    'Mantener la documentación y el uso del sistema de monitoreo para mejorar el tiempo de respuesta y la toma de decisiones.'
  );

  conclusiones.forEach((conclusion) => {
    yConclusiones = checkSpace(yConclusiones, 8);
    const lines = doc.splitTextToSize('• ' + conclusion, usableWidth - 10);
    lines.forEach((line: string) => {
      doc.text(line, margin + 5, yConclusiones);
      yConclusiones += 5;
    });
    yConclusiones += 2;
  });

  const fechaReporte = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const nombreArchivo = `Reporte_Incidencias_${fechaReporte}.pdf`;
  doc.save(nombreArchivo);
};
