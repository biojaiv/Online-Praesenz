uniform float uOpacity, uTime, uMotion, uQuality, uEnhanced, uHover;
uniform vec3 uAccent;
varying float vSpark, vPulse, vFresnel, vPointSize;
void main() {
  float radius = length(gl_PointCoord - 0.5);
  float aa = clamp(fwidth(radius), 0.02, 0.18);
  float core = (1.0 - smoothstep(0.04, 0.5, radius))
    * (1.0 - smoothstep(0.5 - aa, 0.5, radius));
  float scan = 1.0;
  // Never ask a one-pixel particle to resolve hundreds of scanlines.
  if (uQuality > 1.5 && uMotion > 0.5) {
    float rows = clamp(floor(vPointSize / 3.0), 1.0, 3.0);
    scan -= uEnhanced * 0.035 * smoothstep(3.0, 7.0, vPointSize)
      * (0.5 + 0.5 * holoWave(uTime, 0.6, gl_PointCoord.y * HOLO_TAU * rows));
  }
  float alpha = core * uOpacity * (0.30 + 0.34 * vSpark + 0.25 * vPulse)
    * scan * (1.0 + uEnhanced * uHover * 0.12);
  if (alpha < 0.008) discard;
  gl_FragColor = vec4(uAccent * (1.0 + uEnhanced * vFresnel * 0.18), alpha);
  #include <colorspace_fragment>
}
