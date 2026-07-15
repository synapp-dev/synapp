"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

/**
 * Supersolt 3D spinning logo — the brand "S" (two interlocking round-capped
 * bars, traced from supersolt-logo-black.svg) extruded into a solid and spun
 * about the vertical axis like a coin.
 *
 * `variant="mark"` (default) spins the green S alone — the loading-spinner
 * look, the Supersolt sibling of intradark's Merkaba spinner.
 * `variant="tile"` spins the full app icon: the dark rounded tile with the S
 * standing proud of the front face, and a mirrored copy on the back so the S
 * reads correctly from behind (like the reverse of a coin).
 *
 * Unlike intradark's three-tone mark, the Supersolt mark is a single flat
 * brand green — so the meshes carry the true brand colours and NEUTRAL white
 * lights do the shading, rather than brand-coloured lights on white faces.
 *
 * `drawIn` plays an entrance while the logo spins: the outlines trace
 * themselves on (a fat line drawn point-by-point via instanceCount), the flat
 * drawing inflates to full extrusion depth, then the solid faces fade in and
 * the trace lines fade away. Flip `drawOut` to true to play the same
 * timeline in reverse — the solid un-fades, deflates back to a flat drawing,
 * and the outlines un-trace to nothing. `drawOut` is watched live (it does
 * not rebuild the scene), so the spin never stutters at the handoff.
 *
 * During a `drawIn` the spin is EASED rather than constant: it turns fast at
 * first and decelerates to a dead stop facing forward as the entrance lands
 * (`spinInRevolutions`), holds there while it waits, then accelerates from
 * rest and blurs on as the draw-out fades it away (`spinOutRevolutions`).
 * Without a draw-in it spins at a constant `speed` (the loading-spinner look).
 *
 * Pass `faceColor` to flat-fill every face with a single unlit colour (use
 * the literal "background" to match the page background, turning the logo
 * into a wireframe outline). `strokeColor` / `strokeWidth` / `strokeOpacity`
 * control the optional edge stroke; widths > 1 render as true fat lines.
 */

// Brand colours, from supersolt-logo-black.svg.
const BRAND_GREEN = "#bcdb8b";
const BRAND_CHARCOAL = "#231f20";
const TILE_TRACE_GREY = "#9c9c9c";

// Geometry traced from the SVG (viewBox 150.55 × 144), recentred on the S.
// One unit = 36 SVG px, so the S spans roughly ±1 in x/y.
const SCALE = 1 / 36;
const R = 18.135 * SCALE; // bar half-height / cap radius
const CAP_X = -19.87 * SCALE; // top bar: rounded-cap centre x
const END_X = 38.1 * SCALE; // top bar: flat-end x
const S_DEPTH = 0.5; // extrusion depth of the standalone S

// Tile (the rounded-square app icon), same unit scale as the S.
const TILE_HALF_W = (150.55 / 2) * SCALE;
const TILE_HALF_H = (144 / 2) * SCALE;
const TILE_CORNER = 25 * SCALE;
const TILE_DEPTH = 0.5; // slab thickness
const S_RELIEF = 0.2; // how far the S stands proud of each tile face

// Hide extrusion facet seams on the curved caps/corners, keep real rims.
const EDGE_THRESHOLD_DEG = 15;
const CURVE_SEGMENTS = 48;

// Draw-in timeline, as fractions of the total duration. Phases overlap so the
// entrance reads as one continuous move rather than three steps.
const TRACE_END = 0.45; // outline fully drawn
const GROW_START = 0.3; // flat drawing starts inflating
const GROW_SPAN = 0.35;
const FACE_START = 0.55; // solid faces start fading in
const FACE_SPAN = 0.45;
const TRACE_FADE_START = 0.7; // trace lines start fading away
const TRACE_FADE_SPAN = 0.3;
const MIN_FLAT_Z = 0.02; // "flat" scale while tracing (0 breaks normals)

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
// Dead start accelerating away; used to spin the exit up as it fades.
const easeInCubic = (x: number) => x * x * x;

const TWO_PI = Math.PI * 2;

/**
 * The top bar of the S: flat right end, semicircular left cap, wound
 * counter-clockwise. The bottom bar is this shape rotated 180° about the
 * origin (the S has 2-fold rotational symmetry).
 */
function barShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(END_X, 0);
  s.lineTo(END_X, 2 * R);
  s.lineTo(CAP_X, 2 * R);
  s.absarc(CAP_X, R, R, Math.PI / 2, Math.PI * 1.5, false);
  s.lineTo(END_X, 0);
  return s;
}

function roundedRectShape(hw: number, hh: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hw + r, hh);
  s.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hh + r);
  s.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);
  s.lineTo(hw - r, -hh);
  s.absarc(hw - r, -hh + r, r, Math.PI * 1.5, Math.PI * 2, false);
  return s;
}

/** Extrude a shape and centre it on z. */
function extrude(shape: THREE.Shape, depth: number): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: CURVE_SEGMENTS,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/**
 * Resolve a face colour to a THREE-parseable string. `getComputedStyle`
 * always serialises `background-color` to `rgb(...)`/`rgba(...)` (never
 * oklch), so we can match whatever the theme paints by walking up to the
 * first opaque ancestor background.
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

export interface SupersoltSpinnerProps {
  /** Pixel size of the (square) canvas. Default 96. */
  size?: number;
  /**
   * Constant spin rate in revolutions per second. Used when NOT drawing in
   * (the plain loading-spinner look). During a `drawIn` entrance the spin is
   * eased instead — see `spinInRevolutions` / `spinOutRevolutions`. Default
   * 0.35.
   */
  speed?: number;
  className?: string;
  /** "mark" = the green S alone (default); "tile" = the full app icon. */
  variant?: "mark" | "tile";
  /** Axis the logo spins about. Default vertical [0,1,0]. */
  spinAxis?: [number, number, number];
  /**
   * Play the draw-in entrance on mount: outlines trace on while spinning,
   * the flat drawing inflates to depth, then the faces fade in. Default off.
   */
  drawIn?: boolean;
  /** Draw-in length in milliseconds. Default 2600. */
  drawInDurationMs?: number;
  /**
   * Flip to true to un-animate: the draw-in timeline plays in reverse until
   * the logo has traced itself away to nothing. Waits for a running draw-in
   * to finish first. Watched live — changing it never rebuilds the scene.
   */
  drawOut?: boolean;
  /** Draw-out length in milliseconds. Default 1700. */
  drawOutDurationMs?: number;
  /**
   * `drawIn` only. Revolutions the logo turns during the entrance, spinning
   * fast at first and easing to a dead stop facing forward as it finishes.
   * A whole or half number lands cleanly facing front. Default 1.5.
   */
  spinInRevolutions?: number;
  /**
   * `drawIn` only. Revolutions the logo turns during the draw-out, starting
   * from rest and accelerating away as it fades. Default 1.25.
   */
  spinOutRevolutions?: number;
  /**
   * Solid, unlit face colour for every mesh. Pass the literal "background"
   * to match the page background (wireframe-outline look), or the literal
   * "transparent" for depth-only faces: fully see-through against any
   * backdrop, but still occluding the edge lines behind them (hidden-line
   * wireframe). Omit for the lit brand-colour finish.
   */
  faceColor?: string;
  /** Edge stroke colour. Default white. */
  strokeColor?: string;
  /** Edge stroke opacity. Default 0 (no stroke). */
  strokeOpacity?: number;
  /** Edge stroke thickness in px (fat lines when > 1). Default 1. */
  strokeWidth?: number;
}

export function SupersoltSpinner({
  size = 96,
  speed = 0.35,
  className,
  variant = "mark",
  spinAxis = [0, 1, 0],
  drawIn = false,
  drawInDurationMs = 2600,
  drawOut = false,
  drawOutDurationMs = 1700,
  spinInRevolutions = 1.5,
  spinOutRevolutions = 1.25,
  faceColor,
  strokeColor = "#ffffff",
  strokeOpacity = 0,
  strokeWidth = 1,
}: SupersoltSpinnerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Compare the axis by component so a fresh [x, y, z] literal from the
  // caller doesn't rebuild the scene every render.
  const [spinAxisX, spinAxisY, spinAxisZ] = spinAxis;
  // Read live by the render loop; deliberately NOT an effect dependency.
  const drawOutRef = useRef(drawOut);
  drawOutRef.current = drawOut;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();

    // Orthographic for the flat brand look (no perspective looming), camera
    // slightly elevated so the top edge reads and the logo feels solid.
    const FRUSTUM = variant === "tile" ? 2.35 : 1.45;
    const camera = new THREE.OrthographicCamera(
      -FRUSTUM,
      FRUSTUM,
      FRUSTUM,
      -FRUSTUM,
      0.1,
      100,
    );
    camera.position.set(0, FRUSTUM * 0.8, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    mount.appendChild(renderer.domElement);

    // Neutral studio lighting: key front-right, soft fill front-left, rim
    // from behind so faces swinging away don't go dead black.
    const LIGHTS = [
      { dir: [1.5, 2, 4], intensity: 2.1 },
      { dir: [-3, 0.5, 2], intensity: 0.7 },
      { dir: [-1, -0.5, -3], intensity: 1.1 },
    ] as const;
    for (const l of LIGHTS) {
      const dl = new THREE.DirectionalLight("#ffffff", l.intensity);
      dl.position.set(l.dir[0], l.dir[1], l.dir[2]);
      scene.add(dl);
    }
    scene.add(new THREE.AmbientLight("#ffffff", 0.5));

    // Face materials. Default: lit brand colours. `faceColor`: one solid
    // unlit fill for everything (e.g. the page background), or depth-only
    // "ghost" faces for `"transparent"` — invisible themselves, but still
    // occluding the edge lines behind them. Either way, polygonOffset pushes
    // faces back so edge strokes sit cleanly on top. During a draw-in the
    // materials start transparent at opacity 0.
    const ghostFaces = faceColor === "transparent";
    const solidFace =
      faceColor && !ghostFaces ? resolveFaceColor(faceColor, mount) : null;
    const offset = {
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      transparent: drawIn,
      opacity: drawIn ? 0 : 1,
    };
    const markMaterial = ghostFaces
      ? new THREE.MeshBasicMaterial({ ...offset, colorWrite: false })
      : solidFace
        ? new THREE.MeshBasicMaterial({ color: new THREE.Color(solidFace), ...offset })
        : new THREE.MeshStandardMaterial({
            color: new THREE.Color(BRAND_GREEN),
            roughness: 0.7,
            metalness: 0,
            ...offset,
          });
    const tileMaterial =
      ghostFaces || solidFace
        ? markMaterial
        : new THREE.MeshStandardMaterial({
            color: new THREE.Color(BRAND_CHARCOAL),
            roughness: 0.55,
            metalness: 0,
            ...offset,
          });
    const faceMats =
      tileMaterial === markMaterial ? [markMaterial] : [markMaterial, tileMaterial];

    // Edge stroke. WebGL caps LineBasicMaterial at 1px, so for thicker
    // strokes we build true fat lines (screen-space quads) via LineSegments2.
    const fat = strokeWidth > 1;
    const disposers: Array<() => void> = [];
    const strokeMats: Array<LineMaterial | THREE.LineBasicMaterial> = [];
    const addEdges = (mesh: THREE.Mesh, geo: THREE.BufferGeometry) => {
      if (strokeOpacity <= 0) return;
      const initialOpacity = drawIn ? 0 : strokeOpacity;
      const edges = new THREE.EdgesGeometry(geo, EDGE_THRESHOLD_DEG);
      if (fat) {
        const lsg = new LineSegmentsGeometry().setPositions(
          Array.from(edges.attributes.position!.array as Float32Array),
        );
        const lineMat = new LineMaterial({
          linewidth: strokeWidth,
          transparent: true,
          opacity: initialOpacity,
          worldUnits: false,
        });
        lineMat.color.set(strokeColor);
        lineMat.resolution.set(size, size);
        mesh.add(new LineSegments2(lsg, lineMat));
        edges.dispose();
        strokeMats.push(lineMat);
        disposers.push(() => {
          lsg.dispose();
          lineMat.dispose();
        });
      } else {
        const lineMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(strokeColor),
          transparent: true,
          opacity: initialOpacity,
        });
        mesh.add(new THREE.LineSegments(edges, lineMat));
        strokeMats.push(lineMat);
        disposers.push(() => {
          edges.dispose();
          lineMat.dispose();
        });
      }
    };

    const logo = new THREE.Group();
    const geometries: THREE.BufferGeometry[] = [];
    const solidMeshes: THREE.Mesh[] = [];

    const addMesh = (
      geo: THREE.BufferGeometry,
      material: THREE.Material,
      parent: THREE.Object3D,
    ) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.visible = !drawIn; // hidden until the faces fade in
      geometries.push(geo);
      solidMeshes.push(mesh);
      addEdges(mesh, geo);
      parent.add(mesh);
    };

    // The S: top bar + the same geometry rotated 180° for the bottom bar.
    const buildS = (depth: number): THREE.Group => {
      const group = new THREE.Group();
      const topGeo = extrude(barShape(), depth);
      const bottomGeo = topGeo.clone().rotateZ(Math.PI);
      addMesh(topGeo, markMaterial, group);
      addMesh(bottomGeo, markMaterial, group);
      return group;
    };

    if (variant === "tile") {
      const tileGeo = extrude(
        roundedRectShape(TILE_HALF_W, TILE_HALF_H, TILE_CORNER),
        TILE_DEPTH,
      );
      addMesh(tileGeo, tileMaterial, logo);

      // S proud of the front face; mirrored copy (rotateY π) on the back so
      // it reads correctly from behind, like the reverse of a coin.
      const front = buildS(S_RELIEF);
      front.position.z = TILE_DEPTH / 2 + S_RELIEF / 2;
      const back = buildS(S_RELIEF);
      back.rotation.y = Math.PI;
      back.position.z = -(TILE_DEPTH / 2 + S_RELIEF / 2);
      logo.add(front, back);
    } else {
      logo.add(buildS(S_DEPTH));
    }
    scene.add(logo);

    // --- draw-in trace lines ---------------------------------------------
    // Ordered outline polylines (fat lines) drawn point-by-point by animating
    // the instanced geometry's instanceCount — a true "pen tracing" effect.
    // Children of `logo`, so they spin with it, and their z offsets scale
    // with logo.scale.z, staying glued to the faces as the solid inflates.
    const traceLines: Line2[] = [];
    const traceMats: LineMaterial[] = [];
    const addTrace = (
      shape: THREE.Shape,
      color: string,
      parent: THREE.Object3D,
      rotZ = 0,
      // Which face-plane this outline lives on: +1 front, -1 back, 0 both
      // (the tile slab). Per frame only the camera-facing S is shown, so we
      // never see the front and back S outlines doubled through the wireframe.
      faceSign = 0,
    ) => {
      const pts = shape.getPoints(CURVE_SEGMENTS);
      const first = pts[0];
      if (first) pts.push(first.clone()); // close the loop
      const positions: number[] = [];
      for (const p of pts) positions.push(p.x, p.y, 0);
      const geo = new LineGeometry();
      geo.setPositions(positions);
      geo.instanceCount = 0;
      const mat = new LineMaterial({
        linewidth: Math.max(2, strokeWidth),
        transparent: true,
        opacity: 1,
        worldUnits: false,
      });
      mat.color.set(color);
      mat.resolution.set(size, size);
      const line = new Line2(geo, mat);
      line.rotation.z = rotZ;
      line.userData.segCount = pts.length - 1;
      line.userData.faceSign = faceSign;
      parent.add(line);
      traceLines.push(line);
      traceMats.push(mat);
      disposers.push(() => {
        geo.dispose();
        mat.dispose();
      });
    };

    {
      if (drawIn) logo.scale.z = MIN_FLAT_Z;
      const sTraceColor = solidFace ? strokeColor : BRAND_GREEN;
      const tileTraceColor = solidFace ? strokeColor : TILE_TRACE_GREY;
      // A trace group per face plane: both S bars traced at that plane's z.
      const traceS = (z: number, mirrored: boolean) => {
        const group = new THREE.Group();
        group.position.z = z;
        if (mirrored) group.rotation.y = Math.PI;
        const faceSign = Math.sign(z);
        addTrace(barShape(), sTraceColor, group, 0, faceSign);
        addTrace(barShape(), sTraceColor, group, Math.PI, faceSign);
        logo.add(group);
      };
      if (variant === "tile") {
        for (const z of [TILE_DEPTH / 2, -TILE_DEPTH / 2]) {
          const group = new THREE.Group();
          group.position.z = z;
          addTrace(
            roundedRectShape(TILE_HALF_W, TILE_HALF_H, TILE_CORNER),
            tileTraceColor,
            group,
          );
          logo.add(group);
        }
        traceS(TILE_DEPTH / 2 + S_RELIEF, false);
        traceS(-(TILE_DEPTH / 2 + S_RELIEF), true);
      } else {
        // Straight extrusion: the back outline is the same shape, unmirrored.
        traceS(S_DEPTH / 2, false);
        traceS(-S_DEPTH / 2, false);
      }
    }

    const sAxis = new THREE.Vector3(spinAxisX, spinAxisY, spinAxisZ).normalize();
    // Reused each frame to find which face points at the camera (world +z).
    const faceNormal = new THREE.Vector3();
    const inSeconds = Math.max(0.001, drawInDurationMs / 1000);
    const outSeconds = Math.max(0.001, drawOutDurationMs / 1000);

    // One frame of the draw timeline: u = 0 nothing, u = 1 finished solid.
    // Used forwards by the draw-in and backwards by the draw-out.
    const applyDraw = (u: number) => {
      const traceP = easeInOutCubic(clamp01(u / TRACE_END));
      for (const line of traceLines) {
        const segCount = line.userData.segCount as number;
        (line.geometry as LineGeometry).instanceCount = Math.round(
          traceP * segCount,
        );
      }
      const growP = easeInOutCubic(clamp01((u - GROW_START) / GROW_SPAN));
      logo.scale.z = Math.max(MIN_FLAT_Z, growP);
      const faceP = easeOutCubic(clamp01((u - FACE_START) / FACE_SPAN));
      for (const mesh of solidMeshes) mesh.visible = faceP > 0;
      for (const mat of faceMats) mat.opacity = faceP;
      for (const mat of strokeMats) mat.opacity = strokeOpacity * faceP;
      const traceVis =
        1 - easeInOutCubic(clamp01((u - TRACE_FADE_START) / TRACE_FADE_SPAN));
      for (const mat of traceMats) mat.opacity = traceVis;
    };

    let raf = 0;
    let last = 0;
    let spin = 0;
    let constSpin = 0;
    let animT = 0;
    let mode: "in" | "idle" | "out" | "gone" = drawIn ? "in" : "idle";
    // The traces are shown only during the draw-in and draw-out phases; the
    // per-frame face cull below further narrows each S to its camera-facing side.
    let tracePhaseVisible = drawIn;
    // The entrance turns this many radians and lands here facing forward; the
    // draw-out picks up from here and accelerates on past it.
    const introEndAngle = spinInRevolutions * TWO_PI;
    const outAngle = spinOutRevolutions * TWO_PI;
    const tick = (t: number) => {
      const dt = last ? (t - last) / 1000 : 0;
      last = t;

      if (mode === "in") {
        animT += dt;
        const u = clamp01(animT / inSeconds);
        applyDraw(u);
        if (u >= 1) {
          mode = "idle";
          logo.scale.z = 1;
          for (const mat of faceMats) {
            mat.opacity = 1;
            mat.transparent = false;
          }
          for (const mat of strokeMats) mat.opacity = strokeOpacity;
          tracePhaseVisible = false;
        }
      } else if (mode === "idle" && drawOutRef.current) {
        mode = "out";
        animT = 0;
        for (const mat of faceMats) mat.transparent = true;
        tracePhaseVisible = true;
      } else if (mode === "out") {
        animT += dt;
        const u = 1 - clamp01(animT / outSeconds);
        applyDraw(u);
        if (u <= 0) {
          mode = "gone";
          for (const mesh of solidMeshes) mesh.visible = false;
          tracePhaseVisible = false;
        }
      }

      // Spin. Without a draw-in it's a constant rate (the plain loading
      // spinner). With one, the spin is eased through the phases: fast at
      // first and decelerating to a dead stop facing forward as the entrance
      // finishes, held there through the wait, then accelerating from rest
      // and blurring on as the draw-out fades it away.
      if (!drawIn) {
        constSpin += dt * speed * TWO_PI;
        spin = constSpin;
      } else if (mode === "in") {
        spin = easeOutCubic(clamp01(animT / inSeconds)) * introEndAngle;
      } else if (mode === "out") {
        spin = introEndAngle + easeInCubic(clamp01(animT / outSeconds)) * outAngle;
      } else {
        spin = introEndAngle; // idle / gone: at rest, facing forward
      }
      logo.quaternion.setFromAxisAngle(sAxis, spin);

      // Cull trace outlines to the camera-facing face: the front S shows while
      // the front points at the camera, the (mirrored) back S once it turns
      // past edge-on — so we never see both S outlines at once. faceSign 0
      // (the tile slab) always shows, keeping its 3D depth.
      if (tracePhaseVisible) {
        faceNormal.set(0, 0, 1).applyQuaternion(logo.quaternion);
        const frontToCamera = faceNormal.z >= 0;
        for (const line of traceLines) {
          const faceSign = (line.userData.faceSign as number) ?? 0;
          line.visible =
            faceSign === 0 || (faceSign > 0 ? frontToCamera : !frontToCamera);
        }
      } else {
        for (const line of traceLines) line.visible = false;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      for (const geo of geometries) geo.dispose();
      for (const dispose of disposers) dispose();
      markMaterial.dispose();
      if (tileMaterial !== markMaterial) tileMaterial.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [
    size,
    speed,
    variant,
    spinAxisX,
    spinAxisY,
    spinAxisZ,
    drawIn,
    drawInDurationMs,
    drawOutDurationMs,
    spinInRevolutions,
    spinOutRevolutions,
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
