/**
 * Canonical Presentation Intermediate Representation (IR).
 * Pure domain model decoupling generation, layout, rendering, and export.
 * Free of React, Express, or browser DOM dependencies.
 */

export type SlideAspect = '16:9' | '4:3';

export type SlidePurpose =
  | 'cover'
  | 'agenda'
  | 'problem'
  | 'opportunity'
  | 'strategy'
  | 'solution'
  | 'process'
  | 'timeline'
  | 'comparison'
  | 'metrics'
  | 'market'
  | 'team'
  | 'financials'
  | 'case-study'
  | 'closing';

export type SlideLayoutType =
  | 'cover'
  | 'standard'
  | 'split'
  | 'bento'
  | 'metrics-focus'
  | 'comparison'
  | 'timeline'
  | 'quote';

export type DataProvenance =
  | 'user_provided'
  | 'brand_context'
  | 'verified_source'
  | 'placeholder';

export interface NormalizedBounds {
  x: number;      // 0 to 100 (% of logical slide width)
  y: number;      // 0 to 100 (% of logical slide height)
  width: number;  // 0 to 100 (% of logical slide width)
  height: number; // 0 to 100 (% of logical slide height)
  rotation?: number;
  zIndex?: number;
}

export interface TextLayoutSettings {
  maxLines?: number;
  autoFit?: boolean;
  overflow?: 'clip' | 'shrink' | 'error';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  minFontSize?: number;
}

export interface ElementStyle {
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  padding?: number;
  lineHeight?: number;
}

export type SlideElementType =
  | 'text'
  | 'image'
  | 'logo'
  | 'metric'
  | 'chart'
  | 'table'
  | 'shape'
  | 'line'
  | 'connector'
  | 'icon'
  | 'group';

export interface BaseSlideElement {
  id: string;
  type: SlideElementType;
  bounds: NormalizedBounds;
  style?: ElementStyle;
}

export interface TextElement extends BaseSlideElement {
  type: 'text';
  text: string;
  role: 'title' | 'subtitle' | 'body' | 'caption' | 'tagline';
  bulletPoints?: string[];
  textLayout?: TextLayoutSettings;
}

export interface ImageElement extends BaseSlideElement {
  type: 'image';
  assetId: string;       // Canonical reference; URL resolved dynamically
  altText?: string;
  objectFit: 'cover' | 'contain' | 'fill';
  visualPrompt?: string;
}

export interface LogoElement extends BaseSlideElement {
  type: 'logo';
  assetId: string;       // Canonical reference to brand logo asset
  brandName: string;
}

export interface MetricElement extends BaseSlideElement {
  type: 'metric';
  value: string;         // e.g. "85%" or "[Insert verified growth %]"
  label: string;         // e.g. "YoY Regional GMV Growth"
  trend?: 'up' | 'down' | 'neutral';
  provenance: DataProvenance;
  source?: string;
  confidence?: 'high' | 'estimated' | 'unverified';
}

export type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area';

export interface ChartSeries {
  name: string;
  values: number[];
}

export interface ChartElement extends BaseSlideElement {
  type: 'chart';
  chartType: ChartType;
  title?: string;
  categories: string[];
  series: ChartSeries[];
  provenance: DataProvenance;
  source?: string;
}

export interface TableElement extends BaseSlideElement {
  type: 'table';
  headers: string[];
  rows: string[][];
  provenance: DataProvenance;
  source?: string;
}

export interface ShapeElement extends BaseSlideElement {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'pill' | 'divider';
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface LineElement extends BaseSlideElement {
  type: 'line';
  strokeColor?: string;
  strokeWidth?: number;
  dashStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface ConnectorElement extends BaseSlideElement {
  type: 'connector';
  fromElementId: string;
  toElementId: string;
  arrowHead?: 'start' | 'end' | 'both' | 'none';
  strokeColor?: string;
  strokeWidth?: number;
}

export interface IconElement extends BaseSlideElement {
  type: 'icon';
  iconName: string;      // Lucide icon identifier
  size?: number;
}

export interface GroupElement extends BaseSlideElement {
  type: 'group';
  children: SlideElement[];
}

export type SlideElement =
  | TextElement
  | ImageElement
  | LogoElement
  | MetricElement
  | ChartElement
  | TableElement
  | ShapeElement
  | LineElement
  | ConnectorElement
  | IconElement
  | GroupElement;

export interface PresentationThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  chartPalette: string[];
}

export interface PresentationThemeTypography {
  headingFont: string;
  bodyFont: string;
  pptxSafeHeadingFont: string;
  pptxSafeBodyFont: string;
}

export interface PresentationTheme {
  id: string;
  name: string;
  colors: PresentationThemeColors;
  typography: PresentationThemeTypography;
  overlay: number;
  cornerRadius: number;
  lineStyle?: string;
}

export interface SlideBackground {
  type: 'color' | 'gradient' | 'image';
  color?: string;
  gradient?: string;
  assetId?: string;
  overlayOpacity?: number;
}

export interface PresentationSlide {
  id: string;
  index: number;
  purpose: SlidePurpose;
  layout: SlideLayoutType;
  title: string;
  subtitle?: string;
  elements: SlideElement[];
  background?: SlideBackground;
  speakerNotes?: string;
}

export interface PresentationAsset {
  id: string;
  type: 'image' | 'logo' | 'chart_export';
  storagePath: string;
  status: 'pending' | 'ready' | 'failed';
  mimeType: string;
  width?: number;
  height?: number;
}

export interface PresentationMetadata {
  objective: string;
  targetAudience: string;
  narrativeArc: string;
  brandName: string;
  industry: string;
  targetSlideCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PresentationDocument {
  id: string;
  title: string;
  schemaVersion: number; // e.g. 1
  version: number;       // e.g. 1, 2, 3 (optimistic concurrency counter)
  aspectRatio: SlideAspect;
  theme: PresentationTheme;
  slides: PresentationSlide[];
  assets: PresentationAsset[];
  metadata: PresentationMetadata;
}

/**
 * Semantic Slide input emitted by the AI planner prior to deterministic geometry calculation.
 */
export interface SemanticSlideInput {
  id?: string;
  purpose: SlidePurpose;
  preferredLayout?: SlideLayoutType;
  title: string;
  subtitle?: string;
  bulletPoints?: string[];
  metric?: {
    value: string;
    label: string;
    trend?: 'up' | 'down' | 'neutral';
    provenance: DataProvenance;
    source?: string;
    confidence?: 'high' | 'estimated' | 'unverified';
  };
  metrics?: Array<{
    value: string;
    label: string;
    trend?: 'up' | 'down' | 'neutral';
    provenance: DataProvenance;
    source?: string;
    confidence?: 'high' | 'estimated' | 'unverified';
  }>;
  chart?: {
    chartType: ChartType;
    title?: string;
    categories: string[];
    series: ChartSeries[];
    provenance: DataProvenance;
    source?: string;
  };
  table?: {
    headers: string[];
    rows: string[][];
    provenance: DataProvenance;
    source?: string;
  };
  visualPrompt?: string;
  speakerNotes?: string;
  logoAssetId?: string;
  brandName?: string;
}
