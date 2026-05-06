import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Package, PackageFilters, PackageStatus } from '../types/package';

// ── Status labels in Spanish ──────────────────────────────────────────────────
const STATUS_ES: Record<PackageStatus, string> = {
  PENDING:    'Pendiente',
  PICKED_UP:  'Recogido',
  IN_TRANSIT: 'En tránsito',
  DELIVERED:  'Entregado',
  FAILED:     'Fallido',
  CANCELLED:  'Cancelado',
};

// ── Color helpers (RGB) ───────────────────────────────────────────────────────
const COLORS = {
  primary:   [99, 102, 241] as [number, number, number],   // indigo-500
  dark:      [17,  24,  39] as [number, number, number],   // surface-900
  mid:       [31,  41,  55] as [number, number, number],   // surface-800
  light:     [75,  85,  99] as [number, number, number],   // gray-600
  white:     [255,255, 255] as [number, number, number],
  green:     [34, 197,  94] as [number, number, number],
  red:       [239,  68,  68] as [number, number, number],
  yellow:    [234, 179,   8] as [number, number, number],
};

interface ReportOptions {
  packages: Package[];
  filters: PackageFilters;
  /** Name of the courier if a specific one is filtered */
  courierName?: string;
  /** Admin's full name */
  generatedBy: string;
}

// ── Main export function ──────────────────────────────────────────────────────
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

  let y = 0; // running Y cursor

  // ── Dark header band ────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageW, 26, 'F');

  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('COURIER SYSTEM', 12, 11);

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.text('Reporte de Paquetes', 12, 19);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.light);
  doc.text(`Generado el ${dateStr}  |  Por: ${generatedBy}`, pageW - 12, 19, { align: 'right' });

  y = 34;

  // ── Applied filters section ─────────────────────────────────────────────────
  const filterLines: string[] = [];
  filterLines.push(`Estado: ${filters.status ? STATUS_ES[filters.status as PackageStatus] : 'Todos'}`);
  filterLines.push(`Repartidor: ${courierName ?? 'Todos'}`);
  filterLines.push(`Desde: ${filters.date_from ?? '—'}`);
  filterLines.push(`Hasta: ${filters.date_to   ?? '—'}`);

  doc.setFillColor(...COLORS.mid);
  doc.roundedRect(10, y - 5, pageW - 20, 14, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.light);
  const filterStr = filterLines.join('   ·   ');
  doc.text(`Filtros: ${filterStr}`, 15, y + 3);

  y += 16;

  // ── Summary cards ───────────────────────────────────────────────────────────
  const total       = packages.length;
  const delivered   = packages.filter(p => p.status === 'DELIVERED').length;
  const pending     = packages.filter(p => p.status === 'PENDING' || p.status === 'PICKED_UP' || p.status === 'IN_TRANSIT').length;
  const failed      = packages.filter(p => p.status === 'FAILED' || p.status === 'CANCELLED').length;
  const totalAmount = packages.reduce((sum, p) => sum + Number(p.cash_to_collect), 0);

  const cards = [
    { label: 'Total paquetes',    value: String(total),           color: COLORS.primary },
    { label: 'Entregados',        value: String(delivered),        color: COLORS.green   },
    { label: 'En proceso',        value: String(pending),          color: COLORS.yellow  },
    { label: 'Fallidos/Cancels',  value: String(failed),           color: COLORS.red     },
    { label: 'Total a cobrar',    value: `Bs ${totalAmount.toFixed(2)}`, color: COLORS.primary },
  ];

  const cardW = (pageW - 20 - 8) / cards.length;
  cards.forEach((card, i) => {
    const cx = 10 + i * (cardW + 2);
    doc.setFillColor(...COLORS.mid);
    doc.roundedRect(cx, y, cardW, 16, 2, 2, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, cx + cardW / 2, y + 9, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.light);
    doc.text(card.label, cx + cardW / 2, y + 14, { align: 'center' });
  });

  y += 22;

  // ── Main table ──────────────────────────────────────────────────────────────
  const rows = packages.map(p => [
    p.tracking_number,
    p.client_code ?? '—',
    p.customer_name ?? '—',
    p.courier_name  ?? 'Sin asignar',
    STATUS_ES[p.status as PackageStatus] ?? p.status,
    p.destination_address,
    `Bs ${Number(p.cash_to_collect).toFixed(2)}`,
    new Date(p.created_at).toLocaleDateString('es-BO'),
    p.status === 'DELIVERED' && p.proof_created_at
      ? new Date(p.proof_created_at).toLocaleDateString('es-BO')
      : '—',
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      'Código', 'Ref. Cliente', 'Cliente', 'Repartidor',
      'Estado', 'Destino', 'Monto', 'Registrado', 'Entregado',
    ]],
    body: rows,
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [220, 220, 230],
      fillColor: COLORS.mid,
      lineColor: [55, 65, 81],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [24, 33, 48],
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold' },   // tracking_number
      1: { cellWidth: 24 },                        // client_code
      2: { cellWidth: 30 },                        // customer
      3: { cellWidth: 28 },                        // courier
      4: { cellWidth: 22 },                        // status
      5: { cellWidth: 'auto' },                    // destination (fills space)
      6: { cellWidth: 20, halign: 'right' },       // amount
      7: { cellWidth: 22, halign: 'center' },      // created
      8: { cellWidth: 22, halign: 'center' },      // delivered
    },
    // Color status cells
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const status = packages[data.row.index]?.status;
        if (status === 'DELIVERED')   data.cell.styles.textColor = COLORS.green;
        if (status === 'FAILED' || status === 'CANCELLED') data.cell.styles.textColor = COLORS.red;
        if (status === 'IN_TRANSIT')  data.cell.styles.textColor = COLORS.yellow;
      }
    },
    // Footer with page numbers
    didDrawPage(data) {
      const pgH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.light);
      doc.text(
        `Página ${data.pageNumber}  |  Courier System — Reporte generado el ${dateStr}`,
        pageW / 2,
        pgH - 5,
        { align: 'center' }
      );
    },
  });

  // ── Save ────────────────────────────────────────────────────────────────────
  const dateTag = now.toISOString().slice(0, 10);
  doc.save(`reporte-paquetes-${dateTag}.pdf`);
}
