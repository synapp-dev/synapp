"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

/**
 * Intradark 3D loading spinner — a star tetrahedron (stellated octahedron /
 * Merkaba): two interpenetrating tetrahedra. Oriented the canonical way, with
 * the shared 3-fold axis vertical (one tetra apex-up, one apex-down) and viewed
 * from the front, then spun about the vertical axis.
 *
 * By default each face is vertex-coloured by the axis its normal points down,
 * recreating the three brand blues from intradark-symbol-blue.svg:
 *   #00497d (dark)  ·  #0483c8 (mid)  ·  #4c9ccb (light)
 *
 * Pass `faceColor` to flat-fill the faces with a single colour instead (use the
 * literal "background" to match the page background, turning the star into a
 * white wireframe outline). `strokeColor` / `strokeWidth` / `strokeOpacity`
 * control the edge stroke; widths > 1 render as true fat lines.
 */

// Brand palette — the three blues from the SVG's isometric three-tone scheme.
const PALETTE = [
  new THREE.Color("#4c9ccb"), // light
  new THREE.Color("#0483c8"), // mid
  new THREE.Color("#00497d"), // dark
] as const;

// Shift tetB's facet colours by one shade so the two tetrahedra don't show the
// same brand blue on the same face side where they overlap.
const TETB_COLOR_OFFSET = 1;

// A regular tetrahedron sits on alternating corners of a cube.
// The two sets of alternating corners give the two interpenetrating tetrahedra.
const TET_A: [number, number, number][] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
];
const TET_B: [number, number, number][] = [
  [-1, -1, -1],
  [-1, 1, 1],
  [1, -1, 1],
  [1, 1, -1],
];

// The 4 triangular faces of a tetrahedron, as indices into its 4 vertices,
// wound counter-clockwise so normals point outward.
const FACES: [number, number, number][] = [
  [0, 1, 2],
  [0, 3, 1],
  [0, 2, 3],
  [1, 3, 2],
];

/**
 * Pick a brand shade from a face normal. A tetrahedron's faces point down cube
 * diagonals (|nx|=|ny|=|nz|), so three of its four faces have exactly one axis
 * whose sign differs from the other two — that "odd-one-out" axis selects the
 * shade, giving each tetrahedron a light/mid/dark point. Returns a PALETTE index.
 */
function shadeIndex(nx: number, ny: number, nz: number): number {
  const sx = nx >= 0 ? 1 : -1;
  const sy = ny >= 0 ? 1 : -1;
  const sz = nz >= 0 ? 1 : -1;
  const sum = sx + sy + sz;
  if (sum === 3 || sum === -3) return 2; // inner face → dark
  const odd = sum > 0 ? -1 : 1; // the lone differing sign
  if (sx === odd) return 0; // x → light
  if (sy === odd) return 1; // y → mid
  return 2; // z → dark
}

/**
 * Build one tetrahedron's geometry with per-face brand-coloured vertices.
 * `colorOffset` rotates which shade each facet gets (wraps mod 3).
 */
function buildTetra(
  corners: [number, number, number][],
  colorOffset = 0,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const v = corners.map((c) => new THREE.Vector3(...c));
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (const [i, j, k] of FACES) {
    const vi = v[i];
    const vj = v[j];
    const vk = v[k];
    if (!vi || !vj || !vk) continue;
    a.subVectors(vj, vi);
    b.subVectors(vk, vi);
    normal.crossVectors(a, b).normalize();
    const ci = (shadeIndex(normal.x, normal.y, normal.z) + colorOffset) % PALETTE.length;
    const color = PALETTE[ci];
    if (!color) continue;
    for (const idx of [i, j, k]) {
      const vert = v[idx];
      if (!vert) continue;
      positions.push(vert.x, vert.y, vert.z);
      colors.push(color.r, color.g, color.b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Resolve a face colour to a THREE-parseable string. `getComputedStyle` always
 * serialises `background-color` to `rgb(...)`/`rgba(...)` (never oklch), so we
 * can match whatever the theme paints by walking up to the first opaque
 * ancestor background.
 */
function resolveFaceColor(input: string, from: HTMLElement | null): string {
  if (input !== "background") return input;
  let node: HTMLElement | null = from;
  while (node) {
    const bg = getComputedStyle(node).backgroundColor;
    const m = bg.match(/rgba?\(([^)]+)\)/);
    if (m && m[1]) {
      const parts = m[1].split(",").map((s) => parseFloat(s));
      const alpha = parts[3] ?? 1;
      if (alpha > 0) return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
    }
    node = node.parentElement;
  }
  return "#000000";
}

export interface IntradarkSpinnerProps {
  /** Pixel size of the (square) canvas. Default 96. */
  size?: number;
  /** Revolutions per second. Default 0.4. */
  speed?: number;
  className?: string;
  /**
   * Axis the star spins about — its 3-fold axis is oriented to this too, so the
   * spin stays clean (no wobble). Default vertical [0,1,0].
   */
  spinAxis?: [number, number, number];
  /**
   * Solid, unlit face colour. Pass the literal "background" to match the page
   * background (white-wireframe look). Omit for the brand-blue lit faces.
   */
  faceColor?: string;
  /** Edge stroke colour. Default white. */
  strokeColor?: string;
  /** Edge stroke opacity. Default 0.5. */
  strokeOpacity?: number;
  /** Edge stroke thickness in px (fat lines when > 1). Default 1. */
  strokeWidth?: number;
}

export function IntradarkSpinner({
  size = 96,
  speed = 0.4,
  className,
  spinAxis = [0, 1, 0],
  faceColor,
  strokeColor = "#ffffff",
  strokeOpacity = 0.5,
  strokeWidth = 1,
}: IntradarkSpinnerProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();

    // Orthographic to match the reference's flat, isometric look (no perspective
    // looming). Camera slightly elevated so we read it as a solid.
    const FRUSTUM = 2.0;
    const camera = new THREE.OrthographicCamera(
      -FRUSTUM,
      FRUSTUM,
      FRUSTUM,
      -FRUSTUM,
      0.1,
      100,
    );
    camera.position.set(0, 2.2, 6);
    // Roll the camera 30° about its view axis so the whole star tilts in-plane.
    const viewDir = new THREE.Vector3(0, 0, 0)
      .sub(camera.position)
      .normalize();
    camera.up
      .set(0, 1, 0)
      .applyAxisAngle(viewDir, THREE.MathUtils.degToRad(30));
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    mount.appendChild(renderer.domElement);

    // Three brand blues as coloured lights from three directions — facets pick
    // up colour by orientation and shift as the star spins. (Ignored when
    // `faceColor` is set, since that path uses an unlit material.)
    const LIGHTS = [
      { color: "#4c9ccb", dir: [0, 1, 0.5], intensity: 2.3 }, // light · from top
      { color: "#0483c8", dir: [1, 0, 0.5], intensity: 2.6 }, // mid · from right
      { color: "#00497d", dir: [-0.6, -1, 0.5], intensity: 3.6 }, // dark · from lower-left
    ] as const;
    for (const l of LIGHTS) {
      const dl = new THREE.DirectionalLight(l.color, l.intensity);
      dl.position.set(l.dir[0], l.dir[1], l.dir[2]);
      scene.add(dl);
    }
    // Gentle blue ambient so faces facing away from every light aren't pure black.
    scene.add(new THREE.AmbientLight("#0a2540", 0.12));

    // Face material. Default: flat-shaded lit (brand-tinted by the lights).
    // `faceColor`: a solid unlit fill (e.g. the page background). Either way,
    // polygonOffset pushes faces back so the edge strokes sit cleanly on top.
    const solidFace = faceColor
      ? resolveFaceColor(faceColor, mount)
      : null;
    const material: THREE.Material = solidFace
      ? new THREE.MeshBasicMaterial({
          color: new THREE.Color(solidFace),
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        })
      : new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.85,
          metalness: 0,
          flatShading: true,
          vertexColors: true,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });

    const star = new THREE.Group();
    const geoA = buildTetra(TET_A);
    const geoB = buildTetra(TET_B, TETB_COLOR_OFFSET);
    const tetA = new THREE.Mesh(geoA, material);
    const tetB = new THREE.Mesh(geoB, material);

    // Edge stroke. WebGL caps LineBasicMaterial at 1px, so for thicker strokes
    // we build true fat lines (screen-space quads) via LineSegments2.
    const fat = strokeWidth > 1;
    const disposers: Array<() => void> = [];
    const addEdges = (mesh: THREE.Mesh, geo: THREE.BufferGeometry) => {
      const edges = new THREE.EdgesGeometry(geo);
      if (fat) {
        const lsg = new LineSegmentsGeometry().setPositions(
          Array.from(edges.attributes.position!.array as Float32Array),
        );
        const lineMat = new LineMaterial({
          linewidth: strokeWidth,
          transparent: true,
          opacity: strokeOpacity,
          worldUnits: false,
        });
        lineMat.color.set(strokeColor);
        lineMat.resolution.set(size, size);
        const seg = new LineSegments2(lsg, lineMat);
        mesh.add(seg);
        edges.dispose();
        disposers.push(() => {
          lsg.dispose();
          lineMat.dispose();
        });
      } else {
        const lineMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(strokeColor),
          transparent: true,
          opacity: strokeOpacity,
        });
        mesh.add(new THREE.LineSegments(edges, lineMat));
        disposers.push(() => {
          edges.dispose();
          lineMat.dispose();
        });
      }
    };
    addEdges(tetA, geoA);
    addEdges(tetB, geoB);

    star.add(tetA, tetB);
    scene.add(star);

    // Orient the shared 3-fold axis (1,1,1) to vertical → tetA apex-up,
    // tetB apex-down: the canonical Merkaba pose.
    const sAxis = new THREE.Vector3(...spinAxis).normalize();
    const baseQ = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 1, 1).normalize(),
      sAxis,
    );
    const spinQ = new THREE.Quaternion();

    let raf = 0;
    let last = 0;
    let spin = 0;
    const tick = (t: number) => {
      const dt = last ? (t - last) / 1000 : 0;
      last = t;
      spin += dt * speed * Math.PI * 2;
      // Spin about the vertical axis: baseQ orients, then spinQ rotates.
      spinQ.setFromAxisAngle(sAxis, spin);
      star.quaternion.copy(spinQ).multiply(baseQ);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      geoA.dispose();
      geoB.dispose();
      for (const dispose of disposers) dispose();
      material.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [
    size,
    speed,
    spinAxis[0],
    spinAxis[1],
    spinAxis[2],
    faceColor,
    strokeColor,
    strokeOpacity,
    strokeWidth,
  ]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
