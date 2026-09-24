export const ORRERY_LIGHT_COUNT = 6;

// Preserve the exported PBR material and its maps. Only the source of incident
// light is changed: the foreground's ambient/environment lights must not reveal
// the Orrery. No emissive colour, wire contour or glow geometry is added.
export function createOrreryMaterial(source, uniforms, distant = false) {
  const material = source.clone();
  material.transparent = true;
  material.forceSinglePass = true;
  material.depthWrite = false;
  material.fog = false;
  material.userData.orreryUniforms = uniforms;
  material.userData.orreryDistant = distant;
  material.customProgramCacheKey = () => 'orrery-local-pbr-v2';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms, { uOrreryDistant: { value: distant ? 1 : 0 } });
    shader.vertexShader = 'varying vec3 vOrreryWorld;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `
      #include <worldpos_vertex>
      vOrreryWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
    `);
    shader.fragmentShader = `
      varying vec3 vOrreryWorld;
      uniform vec4 uOrreryLights[${ORRERY_LIGHT_COUNT}];
      uniform float uOrreryEnergy[${ORRERY_LIGHT_COUNT}];
      uniform vec4 uOrreryInspection;
      uniform float uOrreryVisible, uOrreryDocument, uOrreryRear, uOrreryDistant;
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
      void main() {
        // Discard entirely dark surfaces before normal/BRDF evaluation.
        float activeEnergy = uOrreryRear * uOrreryDistant;
        for (int i = 0; i < ${ORRERY_LIGHT_COUNT}; i++) activeEnergy += uOrreryEnergy[i];
        if (activeEnergy * uOrreryVisible <= 0.0
          && uOrreryInspection.w <= 0.0) discard;
            float stageDepth = -(viewMatrix * vec4(0.0, -5.0, 0.0, 1.0)).z;
      float fragmentDepth = -(viewMatrix * vec4(vOrreryWorld, 1.0)).z;
      float orreryDepthFade = smoothstep(-8.0, 2.0, fragmentDepth - stageDepth) * smoothstep(5.0, 10.0, fragmentDepth);
      if (orreryDepthFade <= 0.0) discard;
        bool withinLight = uOrreryRear * uOrreryDistant > 0.0 || uOrreryInspection.w > 0.0;
        for (int i = 0; i < ${ORRERY_LIGHT_COUNT}; i++) {
          vec3 offset = vOrreryWorld - uOrreryLights[i].xyz;
          withinLight = withinLight || (uOrreryEnergy[i] > 0.0 && dot(offset, offset) < uOrreryLights[i].w * uOrreryLights[i].w);
        }
        if (!withinLight) discard;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', `
      vec3 geometryPosition = -vViewPosition;
      vec3 geometryNormal = normal;
      vec3 geometryViewDir = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vViewPosition);
      vec3 geometryClearcoatNormal = vec3(0.0);
      float orreryExposure = 0.0;

      for (int i = 0; i < ${ORRERY_LIGHT_COUNT + 1}; i++) {
        vec3 lightPosition;
        float radius, energy;
        if (i < ${ORRERY_LIGHT_COUNT}) {
          lightPosition = uOrreryLights[i].xyz;
          radius = uOrreryLights[i].w;
          energy = uOrreryEnergy[i] * uOrreryVisible * mix(1.0, 0.28, uOrreryDocument);
        } else {
          // Inspection uses the same PBR response, without a colour overlay.
          lightPosition = uOrreryInspection.xyz + vec3(3.0, 7.0, 10.0);
          radius = uOrreryInspection.w + 14.0;
          energy = uOrreryInspection.w > 0.0 ? 5.0 : 0.0;
        }
        if (energy <= 0.0) continue;
        float distanceToLight = distance(lightPosition, vOrreryWorld);
        if (distanceToLight >= radius) continue;
        float falloff = 1.0 - smoothstep(radius * 0.25, radius, distanceToLight);
        float strength = energy * falloff * falloff;
        orreryExposure += strength;
        IncidentLight localLight;
        localLight.direction = normalize((viewMatrix * vec4(lightPosition, 1.0)).xyz - geometryPosition);
        localLight.color = vec3(1.0, 0.97, 0.92) * strength;
        localLight.visible = true;
        RE_Direct(localLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
      }
      // A restrained two-sided key reveals the existing distant machines
      // when orbiting behind the pedestals, retaining their original PBR finish.
      float rearEnergy = uOrreryRear * uOrreryDistant * uOrreryVisible * mix(1.0, 0.28, uOrreryDocument);
      if (rearEnergy > 0.0) {
        for (int side = 0; side < 2; side++) {
          IncidentLight rearLight;
          rearLight.direction = normalize(vec3(side == 0 ? -0.6 : 0.8, 0.65, side == 0 ? 1.0 : -0.5));
          rearLight.color = vec3(0.86, 0.92, 1.0) * rearEnergy * (side == 0 ? 1.8 : 0.8);
          rearLight.visible = true;
          RE_Direct(rearLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
        }
        orreryExposure += rearEnergy;
      }
      if (orreryExposure < 0.0001) discard;
    `);
    // Exclude the stage's indirect light while keeping material colour,
    // roughness, metalness, normals, UVs, texture sampling and the PBR response.
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_fragment_maps>', '')
      .replace('#include <lights_fragment_end>', '')
      .replace('#include <opaque_fragment>', `
        outgoingLight *= exp(-pow(length(vViewPosition) * 0.0074, 2.0));
        // Back-facing or unlit metal must not leave black silhouettes over
        // the stage. Visibility follows reflected light, never a colour mask.
        float reflectedBrightness = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b));
        if (reflectedBrightness < 0.002) discard;
        diffuseColor.a *= orreryDepthFade * smoothstep(0.002, 0.06, reflectedBrightness)
          * smoothstep(0.0, 0.12, orreryExposure);
        #include <opaque_fragment>
      `);
  };
  return material;
}
