import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Die Dreifachhelix.
 *
 * Zwischen Projektion und Lesefassung steht ein kurzer Moment: aus der Mitte
 * der Sockeloberflaeche stroemen Partikel nach oben und legen sich dabei auf
 * drei Straenge, die einander umlaufen — mit Querverbindungen wie
 * Basenpaare. Aus dieser Helix tritt die Lesefassung heraus; danach verweht
 * sie nach oben.
 *
 * Es gibt nur einen Zeichenaufruf. Aufstieg (`uForm`) und Verwehen
 * (`uRelease`) sind zwei Zahlen, die von aussen getweent werden; die Bahn
 * selbst rechnet der Vertex-Shader. Kein Partikel wird je auf der CPU
 * bewegt.
 */

const STRANDS = 3;
const PER_STRAND = 620;
const RUNGS = 720;
const TAU = Math.PI * 2;

/** Vorlauf der unteren Partikel: sie formieren sich, bevor die oberen folgen. */
const LEAD = 0.55;

function hash(n) {
  const value = Math.sin(n) * 43758.5453123;
  return value - Math.floor(value);
}

export function makeTripleHelix(time, { reduced = false } = {}) {
  const count = STRANDS * PER_STRAND + RUNGS;
  const positions = new Float32Array(count * 3);   // Platzhalter, der Shader setzt die Bahn
  const alongs = new Float32Array(count);
  const strands = new Float32Array(count);
  const rungs = new Float32Array(count);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const onStrand = index < STRANDS * PER_STRAND;
    const t = onStrand
      ? (index % PER_STRAND) / (PER_STRAND - 1)
      : hash(index * 1.71 + 5.3);
    alongs[index] = t;
    // Die Querverbindungen sitzen in Stufen, nicht beliebig: sonst entsteht
    // ein Nebel statt einer Leiter.
    if (onStrand) {
      strands[index] = Math.floor(index / PER_STRAND);
      rungs[index] = -1;
    } else {
      const step = Math.floor(hash(index * 3.19 + 11.7) * 26) / 26;
      alongs[index] = 0.04 + step * 0.94;
      strands[index] = Math.floor(hash(index * 5.41 + 2.9) * STRANDS);
      rungs[index] = hash(index * 7.13 + 19.4);
    }
    seeds[index] = hash(index * 9.77 + 31.1);
    const sizeSeed = hash(index * 13.31 + 41.9);
    sizes[index] = (onStrand ? 0.42 : 0.3) + sizeSeed * sizeSeed * 1.15;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAlong', new THREE.BufferAttribute(alongs, 1));
  geometry.setAttribute('aStrand', new THREE.BufferAttribute(strands, 1));
  geometry.setAttribute('aRung', new THREE.BufferAttribute(rungs, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 32);

  const uniforms = {
    uTime: time,
    uForm: { value: 0 },
    uRelease: { value: 0 },
    uOpacity: { value: 0 },
    uOriginY: { value: 0 },
    uHeight: { value: 4 },
    uRadius: { value: 0.9 },
    uTurns: { value: 2.6 },
    uPixelRatio: { value: 1 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAlong, aStrand, aRung, aSeed, aSize;
      uniform float uTime, uForm, uRelease, uOriginY, uHeight, uRadius, uTurns, uPixelRatio;
      varying float vAlong, vSeed, vForm, vRung;

      const float TAU = 6.28318530718;

      /** Punkt auf einem Strang. p = 0 heisst: noch in der Achse, unten. */
      vec3 strandPoint(float strand, float t, float p) {
        float angle = t * uTurns * TAU + strand * TAU / 3.0 + uTime * 0.28;
        // Der Faden schnuert unten zusammen und laeuft oben leicht aus.
        float profile = mix(0.14, 1.0, smoothstep(0.0, 0.24, t)) * (1.0 - 0.1 * t);
        float ease = p * p * (3.0 - 2.0 * p);
        float radius = uRadius * profile * ease * (1.0 + 0.16 * sin(3.14159 * p));
        return vec3(
          cos(angle) * radius,
          uOriginY + uHeight * t * ease,
          sin(angle) * radius
        );
      }

      void main() {
        float t = aAlong;
        // Untere Partikel sind zuerst am Ziel: der Strom waechst nach oben.
        float p = clamp((uForm * (1.0 + LEAD_PLACEHOLDER) - t * LEAD_PLACEHOLDER), 0.0, 1.0);
        vAlong = t;
        vSeed = aSeed;
        vForm = p;
        vRung = aRung;

        vec3 pos;
        if (aRung < 0.0) {
          pos = strandPoint(aStrand, t, p);
        } else {
          float other = mod(aStrand + 1.0, 3.0);
          pos = mix(strandPoint(aStrand, t, p), strandPoint(other, t, p), aRung);
        }

        // Feines Zittern, damit die Bahn lebt statt zu stehen.
        pos += vec3(
          sin(uTime * 2.3 + aSeed * 51.0) * 0.012,
          cos(uTime * 1.7 + aSeed * 33.0) * 0.016,
          sin(uTime * 2.9 + aSeed * 77.0) * 0.012
        );

        // Verwehen: die Helix oeffnet sich nach aussen und steigt weiter.
        pos.xz *= 1.0 + uRelease * 2.4;
        pos.y += uHeight * 0.42 * uRelease;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = aSize * (0.55 + 0.75 * p) * uPixelRatio * (26.0 / max(9.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `.replace(/LEAD_PLACEHOLDER/g, LEAD.toFixed(3)),
    fragmentShader: /* glsl */`
      uniform float uOpacity, uRelease, uTime;
      varying float vAlong, vSeed, vForm, vRung;
      vec3 hue2rgb(float h) {
        return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      }
      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float d = length(point);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);

        // Farbverlauf von Faserblau am Austritt zu Amber an der Spitze —
        // dieselben beiden Leitfarben wie im uebrigen Bild.
        vec3 tone = hue2rgb(mix(0.55, 0.08, vAlong) + vSeed * 0.02);
        vec3 color = mix(vec3(1.0, 0.97, 0.92), tone, smoothstep(0.05, 0.4, vAlong));
        // Querverbindungen bleiben blasser: die Straenge fuehren das Auge.
        float weight = vRung < 0.0 ? 1.0 : 0.55;
        float flicker = 0.7 + 0.3 * sin(uTime * 4.1 + vSeed * 63.0);

        float alpha = core * uOpacity * weight * flicker
          * smoothstep(0.0, 0.12, vForm)
          * pow(1.0 - uRelease, 1.6);
        if (alpha < 0.006) discard;
        gl_FragColor = vec4(color * 1.2, alpha);
      }
    `,
  });

  const group = new THREE.Group();
  group.userData.kind = 'triple-helix';
  group.add(new THREE.Points(geometry, material));
  group.visible = false;

  /** Ein einzelner Lauf; ein neuer Auftrag bricht den alten sauber ab. */
  let animation = null;
  let pending = null;

  /**
   * Fuehrt mehrere Uniforms gemeinsam an ihr Ziel und meldet sich, wenn der
   * Lauf steht. Bei `prefers-reduced-motion` springen die Werte sofort.
   *
   * Ein abgebrochener Lauf gilt als beendet: sonst wartete der Aufrufer, der
   * die Sequenz treibt, ewig auf ein Versprechen, das gsap nie mehr einloest.
   */
  function run(steps) {
    animation?.kill();
    animation = null;
    pending?.();
    pending = null;
    if (reduced) {
      for (const [key, { value }] of Object.entries(steps)) uniforms[key].value = value;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      pending = resolve;
      animation = gsap.timeline({
        onComplete() { pending = null; animation = null; resolve(); },
      });
      for (const [key, step] of Object.entries(steps)) {
        animation.to(uniforms[key], {
          value: step.value,
          duration: step.duration,
          ease: step.ease ?? 'sine.inOut',
        }, step.at ?? 0);
      }
    });
  }

  function reset() {
    uniforms.uForm.value = 0;
    uniforms.uRelease.value = 0;
    uniforms.uOpacity.value = 0;
    group.visible = false;
  }

  return {
    group,
    uniforms,
    setPixelRatio(value) { uniforms.uPixelRatio.value = value; },

    /**
     * Hoehe und Weite der Helix folgen dem Dokumentfenster: sie steigt von der
     * Sockeloberkante bis zur Oberkante des Blattes.
     */
    setWindow(originY, height, width) {
      uniforms.uOriginY.value = originY;
      uniforms.uHeight.value = Math.max(0.5, height);
      uniforms.uRadius.value = THREE.MathUtils.clamp(width * 0.15, 0.35, 1.35);
      uniforms.uTurns.value = THREE.MathUtils.clamp(height * 0.55, 1.6, 4.2);
    },

    /** Aufstieg: der Strom tritt aus der Achse und legt sich auf die Straenge. */
    rise(duration = 0.95) {
      uniforms.uRelease.value = 0;
      uniforms.uForm.value = 0;
      group.visible = true;
      return run({
        uOpacity: { value: 1, duration: duration * 0.4, ease: 'power1.out' },
        uForm: { value: 1, duration, ease: 'power2.out' },
      });
    },

    /** Freigabe: die Helix oeffnet sich und verweht, die Lesefassung tritt hervor. */
    async release(duration = 0.9) {
      if (!group.visible) return;
      await run({
        uRelease: { value: 1, duration, ease: 'power2.in' },
        uOpacity: { value: 0, duration, ease: 'power2.in', at: duration * 0.25 },
      });
      reset();
    },

    /** Rueckweg: der Strom sinkt in den Sockel zurueck. */
    async sink(duration = 0.55) {
      if (!group.visible) return;
      await run({
        uForm: { value: 0, duration, ease: 'power2.inOut' },
        uOpacity: { value: 0, duration: duration * 0.8, ease: 'power2.in', at: duration * 0.2 },
      });
      reset();
    },

    reset,

    dispose() {
      animation?.kill();
      pending?.();
      geometry.dispose();
      material.dispose();
    },
  };
}
