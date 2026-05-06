import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Package, PackageFilters, PackageStatus } from '../types/package';

// ── Status labels ─────────────────────────────────────────────────────────────
const STATUS_ES: Record<PackageStatus, string> = {
  PENDING:    'Pendiente',
  PICKED_UP:  'Recogido',
  IN_TRANSIT: 'En tránsito',
  DELIVERED:  'Entregado',
  FAILED:     'Fallido',
  CANCELLED:  'Cancelado',
};

// ── Color palette (RGB) ───────────────────────────────────────────────────────
const C = {
  blue:       [37,  99, 235] as [number, number, number],   // blue-600
  blueDark:   [29,  78, 216] as [number, number, number],   // blue-700
  blueLight:  [219,234,254] as [number, number, number],   // blue-100
  black:      [15,  23,  42] as [number, number, number],   // slate-900
  gray700:    [55,  65,  81] as [number, number, number],
  gray500:    [107,114,128] as [number, number, number],
  gray200:    [229,231,235] as [number, number, number],
  gray50:     [249,250,251] as [number, number, number],
  white:      [255,255,255] as [number, number, number],
  green:      [21, 128,  61] as [number, number, number],   // green-700
  red:        [185,  28,  28] as [number, number, number],  // red-700
  amber:      [180, 100,   0] as [number, number, number],  // amber-700
};

interface ReportOptions {
  packages: Package[];
  filters: PackageFilters;
  courierName?: string;
  generatedBy: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO');
}

// ── Main export ───────────────────────────────────────────────────────────────
export function generatePackageReport({
  packages,
  filters,
  courierName,
  generatedBy,
}: ReportOptions): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const now   = new Date();
  const dateStr = now.toLocaleDateString('es-BO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // ── Header band ─────────────────────────────────────────────────────────────
  doc.setFillColor(...C.blue);
  doc.rect(0, 0, pageW, 28, 'F');

  // Thin accent line at bottom of header
  doc.setFillColor(...C.blueDark);
  doc.rect(0, 26, pageW, 2, 'F');

  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Plataforma de Despacho y Validación Georreferenciada', 12, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.blueLight);
  doc.text('Reporte de Paquetes', 12, 20);

  doc.setFontSize(8);
  doc.setTextColor(...C.blueLight);
  doc.text(`Generado el ${dateStr}  |  Por: ${generatedBy}`, pageW - 12, 20, { align: 'right' });

  let y = 36;

  // ── Filters bar ─────────────────────────────────────────────────────────────
  doc.setFillColor(...C.gray50);
  doc.setDrawColor(...C.gray200);
  doc.roundedRect(10, y - 4, pageW - 20, 12, 2, 2, 'FD');

  const filterParts = [
    `Estado: ${filters.status ? STATUS_ES[filters.status as PackageStatus] : 'Todos'}`,
    `Repartidor: ${courierName ?? 'Todos'}`,
    `Desde: ${filters.date_from ?? '—'}`,
    `Hasta: ${filters.date_to ?? '—'}`,
  ].join('     ·     ');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray700);
  doc.text(filterParts, 15, y + 3);

  y += 16;

  // ── KPI summary cards ────────────────────────────────────────────────────────
  const total       = packages.length;
  const delivered   = packages.filter(p => p.status === 'DELIVERED').length;
  const inProcess   = packages.filter(p =>
    ['PENDING','PICKED_UP','IN_TRANSIT'].includes(p.status)).length;
  const failed      = packages.filter(p =>
    ['FAILED','CANCELLED'].includes(p.status)).length;
  const totalAmount = packages.reduce((s, p) => s + Number(p.cash_to_collect), 0);

  const cards = [
    { label: 'Total paquetes',  value: String(total),                   accent: C.blue    },
    { label: 'Entregados',      value: String(delivered),               accent: C.green   },
    { label: 'En proceso',      value: String(inProcess),               accent: C.amber   },
    { label: 'Fallidos/Cancel', value: String(failed),                  accent: C.red     },
    { label: 'Monto total (Bs)',value: `Bs ${totalAmount.toFixed(2)}`,  accent: C.blue    },
  ];

  const cardW = (pageW - 20 - 8) / cards.length;

  cards.forEach((card, i) => {
    const cx = 10 + i * (cardW + 2);

    // Card background
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.gray200);
    doc.roundedRect(cx, y, cardW, 18, 2, 2, 'FD');

    // Top accent bar
    doc.setFillColor(...card.accent);
    doc.roundedRect(cx, y, cardW, 2.5, 1, 1, 'F');

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...card.accent);
    doc.text(card.value, cx + cardW / 2, y + 10, { align: 'center' });

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.gray500);
    doc.text(card.label, cx + cardW / 2, y + 16, { align: 'center' });
  });

  y += 24;

  // ── Main table ───────────────────────────────────────────────────────────────
  const rows = packages.map(p => [
    p.tracking_number,
    p.client_code ?? '—',
    p.customer_name ?? '—',
    p.courier_name ?? 'Sin asignar',
    STATUS_ES[p.status as PackageStatus] ?? p.status,
    p.destination_address,
    `Bs ${Number(p.cash_to_collect).toFixed(2)}`,
    fmtDate(p.created_at),
    p.status === 'DELIVERED' && p.proof_created_at
      ? fmtDate(p.proof_created_at)
      : '—',
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      'Código rastreo', 'Ref. cliente', 'Cliente', 'Repartidor',
      'Estado', 'Dirección destino', 'Monto', 'Registrado', 'Entregado',
    ]],
    body: rows,
    styles: {
      fontSize: 7.5,
      cellPadding: 2.8,
      textColor: C.black,
      fillColor: C.white,
      lineColor: C.gray200,
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: C.blue,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: C.gray50,
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold', textColor: C.blue },
      1: { cellWidth: 24 },
      2: { cellWidth: 30 },
      3: { cellWidth: 28 },
      4: { cellWidth: 23 },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 22, halign: 'center' },
      8: { cellWidth: 22, halign: 'center' },
    },
    // Color status cells by delivery state
    didParseCell(data) {
      if (data.section !== 'body' || data.column.index !== 4) return;
      const status = packages[data.row.index]?.status;
      if (status === 'DELIVERED')                           data.cell.styles.textColor = C.green;
      else if (status === 'FAILED' || status === 'CANCELLED') data.cell.styles.textColor = C.red;
      else if (status === 'IN_TRANSIT')                     data.cell.styles.textColor = C.amber;
    },
    // Page footer
    didDrawPage(data) {
      const pgH = doc.internal.pageSize.getHeight();
      const pgN = data.pageNumber;

      // Footer rule
      doc.setDrawColor(...C.gray200);
      doc.line(10, pgH - 10, pageW - 10, pgH - 10);

      doc.setFontSize(7);
      doc.setTextColor(...C.gray500);
      doc.text(
        `Plataforma de Despacho y Validación Georreferenciada  |  Reporte generado el ${dateStr}`,
        12,
        pgH - 5
      );
      doc.text(`Página ${pgN}`, pageW - 12, pgH - 5, { align: 'right' });
    },
  });

  // ── Save ─────────────────────────────────────────────────────────────────────
  const tag = now.toISOString().slice(0, 10);
  doc.save(`reporte-paquetes-${tag}.pdf`);
}
