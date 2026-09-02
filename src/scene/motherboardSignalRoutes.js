import * as THREE from 'three';
import { lightColor } from './palette.js';

const MAX_ACTIVE = 2;
const FIRST_SPAWN_MIN = 1.786;
const FIRST_SPAWN_MAX = 3.357;
const SPAWN_MIN = 2.643;
const SPAWN_MAX = 4.643;
const STAMP_STEP = 0.014;
const VANISHING_MIN_V = 0.355;

/*
 * PERSPECTIVE_ROUTE_ATLAS_V3
 *
 * These are image-space polylines traced over every visually continuous,
 * perspective-relevant floor corridor in motherboard-universe.jpg. UV V=0 is
 * the foreground/bottom edge, V~0.37 the central vanishing zone. Horizontal
 * and short diagonal turns intentionally follow the circuit-board geometry;
 * no free-space random routes are generated.
 */
const ROUTES = [
  { long: false, points: [[0.006000,0.155000],[0.050000,0.155000],[0.050000,0.170000],[0.105000,0.170000],[0.105000,0.188000],[0.168000,0.188000],[0.168000,0.212000],[0.230000,0.212000],[0.230000,0.238000],[0.300000,0.238000],[0.300000,0.270000],[0.365000,0.270000],[0.365000,0.300000],[0.420000,0.300000],[0.420000,0.330000],[0.472000,0.365000]] },
  { long: false, points: [[0.994000,0.155000],[0.950000,0.155000],[0.950000,0.170000],[0.895000,0.170000],[0.895000,0.188000],[0.832000,0.188000],[0.832000,0.212000],[0.770000,0.212000],[0.770000,0.238000],[0.700000,0.238000],[0.700000,0.270000],[0.635000,0.270000],[0.635000,0.300000],[0.580000,0.300000],[0.580000,0.330000],[0.528000,0.365000]] },
  { long: false, points: [[0.012000,0.112000],[0.062000,0.112000],[0.062000,0.130000],[0.118000,0.130000],[0.118000,0.150000],[0.182000,0.150000],[0.182000,0.174000],[0.245000,0.174000],[0.245000,0.205000],[0.312000,0.205000],[0.312000,0.244000],[0.375000,0.244000],[0.375000,0.282000],[0.431000,0.282000],[0.431000,0.325000],[0.478000,0.364000]] },
  { long: false, points: [[0.988000,0.112000],[0.938000,0.112000],[0.938000,0.130000],[0.882000,0.130000],[0.882000,0.150000],[0.818000,0.150000],[0.818000,0.174000],[0.755000,0.174000],[0.755000,0.205000],[0.688000,0.205000],[0.688000,0.244000],[0.625000,0.244000],[0.625000,0.282000],[0.569000,0.282000],[0.569000,0.325000],[0.522000,0.364000]] },
  { long: true, points: [[0.020000,0.072000],[0.070000,0.072000],[0.070000,0.092000],[0.126000,0.092000],[0.126000,0.116000],[0.190000,0.116000],[0.190000,0.145000],[0.253000,0.145000],[0.253000,0.180000],[0.318000,0.180000],[0.318000,0.221000],[0.380000,0.221000],[0.380000,0.268000],[0.435000,0.268000],[0.435000,0.318000],[0.482000,0.364000]] },
  { long: true, points: [[0.980000,0.072000],[0.930000,0.072000],[0.930000,0.092000],[0.874000,0.092000],[0.874000,0.116000],[0.810000,0.116000],[0.810000,0.145000],[0.747000,0.145000],[0.747000,0.180000],[0.682000,0.180000],[0.682000,0.221000],[0.620000,0.221000],[0.620000,0.268000],[0.565000,0.268000],[0.565000,0.318000],[0.518000,0.364000]] },
  { long: true, points: [[0.034000,0.032000],[0.082000,0.032000],[0.082000,0.054000],[0.138000,0.054000],[0.138000,0.082000],[0.196000,0.082000],[0.196000,0.116000],[0.258000,0.116000],[0.258000,0.156000],[0.322000,0.156000],[0.322000,0.205000],[0.381000,0.205000],[0.381000,0.257000],[0.437000,0.257000],[0.437000,0.314000],[0.483000,0.363000]] },
  { long: true, points: [[0.966000,0.032000],[0.918000,0.032000],[0.918000,0.054000],[0.862000,0.054000],[0.862000,0.082000],[0.804000,0.082000],[0.804000,0.116000],[0.742000,0.116000],[0.742000,0.156000],[0.678000,0.156000],[0.678000,0.205000],[0.619000,0.205000],[0.619000,0.257000],[0.563000,0.257000],[0.563000,0.314000],[0.517000,0.363000]] },
  { long: true, points: [[0.076000,0.010000],[0.105000,0.010000],[0.105000,0.034000],[0.158000,0.034000],[0.158000,0.063000],[0.212000,0.063000],[0.212000,0.099000],[0.270000,0.099000],[0.270000,0.142000],[0.329000,0.142000],[0.329000,0.194000],[0.386000,0.194000],[0.386000,0.248000],[0.440000,0.248000],[0.440000,0.310000],[0.484000,0.363000]] },
  { long: true, points: [[0.924000,0.010000],[0.895000,0.010000],[0.895000,0.034000],[0.842000,0.034000],[0.842000,0.063000],[0.788000,0.063000],[0.788000,0.099000],[0.730000,0.099000],[0.730000,0.142000],[0.671000,0.142000],[0.671000,0.194000],[0.614000,0.194000],[0.614000,0.248000],[0.560000,0.248000],[0.560000,0.310000],[0.516000,0.363000]] },
  { long: true, points: [[0.118000,0.002000],[0.144000,0.002000],[0.144000,0.028000],[0.190000,0.028000],[0.190000,0.060000],[0.240000,0.060000],[0.240000,0.098000],[0.293000,0.098000],[0.293000,0.144000],[0.346000,0.144000],[0.346000,0.196000],[0.397000,0.196000],[0.397000,0.252000],[0.446000,0.252000],[0.446000,0.315000],[0.486000,0.364000]] },
  { long: true, points: [[0.882000,0.002000],[0.856000,0.002000],[0.856000,0.028000],[0.810000,0.028000],[0.810000,0.060000],[0.760000,0.060000],[0.760000,0.098000],[0.707000,0.098000],[0.707000,0.144000],[0.654000,0.144000],[0.654000,0.196000],[0.603000,0.196000],[0.603000,0.252000],[0.554000,0.252000],[0.554000,0.315000],[0.514000,0.364000]] },
  { long: true, points: [[0.164000,0.000000],[0.184000,0.000000],[0.184000,0.026000],[0.225000,0.026000],[0.225000,0.058000],[0.269000,0.058000],[0.269000,0.099000],[0.315000,0.099000],[0.315000,0.148000],[0.362000,0.148000],[0.362000,0.201000],[0.407000,0.201000],[0.407000,0.258000],[0.451000,0.258000],[0.451000,0.320000],[0.487000,0.364000]] },
  { long: true, points: [[0.836000,0.000000],[0.816000,0.000000],[0.816000,0.026000],[0.775000,0.026000],[0.775000,0.058000],[0.731000,0.058000],[0.731000,0.099000],[0.685000,0.099000],[0.685000,0.148000],[0.638000,0.148000],[0.638000,0.201000],[0.593000,0.201000],[0.593000,0.258000],[0.549000,0.258000],[0.549000,0.320000],[0.513000,0.364000]] },
  { long: true, points: [[0.208000,0.000000],[0.226000,0.000000],[0.226000,0.026000],[0.260000,0.026000],[0.260000,0.060000],[0.298000,0.060000],[0.298000,0.102000],[0.337000,0.102000],[0.337000,0.151000],[0.377000,0.151000],[0.377000,0.205000],[0.417000,0.205000],[0.417000,0.263000],[0.455000,0.263000],[0.455000,0.324000],[0.488000,0.364000]] },
  { long: true, points: [[0.792000,0.000000],[0.774000,0.000000],[0.774000,0.026000],[0.740000,0.026000],[0.740000,0.060000],[0.702000,0.060000],[0.702000,0.102000],[0.663000,0.102000],[0.663000,0.151000],[0.623000,0.151000],[0.623000,0.205000],[0.583000,0.205000],[0.583000,0.263000],[0.545000,0.263000],[0.545000,0.324000],[0.512000,0.364000]] },
  { long: true, points: [[0.252000,0.000000],[0.270000,0.000000],[0.270000,0.028000],[0.300000,0.028000],[0.300000,0.064000],[0.330000,0.064000],[0.330000,0.108000],[0.360000,0.108000],[0.360000,0.157000],[0.390000,0.157000],[0.390000,0.210000],[0.423000,0.210000],[0.423000,0.268000],[0.458000,0.268000],[0.458000,0.327000],[0.488000,0.364000]] },
  { long: true, points: [[0.748000,0.000000],[0.730000,0.000000],[0.730000,0.028000],[0.700000,0.028000],[0.700000,0.064000],[0.670000,0.064000],[0.670000,0.108000],[0.640000,0.108000],[0.640000,0.157000],[0.610000,0.157000],[0.610000,0.210000],[0.577000,0.210000],[0.577000,0.268000],[0.542000,0.268000],[0.542000,0.327000],[0.512000,0.364000]] },
  { long: true, points: [[0.296000,0.000000],[0.312000,0.000000],[0.312000,0.034000],[0.337000,0.034000],[0.337000,0.075000],[0.361000,0.075000],[0.361000,0.119000],[0.384000,0.119000],[0.384000,0.165000],[0.406000,0.165000],[0.406000,0.216000],[0.431000,0.216000],[0.431000,0.272000],[0.461000,0.272000],[0.461000,0.329000],[0.489000,0.364000]] },
  { long: true, points: [[0.704000,0.000000],[0.688000,0.000000],[0.688000,0.034000],[0.663000,0.034000],[0.663000,0.075000],[0.639000,0.075000],[0.639000,0.119000],[0.616000,0.119000],[0.616000,0.165000],[0.594000,0.165000],[0.594000,0.216000],[0.569000,0.216000],[0.569000,0.272000],[0.539000,0.272000],[0.539000,0.329000],[0.511000,0.364000]] },
  { long: true, points: [[0.334000,0.000000],[0.350000,0.000000],[0.350000,0.038000],[0.366000,0.038000],[0.366000,0.074000],[0.348000,0.092000],[0.348000,0.135000],[0.330000,0.154000],[0.330000,0.188000],[0.365000,0.188000],[0.365000,0.220000],[0.404000,0.220000],[0.404000,0.258000],[0.440000,0.258000],[0.440000,0.302000],[0.472000,0.302000],[0.490000,0.364000]] },
  { long: true, points: [[0.666000,0.000000],[0.650000,0.000000],[0.650000,0.038000],[0.634000,0.038000],[0.634000,0.074000],[0.652000,0.092000],[0.652000,0.135000],[0.670000,0.154000],[0.670000,0.188000],[0.635000,0.188000],[0.635000,0.220000],[0.596000,0.220000],[0.596000,0.258000],[0.560000,0.258000],[0.560000,0.302000],[0.528000,0.302000],[0.510000,0.364000]] },
  { long: true, points: [[0.366000,0.000000],[0.382000,0.000000],[0.382000,0.040000],[0.398000,0.040000],[0.398000,0.070000],[0.372000,0.095000],[0.372000,0.130000],[0.354000,0.149000],[0.354000,0.185000],[0.382000,0.185000],[0.382000,0.222000],[0.414000,0.222000],[0.414000,0.260000],[0.445000,0.260000],[0.445000,0.306000],[0.475000,0.306000],[0.490000,0.364000]] },
  { long: true, points: [[0.634000,0.000000],[0.618000,0.000000],[0.618000,0.040000],[0.602000,0.040000],[0.602000,0.070000],[0.628000,0.095000],[0.628000,0.130000],[0.646000,0.149000],[0.646000,0.185000],[0.618000,0.185000],[0.618000,0.222000],[0.586000,0.222000],[0.586000,0.260000],[0.555000,0.260000],[0.555000,0.306000],[0.525000,0.306000],[0.510000,0.364000]] },
  { long: true, points: [[0.397000,0.000000],[0.414000,0.000000],[0.414000,0.040000],[0.432000,0.040000],[0.432000,0.069000],[0.405000,0.096000],[0.405000,0.126000],[0.376000,0.150000],[0.376000,0.184000],[0.399000,0.184000],[0.399000,0.222000],[0.426000,0.222000],[0.426000,0.263000],[0.452000,0.263000],[0.452000,0.309000],[0.478000,0.309000],[0.491000,0.364000]] },
  { long: true, points: [[0.603000,0.000000],[0.586000,0.000000],[0.586000,0.040000],[0.568000,0.040000],[0.568000,0.069000],[0.595000,0.096000],[0.595000,0.126000],[0.624000,0.150000],[0.624000,0.184000],[0.601000,0.184000],[0.601000,0.222000],[0.574000,0.222000],[0.574000,0.263000],[0.548000,0.263000],[0.548000,0.309000],[0.522000,0.309000],[0.509000,0.364000]] },
  { long: true, points: [[0.430000,0.000000],[0.446000,0.000000],[0.446000,0.043000],[0.462000,0.043000],[0.462000,0.070000],[0.428000,0.100000],[0.428000,0.126000],[0.392000,0.156000],[0.392000,0.184000],[0.415000,0.184000],[0.415000,0.223000],[0.438000,0.223000],[0.438000,0.264000],[0.460000,0.264000],[0.460000,0.310000],[0.482000,0.310000],[0.492000,0.364000]] },
  { long: true, points: [[0.570000,0.000000],[0.554000,0.000000],[0.554000,0.043000],[0.538000,0.043000],[0.538000,0.070000],[0.572000,0.100000],[0.572000,0.126000],[0.608000,0.156000],[0.608000,0.184000],[0.585000,0.184000],[0.585000,0.223000],[0.562000,0.223000],[0.562000,0.264000],[0.540000,0.264000],[0.540000,0.310000],[0.518000,0.310000],[0.508000,0.364000]] },
  { long: true, points: [[0.094000,0.920000],[0.094000,0.780000],[0.128000,0.780000],[0.128000,0.665000],[0.168000,0.665000],[0.168000,0.575000],[0.225000,0.575000],[0.225000,0.505000],[0.292000,0.505000],[0.292000,0.455000],[0.368000,0.455000],[0.368000,0.412000],[0.458000,0.412000],[0.485000,0.369000]] },
  { long: true, points: [[0.906000,0.920000],[0.906000,0.780000],[0.872000,0.780000],[0.872000,0.665000],[0.832000,0.665000],[0.832000,0.575000],[0.775000,0.575000],[0.775000,0.505000],[0.708000,0.505000],[0.708000,0.455000],[0.632000,0.455000],[0.632000,0.412000],[0.542000,0.412000],[0.515000,0.369000]] },
  { long: true, points: [[0.178000,0.940000],[0.178000,0.790000],[0.218000,0.790000],[0.218000,0.675000],[0.270000,0.675000],[0.270000,0.585000],[0.320000,0.585000],[0.320000,0.510000],[0.378000,0.510000],[0.378000,0.452000],[0.438000,0.452000],[0.438000,0.410000],[0.487000,0.369000]] },
  { long: true, points: [[0.822000,0.940000],[0.822000,0.790000],[0.782000,0.790000],[0.782000,0.675000],[0.730000,0.675000],[0.730000,0.585000],[0.680000,0.585000],[0.680000,0.510000],[0.622000,0.510000],[0.622000,0.452000],[0.562000,0.452000],[0.562000,0.410000],[0.513000,0.369000]] },
  { long: true, points: [[0.292000,0.965000],[0.292000,0.825000],[0.330000,0.825000],[0.330000,0.715000],[0.360000,0.715000],[0.360000,0.615000],[0.398000,0.615000],[0.398000,0.525000],[0.435000,0.525000],[0.435000,0.458000],[0.468000,0.458000],[0.468000,0.410000],[0.488000,0.369000]] },
  { long: true, points: [[0.708000,0.965000],[0.708000,0.825000],[0.670000,0.825000],[0.670000,0.715000],[0.640000,0.715000],[0.640000,0.615000],[0.602000,0.615000],[0.602000,0.525000],[0.565000,0.525000],[0.565000,0.458000],[0.532000,0.458000],[0.532000,0.410000],[0.512000,0.369000]] },
  { long: true, points: [[0.405000,0.965000],[0.405000,0.815000],[0.426000,0.815000],[0.426000,0.695000],[0.445000,0.695000],[0.445000,0.595000],[0.462000,0.595000],[0.462000,0.510000],[0.477000,0.510000],[0.477000,0.447000],[0.490000,0.447000],[0.490000,0.369000]] },
  { long: true, points: [[0.595000,0.965000],[0.595000,0.815000],[0.574000,0.815000],[0.574000,0.695000],[0.555000,0.695000],[0.555000,0.595000],[0.538000,0.595000],[0.538000,0.510000],[0.523000,0.510000],[0.523000,0.447000],[0.510000,0.447000],[0.510000,0.369000]] },
  { long: true, points: [[0.018000,0.665000],[0.100000,0.665000],[0.100000,0.615000],[0.180000,0.615000],[0.180000,0.558000],[0.258000,0.558000],[0.258000,0.505000],[0.332000,0.505000],[0.332000,0.458000],[0.405000,0.458000],[0.405000,0.414000],[0.465000,0.414000],[0.489000,0.369000]] },
  { long: true, points: [[0.982000,0.665000],[0.900000,0.665000],[0.900000,0.615000],[0.820000,0.615000],[0.820000,0.558000],[0.742000,0.558000],[0.742000,0.505000],[0.668000,0.505000],[0.668000,0.458000],[0.595000,0.458000],[0.595000,0.414000],[0.535000,0.414000],[0.511000,0.369000]] },
  { long: true, points: [[0.482000,0.785000],[0.482000,0.705000],[0.491000,0.705000],[0.491000,0.625000],[0.500000,0.625000],[0.500000,0.552000],[0.493000,0.552000],[0.493000,0.485000],[0.500000,0.485000],[0.500000,0.430000],[0.497000,0.369000]] },
  { long: true, points: [[0.518000,0.785000],[0.518000,0.705000],[0.509000,0.705000],[0.509000,0.625000],[0.500000,0.625000],[0.500000,0.552000],[0.507000,0.552000],[0.507000,0.485000],[0.500000,0.485000],[0.500000,0.430000],[0.503000,0.369000]] },
];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function perspectiveScale(progress) {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  const eased = t * t * (3 - 2 * t);
  return THREE.MathUtils.lerp(1, 0.22, eased);
}

function routeGeometry(route, id, boardWidth, boardHeight, boardY, boardZ) {
  // TRUE_Z_DEPTH_V4_3: same image-space lanes, several real depth bands.
  const originV = route.points[0]?.[1] ?? 0;
  const architecture = originV > 0.42;
  const depthStart = architecture ? -52 + (id % 7) * 13 : -24 + (id % 9) * 6;
  const depthEnd = architecture ? 28 - (id % 5) * 11 : 18 - (id % 7) * 5;
  const lastIndex = Math.max(1, route.points.length - 1);
  const points = route.points.map(([u, v], index) => {
    const progress = index / lastIndex;
    const zWave = Math.sin((progress * Math.PI * 2) + id * 0.73) * (architecture ? 9 : 4);
    return new THREE.Vector3((u - 0.5) * boardWidth, boardY + (v - 0.5) * boardHeight,
      boardZ + 0.62 + THREE.MathUtils.lerp(depthStart, depthEnd, progress) + zWave);
  });
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumulative.push(cumulative[i - 1] + points[i].distanceTo(points[i - 1]));
  }
  return { ...route, id, points, cumulative, total: cumulative.at(-1) };
}

function pointOnRoute(route, progress, out = new THREE.Vector3()) {
  const target = THREE.MathUtils.clamp(progress, 0, 1) * route.total;
  let segment = 0;
  while (
    segment < route.cumulative.length - 2
    && route.cumulative[segment + 1] < target
  ) segment += 1;
  const a = route.points[segment];
  const b = route.points[segment + 1];
  const start = route.cumulative[segment];
  const end = route.cumulative[segment + 1];
  const local = end > start ? (target - start) / (end - start) : 0;
  return out.copy(a).lerp(b, local);
}

export function createMotherboardSignalRoutes({
  boardWidth,
  boardHeight,
  boardY = 0,
  boardZ,
  onReveal,
  onTerminate,
} = {}) {
  const group = new THREE.Group();
  group.userData.kind = 'motherboard-signal-routes';

  if (!(boardWidth > 0) || !(boardHeight > 0) || !Number.isFinite(boardZ)) {
    return {
      group,
      setEnabled() {},
      setCompact() {},
      setPixelRatio() {},
      update() {},
      dispose() {},
    };
  }

  const routes = ROUTES.map((route, index) =>
    routeGeometry(route, index, boardWidth, boardHeight, boardY, boardZ));

  const linePos = [];
  const lineDist = [];
  const lineId = [];
  for (const route of routes) {
    for (let i = 0; i < route.points.length - 1; i += 1) {
      const a = route.points[i];
      const b = route.points[i + 1];
      linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      lineDist.push(
        route.cumulative[i] / route.total,
        route.cumulative[i + 1] / route.total,
      );
      lineId.push(route.id, route.id);
    }
  }

  const count = routes.length;
  const stateData = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 1) stateData[i * 4] = -1;
  const stateTexture = new THREE.DataTexture(
    stateData, count, 1, THREE.RGBAFormat, THREE.FloatType,
  );
  stateTexture.minFilter = THREE.NearestFilter;
  stateTexture.magFilter = THREE.NearestFilter;
  stateTexture.needsUpdate = true;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  geometry.setAttribute('aDist', new THREE.Float32BufferAttribute(lineDist, 1));
  geometry.setAttribute('aId', new THREE.Float32BufferAttribute(lineId, 1));

  const uniforms = {
    uState: { value: stateTexture },
    uCount: { value: count },
    uCyan: { value: lightColor('fiber') },
    uAmber: { value: lightColor('amber') },
    uCompact: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      uniform sampler2D uState;
      uniform float uCount;
      attribute float aDist, aId;
      varying float vDist, vHead, vPulse, vTint, vScale;
      vec4 fetchState(float id) {
        return texture2D(uState, vec2((id + 0.5) / uCount, 0.5));
      }
      void main() {
        vec4 state = fetchState(aId);
        vDist = aDist;
        vHead = state.r;
        vPulse = state.g;
        vTint = state.b;
        vScale = state.a;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uCyan, uAmber;
      uniform float uCompact;
      varying float vDist, vHead, vPulse, vTint, vScale;
      void main() {
        if (vScale <= 0.001 || vHead < 0.0) discard;
        float behind = vHead - vDist;
        float trail = behind >= 0.0
          ? exp(-behind / max(vPulse * mix(0.62, 1.0, vScale), 0.001) * 3.25)
          : 0.0;
        float headWidth = mix(0.008, 0.020, vScale);
        float head = 1.0 - smoothstep(0.0, headWidth, abs(vDist - vHead));
        float energy = clamp(trail * 0.64 + head * 1.30, 0.0, 1.45) * vScale;
        if (energy < 0.018) discard;
        vec3 color = mix(uCyan, uAmber, vTint);
        color = mix(color, vec3(1.0, 0.985, 0.94), head * 0.48);
        float alpha = energy * mix(0.82, 0.52, uCompact);
        gl_FragColor = vec4(color * (0.76 + energy * 0.62), alpha);
      }
    `,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = 1;
  group.add(lines);

  // A dedicated point head makes the actual impulse physically shrink on its
  // journey; LineSegments cannot vary line width portably across WebGL GPUs.
  const headPositions = new Float32Array(count * 3);
  const headScale = new Float32Array(count);
  const headTint = new Float32Array(count);
  const headActive = new Float32Array(count);
  const headGeometry = new THREE.BufferGeometry();
  headGeometry.setAttribute('position', new THREE.BufferAttribute(headPositions, 3));
  headGeometry.setAttribute('aScale', new THREE.BufferAttribute(headScale, 1));
  headGeometry.setAttribute('aTint', new THREE.BufferAttribute(headTint, 1));
  headGeometry.setAttribute('aActive', new THREE.BufferAttribute(headActive, 1));
  const headUniforms = {
    uPixelRatio: { value: 1 },
    uCompact: uniforms.uCompact,
    uCyan: uniforms.uCyan,
    uAmber: uniforms.uAmber,
  };
  const headMaterial = new THREE.ShaderMaterial({
    uniforms: headUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      attribute float aScale, aTint, aActive;
      uniform float uPixelRatio, uCompact;
      varying float vTint, vActive, vScale;
      void main() {
        vTint = aTint;
        vActive = aActive;
        vScale = aScale;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float perspective = 430.0 / max(260.0, -mv.z);
        gl_PointSize = mix(12.5, 9.0, uCompact)
          * uPixelRatio * aScale * perspective;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uCyan, uAmber;
      varying float vTint, vActive, vScale;
      void main() {
        if (vActive < 0.5) discard;
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        if (d > 0.5) discard;
        float core = 1.0 - smoothstep(0.0, 0.15, d);
        float halo = 1.0 - smoothstep(0.10, 0.5, d);
        vec3 color = mix(uCyan, uAmber, vTint);
        color = mix(color, vec3(1.0), core * 0.72);
        float alpha = (core * 0.95 + halo * 0.58) * mix(0.72, 1.0, vScale);
        gl_FragColor = vec4(color * (1.15 + core), alpha);
      }
    `,
  });
  const heads = new THREE.Points(headGeometry, headMaterial);
  heads.frustumCulled = false;
  heads.renderOrder = 2;
  group.add(heads);

  const runtime = routes.map(() => ({
    head: -1,
    duration: 1,
    pulse: 0.12,
    tint: 0,
    lastStamp: 0,
  }));

  const samplePoint = new THREE.Vector3();
  let enabled = true;
  let compact = false;
  let active = 0;
  let nextSpawn = randomBetween(FIRST_SPAWN_MIN, FIRST_SPAWN_MAX);
  let surfaceCycle = [];
  let surfaceCursor = 0;
  let surfaceEpoch = Math.floor(Math.random() * Math.max(1, routes.length));

  function routeOrigin(route) {
    const point = route.points[0];
    return new THREE.Vector2(point.x, point.y);
  }

  function originDistance(a, b) {
    return routeOrigin(a).distanceTo(routeOrigin(b));
  }

  function rebuildCycle() {
    const remaining = routes.map((route) => route.id);
    const order = [];
    if (!remaining.length) return;

    // Consume every route before repeating one. Each following origin is
    // selected to be far away from the previous and already-used origins,
    // which makes the scene read as a distributed system rather than a pair
    // of repeatedly firing foreground emitters.
    order.push(remaining.splice(surfaceEpoch++ % remaining.length, 1)[0]);
    while (remaining.length) {
      const lastRoute = routes[order.at(-1)];
      let bestPos = 0;
      let bestScore = -Infinity;
      for (let pos = 0; pos < remaining.length; pos += 1) {
        const id = remaining[pos];
        const candidate = routes[id];
        let nearestUsed = Infinity;
        for (const used of order) {
          nearestUsed = Math.min(nearestUsed, originDistance(candidate, routes[used]));
        }
        const score = originDistance(candidate, lastRoute) * 0.76 + nearestUsed * 0.24;
        if (score > bestScore) { bestScore = score; bestPos = pos; }
      }
      order.push(remaining.splice(bestPos, 1)[0]);
    }
    surfaceCycle = order;
    surfaceCursor = 0;
  }

  function originNearActive(id) {
    const candidate = routes[id];
    const minDistance = Math.min(boardWidth, boardHeight) * 0.13;
    for (let activeId = 0; activeId < runtime.length; activeId += 1) {
      if (runtime[activeId].head < 0) continue;
      if (originDistance(candidate, routes[activeId]) < minDistance) return true;
    }
    return false;
  }

  function chooseRoute() {
    if (!surfaceCycle.length || surfaceCursor >= surfaceCycle.length) rebuildCycle();
    let fallback = -1;
    for (let attempt = 0; attempt < routes.length; attempt += 1) {
      if (surfaceCursor >= surfaceCycle.length) rebuildCycle();
      const id = surfaceCycle[surfaceCursor++];
      if (runtime[id].head >= 0) continue;
      if (fallback < 0) fallback = id;
      if (!originNearActive(id)) return id;
    }
    return fallback >= 0
      ? fallback
      : routes.find((route) => runtime[route.id].head < 0)?.id ?? -1;
  }

  function spawn() {
    const activeLimit = compact ? 1 : MAX_ACTIVE;
    if (!enabled || active >= activeLimit) return false;
    const id = chooseRoute();
    if (id < 0) return false;
    const route = routes[id];
    const state = runtime[id];
    state.head = 0;
    state.duration = route.long
      ? randomBetween(4.485, 6.045)
      : randomBetween(3.315, 4.615);
    state.pulse = route.long
      ? randomBetween(0.12, 0.18)
      : randomBetween(0.085, 0.14);
    state.tint = Math.random() < 0.31 ? 1 : 0;
    state.lastStamp = -STAMP_STEP;
    active += 1;
    return true;
  }

  function resetState() {
    active = 0;
    for (let i = 0; i < runtime.length; i += 1) {
      runtime[i].head = -1;
      runtime[i].lastStamp = 0;
      stateData.set([-1, 0, 0, 0], i * 4);
      headActive[i] = 0;
      headScale[i] = 0;
    }
    stateTexture.needsUpdate = true;
    headGeometry.attributes.aActive.needsUpdate = true;
    headGeometry.attributes.aScale.needsUpdate = true;
    nextSpawn = randomBetween(FIRST_SPAWN_MIN, FIRST_SPAWN_MAX);
  }

  return {
    group,
    routeCount: count,

    setEnabled(value) {
      const next = Boolean(value);
      if (next === enabled) return;
      enabled = next;
      if (!enabled) resetState();
      else nextSpawn = randomBetween(FIRST_SPAWN_MIN, FIRST_SPAWN_MAX);
    },

    setCompact(value) {
      compact = Boolean(value);
      uniforms.uCompact.value = compact ? 1 : 0;
    },

    setPixelRatio(value) {
      headUniforms.uPixelRatio.value = Math.max(0.75, Number(value) || 1);
    },

    update(_elapsed, delta) {
      const dt = Math.min(delta, 0.1);
      if (!enabled) return;
      nextSpawn -= dt;
      if (nextSpawn <= 0) {
        spawn();
        nextSpawn = randomBetween(SPAWN_MIN, SPAWN_MAX);
      }

      for (let i = 0; i < runtime.length; i += 1) {
        const state = runtime[i];
        const offset = i * 4;
        if (state.head < 0) {
          stateData[offset] = -1;
          stateData[offset + 3] = 0;
          headActive[i] = 0;
          continue;
        }

        const route = routes[i];
        state.head += dt / state.duration;
        const visibleHead = Math.min(1, state.head);
        const scale = perspectiveScale(visibleHead);

        while (state.lastStamp + STAMP_STEP <= visibleHead) {
          state.lastStamp += STAMP_STEP;
          pointOnRoute(route, state.lastStamp, samplePoint);
          onReveal?.(samplePoint, state.tint, 0.68 + scale * 0.56);
        }

        pointOnRoute(route, visibleHead, samplePoint);
        headPositions[i * 3] = samplePoint.x;
        headPositions[i * 3 + 1] = samplePoint.y;
        headPositions[i * 3 + 2] = samplePoint.z + 0.8;
        headScale[i] = scale;
        headTint[i] = state.tint;
        headActive[i] = 1;

        if (state.head >= 1) {
          onReveal?.(samplePoint, state.tint, 1.0);
          onTerminate?.(samplePoint.clone(), state.tint, {
            routeId: route.id,
            long: route.long,
            terminalScale: scale,
          });
          state.head = -1;
          headActive[i] = 0;
          active = Math.max(0, active - 1);
        }

        stateData[offset] = state.head;
        stateData[offset + 1] = state.pulse;
        stateData[offset + 2] = state.tint;
        stateData[offset + 3] = state.head >= 0 ? scale : 0;
      }
      stateTexture.needsUpdate = true;
      headGeometry.attributes.position.needsUpdate = true;
      headGeometry.attributes.aScale.needsUpdate = true;
      headGeometry.attributes.aTint.needsUpdate = true;
      headGeometry.attributes.aActive.needsUpdate = true;
    },

    dispose() {
      geometry.dispose();
      material.dispose();
      stateTexture.dispose();
      headGeometry.dispose();
      headMaterial.dispose();
    },
  };
}
