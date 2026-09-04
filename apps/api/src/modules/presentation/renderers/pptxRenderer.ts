/**
 * Server-Side Native PowerPoint (.pptx) Presentation Renderer.
 * Implements PresentationRenderer using pptxgenjs to generate editable native Office presentations.
 * Generates native vector shapes, editable charts, formatted tables, and attached speaker notes.
 */

import pptxgen from 'pptxgenjs';
import { PresentationDocument, SlideElement, ChartElement } from '@presentation-engine/index.js';
import { toPptxInches } from '@presentation-engine/geometry/coordinateConverter.js';
import { PresentationRenderer, RenderResult } from './presentationRenderer.js';

function stripHex(color?: string): string {
  if (!color) return 'FFFFFF';
  return color.replace(/^#/, '').replace(/rgba?\(.*?\)/, '1E293B').trim();
}

export class PptxPresentationRenderer implements PresentationRenderer {
  readonly format = 'pptx' as const;

  async render(doc: PresentationDocument): Promise<RenderResult> {
    // Instantiate PptxGenJS (supports ES module & CommonJS default import)
    const PptxConstructor = (pptxgen as any).default || pptxgen;
    const pres = new PptxConstructor();

    // 16:9 Widescreen (13.333 x 7.5 inches)
    pres.layout = 'LAYOUT_16x9';
    pres.title = doc.title;
    pres.company = doc.metadata.brandName;

    const theme = doc.theme;
    const headingFont = theme.typography.pptxSafeHeadingFont || 'Arial';
    const bodyFont = theme.typography.pptxSafeBodyFont || 'Calibri';

    for (const slide of doc.slides) {
      const pptxSlide = pres.addSlide();

      // 1. Slide Background
      const bgColor = stripHex(slide.background?.color || theme.colors.background || '0F172A');
      pptxSlide.background = { color: bgColor };

      // 2. Speaker Notes
      if (slide.speakerNotes) {
        pptxSlide.addNotes(slide.speakerNotes);
      }

      // 3. Render Elements
      for (const el of slide.elements) {
        const inBounds = toPptxInches(el.bounds);

        switch (el.type) {
          case 'shape': {
            const fill = stripHex(el.fillColor || el.style?.backgroundColor || '1E293B');
            const line = stripHex(el.borderColor || el.style?.borderColor || '334155');

            if (el.shapeType === 'pill' || el.shapeType === 'rect') {
              pptxSlide.addShape(pres.ShapeType.roundRect, {
                x: inBounds.x,
                y: inBounds.y,
                w: inBounds.w,
                h: inBounds.h,
                fill: { color: fill },
                line: { color: line, width: el.borderWidth || 1 }
              });
            } else if (el.shapeType === 'circle') {
              pptxSlide.addShape(pres.ShapeType.ellipse, {
                x: inBounds.x,
                y: inBounds.y,
                w: inBounds.w,
                h: inBounds.h,
                fill: { color: fill },
                line: { color: line, width: 1 }
              });
            }
            break;
          }

          case 'line': {
            const stroke = stripHex(el.strokeColor || theme.colors.secondary || 'FB641B');
            pptxSlide.addShape(pres.ShapeType.line, {
              x: inBounds.x,
              y: inBounds.y,
              w: inBounds.w,
              h: 0,
              line: { color: stroke, width: el.strokeWidth || 2 }
            });
            break;
          }

          case 'text': {
            const textColor = stripHex(
              el.style?.color || (el.role === 'subtitle' ? theme.colors.mutedText : theme.colors.text) || 'FFFFFF'
            );
            const isHeading = el.role === 'title' || el.role === 'tagline';
            const fontFace = isHeading ? headingFont : bodyFont;
            const fontSize = Math.max(10, Math.round((el.style?.fontSize || 18) * 0.75));

            if (el.bulletPoints && el.bulletPoints.length > 0) {
              const textObjects = el.bulletPoints.map((bp) => ({
                text: bp,
                options: {
                  bullet: true,
                  breakLine: true,
                  fontSize,
                  color: textColor,
                  fontFace,
                  lineSpacing: 24
                }
              }));
              pptxSlide.addText(textObjects, {
                x: inBounds.x,
                y: inBounds.y,
                w: inBounds.w,
                h: inBounds.h,
                valign: 'top'
              });
            } else if (el.text) {
              pptxSlide.addText(el.text, {
                x: inBounds.x,
                y: inBounds.y,
                w: inBounds.w,
                h: inBounds.h,
                fontSize,
                color: textColor,
                fontFace,
                bold: el.style?.fontWeight === 'bold' || el.style?.fontWeight === 'black',
                align: el.style?.textAlign || 'left',
                valign: el.textLayout?.verticalAlign || 'middle'
              });
            }
            break;
          }

          case 'metric': {
            // Background card
            const cardFill = stripHex(el.style?.backgroundColor || theme.colors.surface || '1E293B');
            pptxSlide.addShape(pres.ShapeType.roundRect, {
              x: inBounds.x,
              y: inBounds.y,
              w: inBounds.w,
              h: inBounds.h,
              fill: { color: cardFill },
              line: { color: stripHex(theme.colors.border || '334155'), width: 1 }
            });

            // Metric Value + Label
            const metricPrimary = stripHex(theme.colors.primary || '2874F0');
            const provColor = el.provenance === 'placeholder' ? 'F59E0B' : '10B981';

            pptxSlide.addText(
              [
                {
                  text: el.value,
                  options: { fontSize: 26, bold: true, color: metricPrimary, fontFace: headingFont, breakLine: true }
                },
                {
                  text: el.label,
                  options: { fontSize: 13, color: 'FFFFFF', fontFace: bodyFont, breakLine: true }
                },
                {
                  text: `[${el.provenance.toUpperCase()}]`,
                  options: { fontSize: 9, bold: true, color: provColor, fontFace: bodyFont }
                }
              ],
              {
                x: inBounds.x + 0.15,
                y: inBounds.y + 0.15,
                w: inBounds.w - 0.3,
                h: inBounds.h - 0.3,
                valign: 'middle'
              }
            );
            break;
          }

          case 'chart': {
            const chartEl = el as ChartElement;
            const chartData = chartEl.series.map((s) => ({
              name: s.name,
              labels: chartEl.categories,
              values: s.values
            }));

            const chartColors = theme.colors.chartPalette.map((c: string) => stripHex(c));

            let pptxChartType = pres.ChartType.bar;
            if (chartEl.chartType === 'line') pptxChartType = pres.ChartType.line;
            else if (chartEl.chartType === 'pie' || chartEl.chartType === 'donut') pptxChartType = pres.ChartType.pie;

            pptxSlide.addChart(pptxChartType, chartData, {
              x: inBounds.x,
              y: inBounds.y,
              w: inBounds.w,
              h: inBounds.h,
              chartColors,
              showTitle: !!chartEl.title,
              title: chartEl.title,
              titleColor: 'FFFFFF',
              titleFontFace: headingFont,
              showLegend: true,
              legendPos: 'b',
              legendColor: 'CBD5E1'
            });
            break;
          }

          case 'table': {
            const tableRows: any[][] = [];
            // Header row
            tableRows.push(
              el.headers.map((h) => ({
                text: h,
                options: {
                  bold: true,
                  color: 'FFFFFF',
                  fill: stripHex(theme.colors.primary || '2874F0'),
                  fontFace: headingFont,
                  fontSize: 12
                }
              }))
            );

            // Data rows
            el.rows.forEach((row, rIdx) => {
              const bg = rIdx % 2 === 0 ? '1E293B' : '0F172A';
              tableRows.push(
                row.map((cell) => ({
                  text: cell,
                  options: {
                    color: 'CBD5E1',
                    fill: bg,
                    fontFace: bodyFont,
                    fontSize: 11
                  }
                }))
              );
            });

            pptxSlide.addTable(tableRows, {
              x: inBounds.x,
              y: inBounds.y,
              w: inBounds.w,
              h: inBounds.h,
              colW: Array(el.headers.length).fill(inBounds.w / el.headers.length)
            });
            break;
          }

          case 'logo': {
            pptxSlide.addText(el.brandName.toUpperCase(), {
              x: inBounds.x,
              y: inBounds.y,
              w: inBounds.w,
              h: inBounds.h,
              fontSize: 16,
              bold: true,
              color: stripHex(theme.colors.secondary || 'FB641B'),
              fontFace: headingFont,
              align: 'right',
              valign: 'middle'
            });
            break;
          }

          default:
            break;
        }
      }
    }

    const buffer = (await pres.write({ outputType: 'nodebuffer' })) as Buffer;
    const safeTitle = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);

    return {
      format: 'pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      data: buffer,
      fileName: `${safeTitle}-v${doc.version}.pptx`
    };
  }
}

export const pptxPresentationRenderer = new PptxPresentationRenderer();
