/**
 * Helper module for importing Matter.js behaviors.
 *
 * @matter/main is ESM-first; the CJS compatibility layer uses __esModule shims.
 * With NestJS's CJS output + moduleResolution:"node", the TypeScript compiler
 * cannot resolve the subpath exports in @matter/main/behaviors/*.
 * At runtime `require()` resolves them correctly via package.json "exports".
 *
 * This file centralizes all behavior imports so the rest of our code uses
 * plain typed references.
 */

/* eslint-disable @typescript-eslint/no-var-requires */

// The require() calls resolve correctly at runtime via the @matter/main "exports" map.
// We type them as `any` because the TS compiler can't resolve the subpath with moduleResolution: "node".
function loadBehavior(subpath: string): any {
  return require(`@matter/main/behaviors/${subpath}`);
}

// Lazy-loaded behavior constructors (loaded on first access)
let _OnOffBehavior: any;
let _LevelControlBehavior: any;
let _ColorControlBehavior: any;
let _BasicInformationBehavior: any;
let _DescriptorBehavior: any;

export function getOnOffBehavior(): any {
  if (!_OnOffBehavior) {
    _OnOffBehavior = loadBehavior('on-off').OnOffBehavior;
  }
  return _OnOffBehavior;
}

export function getLevelControlBehavior(): any {
  if (!_LevelControlBehavior) {
    _LevelControlBehavior = loadBehavior('level-control').LevelControlBehavior;
  }
  return _LevelControlBehavior;
}

export function getColorControlBehavior(): any {
  if (!_ColorControlBehavior) {
    _ColorControlBehavior = loadBehavior('color-control').ColorControlBehavior;
  }
  return _ColorControlBehavior;
}

export function getBasicInformationBehavior(): any {
  if (!_BasicInformationBehavior) {
    _BasicInformationBehavior = loadBehavior('basic-information').BasicInformationBehavior;
  }
  return _BasicInformationBehavior;
}

export function getDescriptorBehavior(): any {
  if (!_DescriptorBehavior) {
    _DescriptorBehavior = loadBehavior('descriptor').DescriptorBehavior;
  }
  return _DescriptorBehavior;
}
