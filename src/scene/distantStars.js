import * as THREE from 'three';

/** Sparse, stationary points well behind every part of the Orrery. */
export function createDistantStars() {
  const count = 190, positions = [], sizes = [], brightness = [];
  let seed = 0x51a7;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < count; i++) {
    const y = random() * 2 - 1, angle = random() * Math.PI * 2;
    const radius = 900 + random() * 350, equator = Math.sqrt(1 - y * y);
    positions.push(Math.cos(angle) * equator * radius, y * radius, Math.sin(angle) * equator * radius);
    sizes.push(.8 + random() ** 3 * 1.8);
    brightness.push(.18 + random() ** 2 * .52);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('starSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('starBrightness', new THREE.Float32BufferAttribute(brightness, 1));
  const pixelRatio = { value: 1 };
  const material = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: pixelRatio }, transparent: true, depthWrite: false,
    toneMapped: false, fog: false,
    vertexShader: `
      attribute float starSize, starBrightness;
      uniform float uPixelRatio;
      varying float intensity;
      void main() {
        intensity = starBrightness;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.0, starSize * uPixelRatio);
      }
    `,
    fragmentShader: `
      varying float intensity;
      void main() {
        float radius = length(gl_PointCoord - .5) * 2.0;
        float alpha = (1.0 - smoothstep(.08, 1.0, radius)) * intensity;
        if (alpha < .01) discard;
        gl_FragColor = vec4(.72, .79, .86, alpha);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'distant-stars';
  points.renderOrder = -20;
  return {
    points,
    setPixelRatio(value) { pixelRatio.value = Math.min(2, Math.max(.5, value || 1)); },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
