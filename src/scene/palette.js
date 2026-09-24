import * as THREE from 'three';

/**
 * Zentrale Lichtpalette des Werks. Shader erhalten Klone, damit Uniforms
 * unabhängig animiert werden können, ohne die gemeinsame Farbquelle zu ändern.
 */
export const LIGHT_PALETTE = Object.freeze({
  void: '#03060d',
  deep: '#07101d',
  fiber: '#c9e8ff',
  fiberBlue: '#78bfff',
  violet: '#8774df',
  green: '#64d98b',
  amber: '#e8a45a',
  signal: '#c73546',
  base: '#23486d',
});

export const lightColor = (name) => new THREE.Color(LIGHT_PALETTE[name]);

