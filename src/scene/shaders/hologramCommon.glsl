// All frequencies complete whole cycles at HOLOGRAM_PERIOD seconds. The local
// clock can wrap without discontinuities or growing single-precision error.
const float HOLO_TAU = 6.28318530718;
float holoWave(float seconds, float rate, float phase) {
  float cycles = floor(rate * HOLOGRAM_PERIOD / HOLO_TAU + 0.5);
  return sin(seconds / HOLOGRAM_PERIOD * HOLO_TAU * cycles + phase);
}
float holoTravel(float seconds, float rate, float phase) {
  return fract(phase + seconds / HOLOGRAM_PERIOD * floor(rate * HOLOGRAM_PERIOD + 0.5));
}
float holoFresnel(vec3 viewNormal, vec3 toCamera) {
  // Both vectors are in view space. abs also handles the back of a flat sheet.
  float grazing = 1.0 - clamp(abs(dot(normalize(viewNormal), normalize(toCamera))), 0.0, 1.0);
  return grazing * grazing * grazing;
}
float holoActivation(float path, float progress) {
  if (progress < 0.0 || progress >= 1.0) return 0.0;
  float distance = abs(path - progress);
  distance = min(distance, 1.0 - distance);
  return exp(-distance * distance * 480.0) * sin(progress * 3.14159265359);
}
