attribute float aOffset, aSpeed, aSize, aSeed;
uniform float uTime, uHalfWidth, uHalfHeight, uPixelRatio;
uniform float uMotion, uQuality, uEnhanced, uActivation;
varying float vSpark, vPulse, vFresnel, vPointSize;
void main() {
  float t = holoTravel(uTime, aSpeed * 0.018, aOffset);
  float w = uHalfWidth;
  float h = uHalfHeight;
  float dist = t * 4.0 * (w + h);
  vec3 p;
  if (dist < 2.0 * w) p = vec3(-w + dist, -h, 0.0);
  else if (dist < 2.0 * w + 2.0 * h) p = vec3(w, -h + dist - 2.0 * w, 0.0);
  else if (dist < 4.0 * w + 2.0 * h) p = vec3(w - dist + 2.0 * w + 2.0 * h, h, 0.0);
  else p = vec3(-w, h - dist + 4.0 * w + 2.0 * h, 0.0);

  vPulse = uEnhanced * uMotion * holoActivation(t, uActivation);
  // Subtle displacement belongs only to the short activation. Text/hit targets
  // use their original geometry and are never deformed by this program.
  if (uQuality > 1.5) p.x += holoWave(uTime, 5.0, aSeed * 30.0) * vPulse * 0.006;
  float wave = 0.5 + 0.5 * holoWave(uTime, -0.6, t * HOLO_TAU * 14.0);
  vSpark = wave * wave;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vFresnel = uQuality > 0.5 ? holoFresnel(normalMatrix * vec3(0.0, 0.0, 1.0), -mv.xyz) : 0.0;
  vPointSize = clamp(aSize * (1.0 + 0.5 * vSpark + vPulse * 0.25)
    * uPixelRatio * (24.0 / max(9.0, -mv.z)), 1.0, 12.0 * uPixelRatio);
  gl_PointSize = vPointSize;
  gl_Position = projectionMatrix * mv;
}
