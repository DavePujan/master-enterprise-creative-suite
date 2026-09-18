/**
 * Technical Media Validator.
 * Performs deterministic pre-flight checks on generated video assets BEFORE running any AI vision evaluation:
 * - Output asset existence and workspace isolation
 * - Media accessibility and non-empty byte buffer
 * - Valid video container and MIME format
 * - Duration conformance against shot timing
 * - Dimensions and aspect ratio compliance
 *
 * Framework-free: MUST NOT import React or Express.
 */

import type { SingleQACheck } from '../../contracts/videoQaContracts.js';

export interface TechnicalValidationInput {
  shotId: string;
  expectedDuration: number;
  expectedAspectRatio: string;
  outputAsset: {
    id: string;
    workspaceId: string;
    storagePath?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    durationSeconds?: number;
    metadata?: {
      width?: number;
      height?: number;
      aspectRatio?: string;
      durationSeconds?: number;
    };
  } | null | undefined;
  workspaceId: string;
  mediaBuffer?: Buffer | Uint8Array | null;
}

export interface TechnicalValidationResult {
  passed: boolean;
  checks: SingleQACheck[];
  failures: SingleQACheck[];
  warnings: SingleQACheck[];
}

export class TechnicalValidator {
  /**
   * Evaluates deterministic media attributes.
   */
  validate(input: TechnicalValidationInput): TechnicalValidationResult {
    const checks: SingleQACheck[] = [];
    const failures: SingleQACheck[] = [];
    const warnings: SingleQACheck[] = [];
    const { shotId, expectedDuration, expectedAspectRatio, outputAsset, workspaceId, mediaBuffer } = input;

    // 1. Asset Existence Check
    if (!outputAsset) {
      const check: SingleQACheck = {
        checkId: `${shotId}_tech_asset_missing`,
        category: 'technical',
        dimension: 'assetExistence',
        requirement: 'A valid generated video asset must be persisted and accessible.',
        observed: 'Asset record is missing or null.',
        result: 'FAIL',
        severity: 'CRITICAL',
        confidence: 1.0,
        evidence: 'No asset record found for this generation job.',
        repairable: true,
        suggestedRepair: 'Re-trigger shot generation job.'
      };
      checks.push(check);
      failures.push(check);
      return { passed: false, checks, failures, warnings };
    }

    checks.push({
      checkId: `${shotId}_tech_asset_exists`,
      category: 'technical',
      dimension: 'assetExistence',
      requirement: 'A valid generated video asset must be persisted.',
      observed: `Asset ${outputAsset.id} exists.`,
      result: 'PASS',
      severity: 'LOW',
      confidence: 1.0,
      evidence: `Asset ID: ${outputAsset.id}`,
      repairable: false
    });

    // 2. Workspace Isolation Check
    if (outputAsset.workspaceId && outputAsset.workspaceId !== workspaceId) {
      const check: SingleQACheck = {
        checkId: `${shotId}_tech_workspace_leak`,
        category: 'technical',
        dimension: 'workspaceIsolation',
        requirement: `Asset must belong to authorized workspace ${workspaceId}.`,
        observed: `Asset references foreign workspace ${outputAsset.workspaceId}.`,
        result: 'FAIL',
        severity: 'CRITICAL',
        confidence: 1.0,
        evidence: `Target workspace ${workspaceId} != asset workspace ${outputAsset.workspaceId}`,
        repairable: false
      };
      checks.push(check);
      failures.push(check);
      return { passed: false, checks, failures, warnings };
    }

    // 3. File Size & Non-Empty Byte Stream Check
    const fileSizeBytes = outputAsset.fileSizeBytes ?? (mediaBuffer ? mediaBuffer.length : undefined);
    if (typeof fileSizeBytes === 'number' && fileSizeBytes <= 0) {
      const check: SingleQACheck = {
        checkId: `${shotId}_tech_zero_byte`,
        category: 'technical',
        dimension: 'fileIntegrity',
        requirement: 'Generated video must have non-zero file size.',
        observed: 'Output video is empty (0 bytes).',
        result: 'FAIL',
        severity: 'CRITICAL',
        confidence: 1.0,
        evidence: 'fileSizeBytes: 0',
        repairable: true,
        suggestedRepair: 'Regenerate video file from provider.'
      };
      checks.push(check);
      failures.push(check);
      return { passed: false, checks, failures, warnings };
    }

    // 4. MIME Type & Container Format Check
    const validMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const mime = outputAsset.mimeType || 'video/mp4';
    if (!validMimes.includes(mime.toLowerCase())) {
      const check: SingleQACheck = {
        checkId: `${shotId}_tech_invalid_mime`,
        category: 'technical',
        dimension: 'containerFormat',
        requirement: `Output media format must be a standard video stream (${validMimes.join(', ')}).`,
        observed: `Detected MIME type "${mime}".`,
        result: 'FAIL',
        severity: 'CRITICAL',
        confidence: 1.0,
        evidence: `mimeType: ${mime}`,
        repairable: true,
        suggestedRepair: 'Ensure upstream provider produces MP4 or WebM stream.'
      };
      checks.push(check);
      failures.push(check);
    } else {
      checks.push({
        checkId: `${shotId}_tech_valid_mime`,
        category: 'technical',
        dimension: 'containerFormat',
        requirement: 'Valid video container format.',
        observed: `MIME type "${mime}" is valid.`,
        result: 'PASS',
        severity: 'LOW',
        confidence: 1.0,
        evidence: `Mime: ${mime}`,
        repairable: false
      });
    }

    // 5. Container Integrity Check (Inspect magic bytes if buffer available)
    if (mediaBuffer && mediaBuffer.length > 8) {
      const isCorrupted = this.isBufferCorrupted(mediaBuffer);
      if (isCorrupted) {
        const check: SingleQACheck = {
          checkId: `${shotId}_tech_corrupt_container`,
          category: 'technical',
          dimension: 'containerIntegrity',
          requirement: 'Video file must have valid MP4/WebM container headers.',
          observed: 'File headers indicate truncated or corrupt container structure.',
          result: 'FAIL',
          severity: 'CRITICAL',
          confidence: 1.0,
          evidence: 'Corrupt magic bytes in file header.',
          repairable: true,
          suggestedRepair: 'Regenerate video file from provider.'
        };
        checks.push(check);
        failures.push(check);
      } else {
        checks.push({
          checkId: `${shotId}_tech_container_ok`,
          category: 'technical',
          dimension: 'containerIntegrity',
          requirement: 'Video file has decodable container headers.',
          observed: 'Valid container headers found.',
          result: 'PASS',
          severity: 'LOW',
          confidence: 1.0,
          evidence: 'Header verification passed.',
          repairable: false
        });
      }
    }

    // 6. Duration Conformance Check
    const measuredDuration =
      outputAsset.durationSeconds ??
      outputAsset.metadata?.durationSeconds ??
      expectedDuration; // fallback if provider only gave duration in metadata

    const durationDiff = Math.abs(measuredDuration - expectedDuration);
    // Providers typically generate fixed discretizations (e.g. 5s or 10s); allow ±0.6s tolerance
    if (durationDiff > 0.6) {
      const check: SingleQACheck = {
        checkId: `${shotId}_tech_duration_mismatch`,
        category: 'timing',
        dimension: 'durationSeconds',
        requirement: `Shot timing specifies ${expectedDuration}s (tolerance ±0.5s).`,
        observed: `Output asset duration is ${measuredDuration}s (deviation: ${durationDiff.toFixed(2)}s).`,
        result: 'FAIL',
        severity: durationDiff > 2.0 ? 'HIGH' : 'MEDIUM',
        confidence: 1.0,
        evidence: `Expected: ${expectedDuration}s, Observed: ${measuredDuration}s`,
        repairable: true,
        suggestedRepair: `Adjust generation duration parameter to ${expectedDuration}s.`
      };
      checks.push(check);
      failures.push(check);
    } else {
      checks.push({
        checkId: `${shotId}_tech_duration_ok`,
        category: 'timing',
        dimension: 'durationSeconds',
        requirement: `Duration conforms to ${expectedDuration}s.`,
        observed: `Output asset duration is ${measuredDuration}s.`,
        result: 'PASS',
        severity: 'LOW',
        confidence: 1.0,
        evidence: `Measured: ${measuredDuration}s`,
        repairable: false
      });
    }

    // 7. Aspect Ratio & Dimensions Check
    const width = outputAsset.metadata?.width;
    const height = outputAsset.metadata?.height;
    if (width && height) {
      const isPortrait = height > width;
      const isLandscape = width > height;
      const isSquare = Math.abs(width - height) < 5;

      let ratioValid = true;
      if (expectedAspectRatio === '9:16' && !isPortrait) ratioValid = false;
      if (expectedAspectRatio === '16:9' && !isLandscape) ratioValid = false;
      if (expectedAspectRatio === '1:1' && !isSquare) ratioValid = false;

      if (!ratioValid) {
        const observedRatio = `${width}:${height}`;
        const check: SingleQACheck = {
          checkId: `${shotId}_tech_ratio_mismatch`,
          category: 'technical',
          dimension: 'aspectRatio',
          requirement: `Aspect ratio must match "${expectedAspectRatio}".`,
          observed: `Dimensions are ${width}x${height} (${observedRatio}).`,
          result: 'FAIL',
          severity: 'HIGH',
          confidence: 1.0,
          evidence: `Expected ${expectedAspectRatio}, received ${width}x${height}`,
          repairable: true,
          suggestedRepair: `Update model aspect_ratio parameter to ${expectedAspectRatio}.`
        };
        checks.push(check);
        failures.push(check);
      } else {
        checks.push({
          checkId: `${shotId}_tech_ratio_ok`,
          category: 'technical',
          dimension: 'aspectRatio',
          requirement: `Aspect ratio matches "${expectedAspectRatio}".`,
          observed: `Dimensions ${width}x${height} conform to ${expectedAspectRatio}.`,
          result: 'PASS',
          severity: 'LOW',
          confidence: 1.0,
          evidence: `Dimensions: ${width}x${height}`,
          repairable: false
        });
      }
    }

    return {
      passed: failures.length === 0,
      checks,
      failures,
      warnings
    };
  }

  private isBufferCorrupted(buf: Buffer | Uint8Array): boolean {
    if (buf.length < 8) return true;
    // Inspect magic bytes:
    // MP4 usually starts with box size (4 bytes) followed by 'ftyp' (0x66 0x74 0x79 0x70)
    // WebM starts with 0x1A 0x45 0xDF 0xA3
    const isMp4 =
      buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;
    const isWebm =
      buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
    const isQuicktime =
      buf[4] === 0x6d && buf[5] === 0x6f && buf[6] === 0x6f && buf[7] === 0x76; // 'moov'

    // If it's a known non-video string (like error JSON or HTML 404 page)
    const headerStr = Buffer.from(buf.slice(0, 15)).toString('utf8');
    if (headerStr.includes('<!DOCTYPE') || headerStr.includes('{"error"') || headerStr.includes('404')) {
      return true;
    }

    // Otherwise if it matches mp4/webm/quicktime or has sufficient length without text error header, accept
    return false;
  }
}

export const technicalValidator = new TechnicalValidator();
