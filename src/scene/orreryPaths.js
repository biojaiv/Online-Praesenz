import * as THREE from 'three';

const TAU = Math.PI * 2;
const local = new THREE.Vector3(), scale = new THREE.Vector3();

/** Light routes attached to the actual moving Blender pivots and authored bars. */
export function createOrreryPaths(root) {
  const paths = [];
  const add = (carrier, radius, y = 0, start = null, end = null) => {
    const path = { carrier, radius, y, start, end, inverse: new THREE.Matrix4(), length: 1,
      name: carrier.userData.sourceName, isLine: Boolean(start) };
    path.point = (t, target) => {
      if (path.isLine) target.copy(start).lerp(end, t);
      else target.set(Math.cos(t * TAU) * radius, y, Math.sin(t * TAU) * radius);
      return target.applyMatrix4(carrier.matrixWorld);
    };
    path.closest = point => {
      local.copy(point).applyMatrix4(path.inverse);
      if (!path.isLine) return THREE.MathUtils.euclideanModulo(Math.atan2(local.z, local.x) / TAU, 1);
      return THREE.MathUtils.clamp(local.sub(start).dot(path.direction) / path.localLengthSq, 0, 1);
    };
    if (path.isLine) {
      path.direction = end.clone().sub(start);
      path.localLengthSq = path.direction.lengthSq();
    }
    paths.push(path);
  };
  root.traverse(object => {
    const name = object.userData.sourceName || '';
    let match;
    if ((match = name.match(/ \/ Ring (\d+)$/))) add(object, [16, 19.5, 22.5, 30, 34.5, 40, 47, 54][+match[1]]);
    else if ((match = name.match(/ \/ Laufbahn (\d+)$/))) {
      const i = +match[1];
      // The two real rails sit above/below the pivot, connected by rungs.
      add(object, [26.4, 43.5][i], [1.15, 1.5][i] / 2);
      add(object, [26.4, 43.5][i], -[1.15, 1.5][i] / 2);
    } else if ((match = name.match(/ \/ Kardan (\d+) \/ Eigenrotation$/))) add(object, [10.2, 11.4, 12.8][+match[1]]);
    else if ((match = name.match(/ \/ Aussenring (\d+) \/ Eigenrotation$/))) add(object, [36, 49, 63][+match[1]]);
    else if ((match = name.match(/ \/ Armillarring (\d+) \/ Eigenrotation$/))) add(object, [46, 56][+match[1]]);
    else if ((match = name.match(/ \/ Wanderringneigung (\d+)$/))) add(object, [25, 44][+match[1]]);
    else if (name.endsWith(' / Kern')) {
      const count = name.startsWith('01 ') ? 7 : 4;
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        add(object, 2.4 + t * 6.2, Math.sin(t * Math.PI * 1.35 + .4) * 1.4 - .5 + t * .6);
      }
    } else if (name === 'SOCKELUMGEBUNG / Skalenringe') {
      add(object, 30, -4.2);
      // The second halo is tilted in its mesh, so don't invent a flat path for it.
    }
    if (object.userData.lightRailsJSON) {
      for (const rail of JSON.parse(object.userData.lightRailsJSON)) {
        add(object, 0, 0, new THREE.Vector3(...rail.slice(0, 3)), new THREE.Vector3(...rail.slice(3)));
      }
    }
  });
  return {
    paths,
    update() {
      for (const path of paths) {
        path.inverse.copy(path.carrier.matrixWorld).invert();
        scale.setFromMatrixScale(path.carrier.matrixWorld);
        path.length = (path.isLine ? Math.sqrt(path.localLengthSq) : TAU * path.radius) * scale.x;
      }
    },
  };
}

export function isPathVisible(path) {
  for (let parent = path.carrier; parent; parent = parent.parent) if (!parent.visible) return false;
  return true;
}

export function circleMotionSpeed(name, speed) {
  let factor = 1;
  if (/ \/ (Ring|Laufbahn|Wanderring) \d+$/.test(name)) factor = 1.8;
  else if (/ \/ (Aussenring|Armillarring) \d+ \/ /.test(name)) factor = 2.2;
  else if (/ \/ Kardan \d+ \/ /.test(name)) factor = 1.65;
  else if (name.endsWith(' / Hauptscheibe')) factor = 1.7;
  else if (name.endsWith(' / Kern')) factor = 1.2;
  else if (name.endsWith(' / Gesamtdrehung')) factor = 1.5;
  // Larger rings stay under ~4 degrees/s; small rotating accessories under 6.
  const cap = /^(Sphaerenkaefig|Zusatz)/.test(name) ? .10 : .07;
  return Math.sign(speed) * Math.min(Math.abs(speed) * factor, cap);
}
