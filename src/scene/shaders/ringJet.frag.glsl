uniform float uHover, uCompact, uReveal, uPixelRatio;
varying float vT, vSeed, vSpark, vHue, vPulse;
varying vec3 vDocumentEdge;
void main() {
  float edgeDistance = dot(vDocumentEdge.xy, gl_FragCoord.xy) + vDocumentEdge.z;
  if (edgeDistance <= 0.5) discard;
  // Senkrecht gestauchte Punktform: aus dem runden Sprite wird ein
  // Bewegungsstrich, wie bei einem sehr schnellen Abgasstrahl.
  vec2 point = gl_PointCoord - 0.5;
  point.y *= mix(0.46, 0.15, vT);
  float d = length(point);
  if (d > 0.5) discard;
  float core = 1.0 - smoothstep(0.0, 0.5, d);

  vec3 blue = vec3(.12, .48, 1.0);
  vec3 amber = vec3(1.0, .40, .06);
  vec3 teal = vec3(.04, 1.0, .65);
  vec3 violet = vec3(.72, .22, 1.0);
  float band = vHue * 4.0;
  float blend = smoothstep(.65, 1.0, fract(band));
  vec3 color = band < 1.0 ? mix(blue, teal, blend)
    : band < 2.0 ? mix(teal, amber, blend)
    : band < 3.0 ? mix(amber, violet, blend) : mix(violet, blue, blend);

  float alpha = core * vSpark * (0.60 + uHover * 0.18 + vPulse * 0.12)
    * uReveal * mix(1.0, 0.64, uCompact)
    * smoothstep(0.5, max(1.5, 2.5 * uPixelRatio), edgeDistance);
  if (alpha < 0.005) discard;
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
