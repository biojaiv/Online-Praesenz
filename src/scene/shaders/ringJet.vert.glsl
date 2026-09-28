attribute float aAngle, aSeed, aSpeed, aSize, aPhase;
uniform float uTime, uOriginY, uRadius, uHeight, uHeightScale, uSpread, uEndY, uDocumentYaw;
uniform float uReveal, uPixelRatio, uHover, uMotion, uDocumentFront;
uniform float uActivation, uEnhanced;
uniform vec2 uViewport;
varying float vT, vSeed, vSpark, vHue, vPulse;
varying vec3 vDocumentEdge;
void main() {
  float clock = uTime; // The controller freezes the clock when motion is disabled.
  float t = holoTravel(clock, aSpeed * 1.1, aPhase);
  vT = t;
  vSeed = aSeed;
  vHue = holoTravel(clock, 0.035, aSeed);

  // Duesenprofil: harter Schub am Austritt, danach bremst das Abgas ab.
  float rise = 1.0 - pow(1.0 - t, 2.1);

  // Sprudeln: drei ueberlagerte Wirbel unterschiedlicher Frequenz.
  float churn = holoWave(clock, 3.1, aSeed * 61.0 + t * 23.0)
              + holoWave(clock, 1.9, -aSeed * 37.0 + t * 13.0) * 0.55
              + holoWave(clock, 5.3, aSeed * 97.0 + t * 41.0) * 0.3;

  // Der Strahl tritt eng am weissen Ring aus und faechert nach oben
  // kegelfoermig auf, wie eine sich entspannende Abgasfahne.
  float swirl = aAngle + t * (1.2 + (aSeed - 0.5) * 1.4) + holoWave(clock, 1.4, aSeed * 7.0) * .08;
  float r = uRadius * (1.0 - 0.05 * t)
          + (aSeed - 0.5) * 0.055
          + churn * 0.018 * (0.25 + t * 1.6)
          + t * t * uSpread;

  vec3 p;
  p.x = cos(swirl) * r;
  p.z = sin(swirl) * r;
  float availableHeight = max(0.0, uEndY - uOriginY - 0.015);
  p.y = uOriginY + clamp(rise * min(uHeight * uHeightScale, availableHeight)
    + churn * 0.025, 0.0, availableHeight);

  // Clip the whole sprite at the projected document edge. A height
  // limit alone lets foreground particles overlap it in perspective.
  vec3 edgeDirection = vec3(cos(uDocumentYaw), 0.0, -sin(uDocumentYaw));
  vec3 edgeCentre = vec3(0.0, uEndY, uDocumentFront);
  vec4 a = projectionMatrix * modelViewMatrix * vec4(edgeCentre - edgeDirection, 1.0);
  vec4 b = projectionMatrix * modelViewMatrix * vec4(edgeCentre + edgeDirection, 1.0);
  vec4 source = projectionMatrix * modelViewMatrix * vec4(0.0, uOriginY, 0.0, 1.0);
  vec2 edgeA = (a.xy / a.w * 0.5 + 0.5) * uViewport;
  vec2 edgeB = (b.xy / b.w * 0.5 + 0.5) * uViewport;
  vec2 sourcePixel = (source.xy / source.w * 0.5 + 0.5) * uViewport;
  vec2 direction = edgeB - edgeA;
  vec2 normal = vec2(-direction.y, direction.x) / max(length(direction), 0.001);
  normal *= dot(sourcePixel - edgeA, normal) < 0.0 ? -1.0 : 1.0;
  vDocumentEdge = vec3(normal, -dot(normal, edgeA));

  // Stetiges Verwehen statt harter Kante: die Fahne loest sich oben auf.
  vPulse = uEnhanced * uMotion * holoActivation(t, uActivation);
  vSpark = smoothstep(0.0, 0.04, t) * pow(1.0 - t, 0.7);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  // Perspektivisch korrekte Punktgroesse: der Strahl wird beim
  // Heranfahren groesser, statt in einer festen Groesse zu kleben.
  gl_PointSize = clamp(aSize * (0.45 + t * 1.75) * (1.0 + uHover * 0.3)
    * uPixelRatio * (24.5 / max(9.0, -mv.z)) * uReveal, 0.0, 12.0 * uPixelRatio);
  gl_Position = projectionMatrix * mv;
}
