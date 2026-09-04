/**
 * Server-Side Vector PDF Presentation Renderer.
 * Implements PresentationRenderer to produce crisp, vector-rendered multi-page PDF documents.
 */

import { jsPDF } from 'jspdf';
import { PresentationDocument, SlideElement } from '@presentation-engine/index.js';
import { toPdfPoints } from '@presentation-engine/geometry/coordinateConverter.js';
import { PresentationRenderer, RenderResult } from './presentationRenderer.js';

function parseRgb(colorStr?: string): [number, number, number] {
  if (!colorStr) return [30, 41, 59];
  const trimmed = colorStr.trim();
  const rgbaMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbaMatch) {
    return [parseInt(rgbaMatch[1], 10), parseInt(rgbaMatch[2], 10), parseInt(rgbaMatch[3], 10)];
  }
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16)
      ];
    } else if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ];
    }
  }
  return [255, 255, 255];
}

function applyPdfFillColor(pdf: jsPDF, colorStr?: string) {
  const [r, g, b] = parseRgb(colorStr);
  pdf.setFillColor(r, g, b);
}

function applyPdfDrawColor(pdf: jsPDF, colorStr?: string) {
  const [r, g, b] = parseRgb(colorStr);
  pdf.setDrawColor(r, g, b);
}

function applyPdfTextColor(pdf: jsPDF, colorStr?: string) {
  const [r, g, b] = parseRgb(colorStr);
  pdf.setTextColor(r, g, b);
}

export class PdfPresentationRenderer implements PresentationRenderer {
  readonly format = 'pdf' as const;

  async render(doc: PresentationDocument): Promise<RenderResult> {
    // 16:9 Landscape (1920 x 1080 pt logical canvas)
    const PAGE_W = 1920;
    const PAGE_H = 1080;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [PAGE_W, PAGE_H]
    });

    const theme = doc.theme;

    for (let i = 0; i < doc.slides.length; i++) {
      if (i > 0) pdf.addPage([PAGE_W, PAGE_H], 'landscape');

      const slide = doc.slides[i];

      // 1. Render Background
      const bgColor = slide.background?.color || theme.colors.background || '#0F172A';
      applyPdfFillColor(pdf, bgColor);
      pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

      // 2. Render Elements
      for (const el of slide.elements) {
        this.renderElement(pdf, el, theme, PAGE_W, PAGE_H);
      }
    }

    const arrayBuffer = pdf.output('arraybuffer');
    const buffer = Buffer.from(arrayBuffer);
    const safeTitle = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);

    return {
      format: 'pdf',
      mimeType: 'application/pdf',
      data: buffer,
      fileName: `${safeTitle}-v${doc.version}.pdf`
    };
  }

  private renderElement(
    pdf: jsPDF,
    el: SlideElement,
    theme: any,
    pageW: number,
    pageH: number
  ) {
    const pt = toPdfPoints(el.bounds, pageW, pageH);

    switch (el.type) {
      case 'shape': {
        const fill = el.fillColor || el.style?.backgroundColor;
        const stroke = el.borderColor || el.style?.borderColor;

        if (fill) {
          applyPdfFillColor(pdf, fill);
        }
        if (stroke) {
          applyPdfDrawColor(pdf, stroke);
          pdf.setLineWidth(el.borderWidth || el.style?.borderWidth || 1);
        }

        const style = fill && stroke ? 'FD' : (fill ? 'F' : 'D');

        if (el.shapeType === 'pill' || el.shapeType === 'rect') {
          const r = el.style?.borderRadius || 12;
          pdf.roundedRect(pt.x, pt.y, pt.width, pt.height, r, r, style);
        } else if (el.shapeType === 'circle') {
          pdf.ellipse(pt.x + pt.width / 2, pt.y + pt.height / 2, pt.width / 2, pt.height / 2, style);
        }
        break;
      }

      case 'line': {
        const stroke = el.strokeColor || theme.colors.secondary || '#FB641B';
        applyPdfDrawColor(pdf, stroke);
        pdf.setLineWidth(el.strokeWidth || 2);
        pdf.line(pt.x, pt.y, pt.x + pt.width, pt.y + pt.height);
        break;
      }

      case 'text': {
        const textColor = el.style?.color || (el.role === 'subtitle' ? theme.colors.mutedText : theme.colors.text) || '#FFFFFF';
        applyPdfTextColor(pdf, textColor);
        pdf.setFont('helvetica', el.style?.fontWeight === 'bold' || el.style?.fontWeight === 'black' ? 'bold' : 'normal');

        const fontSize = Math.max(12, (el.style?.fontSize || 18) * 1.6);
        pdf.setFontSize(fontSize);

        if (el.bulletPoints && el.bulletPoints.length > 0) {
          let lineY = pt.y + fontSize;
          const maxWidth = pt.width;
          for (const bp of el.bulletPoints) {
            const bulletText = `• ${bp}`;
            const split = pdf.splitTextToSize(bulletText, maxWidth);
            pdf.text(split, pt.x, lineY);
            lineY += (split.length * fontSize * 1.4) + 8;
          }
        } else if (el.text) {
          const split = pdf.splitTextToSize(el.text, pt.width);
          const align = el.style?.textAlign || 'left';
          const textX = align === 'center' ? pt.x + pt.width / 2 : (align === 'right' ? pt.x + pt.width : pt.x);
          pdf.text(split, textX, pt.y + fontSize, { align: align as any });
        }
        break;
      }

      case 'metric': {
        // Metric Card Background
        const cardBg = el.style?.backgroundColor || theme.colors.surface || 'rgba(30, 41, 59, 0.85)';
        applyPdfFillColor(pdf, cardBg);
        pdf.roundedRect(pt.x, pt.y, pt.width, pt.height, 16, 16, 'F');

        // Metric Value
        applyPdfTextColor(pdf, theme.colors.primary || '#2874F0');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(36);
        pdf.text(el.value, pt.x + 24, pt.y + 54);

        // Metric Label
        applyPdfTextColor(pdf, theme.colors.text || '#FFFFFF');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(16);
        const splitLabel = pdf.splitTextToSize(el.label, pt.width - 48);
        pdf.text(splitLabel, pt.x + 24, pt.y + 84);

        // Provenance Tag
        if (el.provenance) {
          const provColor = el.provenance === 'placeholder' ? '#F59E0B' : '#10B981';
          applyPdfTextColor(pdf, provColor);
          pdf.setFontSize(11);
          pdf.text(`[${el.provenance.toUpperCase()}]`, pt.x + 24, pt.y + pt.height - 18);
        }
        break;
      }

      case 'logo': {
        applyPdfTextColor(pdf, theme.colors.secondary || '#FB641B');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.text(el.brandName.toUpperCase(), pt.x, pt.y + 24);
        break;
      }

      case 'table': {
        applyPdfFillColor(pdf, theme.colors.surface || 'rgba(30, 41, 59, 0.75)');
        pdf.roundedRect(pt.x, pt.y, pt.width, pt.height, 12, 12, 'F');
        applyPdfTextColor(pdf, theme.colors.text || '#FFFFFF');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        let rowY = pt.y + 24;
        pdf.text(el.headers.join('   |   '), pt.x + 16, rowY);
        rowY += 16;
        pdf.setFont('helvetica', 'normal');
        for (const row of el.rows) {
          pdf.text(row.join('   |   '), pt.x + 16, rowY);
          rowY += 18;
        }
        break;
      }

      default:
        break;
    }
  }
}

export const pdfPresentationRenderer = new PdfPresentationRenderer();
