"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Intradark 3D loading spinner — a star tetrahedron (stellated octahedron /
 * Merkaba): two interpenetrating tetrahedra. Oriented the canonical way, with
 * the shared 3-fold axis vertical (one tetra apex-up, one apex-down) and viewed
 * from the front, then spun about the vertical axis.
 *
 * Each face is vertex-coloured by the axis its normal points down, recreating
 * the three brand blues from intradark-symbol-blue.svg:
 *   #00497d (dark)  ·  #0483c8 (mid)  ·  #4c9ccb (light)
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
    a.subVectors(v[j], v[i]);
    b.subVectors(v[k], v[i]);
    normal.crossVectors(a, b).normalize();
    const ci = (shadeIndex(normal.x, normal.y, normal.z) + colorOffset) % PALETTE.length;
    const color = PALETTE[ci];
    for (const idx of [i, j, k]) {
      positions.push(v[idx].x, v[idx].y, v[idx].z);
      colors.push(color.r, color.g, color.b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
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
}

export function IntradarkSpinner({
  size = 96,
  speed = 0.4,
  className,
  spinAxis = [0, 1, 0],
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
    // up colour by orientation and shift as the star spins.
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

    // Flat-shaded lit material → each facet takes a solid tint from the lights.
    // polygonOffset pushes faces slightly back so the edge strokes sit cleanly
    // on top without z-fighting.
    const star = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const tetA = new THREE.Mesh(buildTetra(TET_A), material);
    const tetB = new THREE.Mesh(
      buildTetra(TET_B, TETB_COLOR_OFFSET),
      material,
    );

    // White stroke along each tetrahedron's edges.
    // WebGL renders lines at 1px min; lower the opacity so the stroke reads finer.
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    const edgesA = new THREE.EdgesGeometry(tetA.geometry);
    const edgesB = new THREE.EdgesGeometry(tetB.geometry);
    tetA.add(new THREE.LineSegments(edgesA, edgeMaterial));
    tetB.add(new THREE.LineSegments(edgesB, edgeMaterial));

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
      tetA.geometry.dispose();
      tetB.geometry.dispose();
      edgesA.dispose();
      edgesB.dispose();
      edgeMaterial.dispose();
      material.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [size, speed, spinAxis[0], spinAxis[1], spinAxis[2]]);

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
