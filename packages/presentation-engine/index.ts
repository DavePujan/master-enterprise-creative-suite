/**
 * @presentation-engine
 * Core presentation layout and domain engine.
 * Decoupled from React and Express; 100% boundary check compliant.
 */

// Domain Types
export * from './domain/types.js';
export * from './domain/provenance.js';

// Layouts & Geometry
export * from './layouts/matrix.js';
export * from './layouts/coverLayout.js';
export * from './layouts/standardLayout.js';
export * from './layouts/splitLayout.js';
export * from './layouts/bentoLayout.js';
export * from './layouts/metricsLayout.js';
export * from './layouts/timelineLayout.js';
export * from './layouts/comparisonLayout.js';
export * from './layouts/layoutEngine.js';

// Typography & Geometry
export * from './typography/fontMapping.js';
export * from './geometry/coordinateConverter.js';

// Theme
export * from './theme/brandThemeResolver.js';
export * from './theme/chartPaletteResolver.js';

// Validation
export * from './validation/documentValidator.js';
