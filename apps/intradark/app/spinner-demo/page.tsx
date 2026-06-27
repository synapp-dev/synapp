"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCcw, Palette, Pipette, Lock, LockOpen } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Slider } from "@workspace/ui/components/slider";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

// ---- geometry ---------------------------------------------------------------

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
const FACES: [number, number, number][] = [
  [0, 1, 2],
  [0, 3, 1],
  [0, 2, 3],
  [1, 3, 2],
];

function buildTetra(corners: [number, number, number][]): THREE.BufferGeometry {
  const positions: number[] = [];
  const v = corners.map((c) => new THREE.Vector3(...c));
  for (const [i, j, k] of FACES) {
    const a = v[i];
    const b = v[j];
    const c = v[k];
    if (!a || !b || !c) continue;
    positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  // per-vertex colour attribute (white by default); 4 faces × 3 verts.
  geo.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(new Float32Array(positions.length).fill(1), 3),
  );
  geo.computeVertexNormals();
  return geo;
}

// Write one colour per face (4) into a tetra's vertex-colour attribute.
const _faceColor = new THREE.Color();
function applyFaceColors(geo: THREE.BufferGeometry, faces: readonly string[]) {
  const attr = geo.getAttribute("color") as THREE.BufferAttribute;
  for (let f = 0; f < 4; f++) {
    const faceColor = faces[f];
    if (faceColor === undefined) continue;
    _faceColor.set(faceColor);
    for (let v = 0; v < 3; v++) {
      attr.setXYZ(f * 3 + v, _faceColor.r, _faceColor.g, _faceColor.b);
    }
  }
  attr.needsUpdate = true;
}

// The 8 tetrahedral spikes of the star: apex at a cube corner, base = the 3
// octahedron vertices in that octant. Order matches SPIKE_LABELS below.
const SPIKES: { apex: THREE.Vector3; base: THREE.Vector3[] }[] = [];
for (const sx of [1, -1])
  for (const sy of [1, -1])
    for (const sz of [1, -1])
      SPIKES.push({
        apex: new THREE.Vector3(sx, sy, sz),
        base: [
          new THREE.Vector3(sx, 0, 0),
          new THREE.Vector3(0, sy, 0),
          new THREE.Vector3(0, 0, sz),
        ],
      });

// 8 spikes × 3 outer faces = 24 triangles (bases hidden). Face index f maps to
// spike floor(f/3), face f%3.
function buildSpikes(): THREE.BufferGeometry {
  const positions: number[] = [];
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const sp of SPIKES) {
    for (let i = 0; i < 3; i++) {
      const a = sp.apex;
      let b1 = sp.base[i];
      let b2 = sp.base[(i + 1) % 3];
      if (!b1 || !b2) continue;
      // wind so the normal points outward (away from the origin)
      n.crossVectors(ab.subVectors(b1, a), ac.subVectors(b2, a));
      c.copy(a).add(b1).add(b2);
      if (n.dot(c) < 0) [b1, b2] = [b2, b1];
      positions.push(a.x, a.y, a.z, b1.x, b1.y, b1.z, b2.x, b2.y, b2.z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(new Float32Array(positions.length).fill(1), 3),
  );
  geo.computeVertexNormals();
  return geo;
}

function applySpikeColors(geo: THREE.BufferGeometry, faces: readonly string[]) {
  const attr = geo.getAttribute("color") as THREE.BufferAttribute;
  for (let f = 0; f < 24; f++) {
    _faceColor.set(faces[f] || "#ffffff");
    for (let v = 0; v < 3; v++) {
      attr.setXYZ(f * 3 + v, _faceColor.r, _faceColor.g, _faceColor.b);
    }
  }
  attr.needsUpdate = true;
}

const SPIKE_LABELS = ["+++", "++−", "+−+", "+−−", "−++", "−+−", "−−+", "−−−"];

type FaceHit =
  | { kind: "tet"; tet: "A" | "B"; face: number }
  | { kind: "spike"; spike: number; face: number };

const deg = THREE.MathUtils.degToRad;
function dirFromAzEl(azDeg: number, elDeg: number): [number, number, number] {
  const az = deg(azDeg);
  const el = deg(elDeg);
  return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
}

// ---- params -----------------------------------------------------------------

interface Light {
  enabled: boolean;
  color: string;
  intensity: number;
  az: number;
  el: number;
}
interface Params {
  speed: number;
  spinAxis: "3fold" | "x" | "y" | "z";
  dragSpin: boolean;
  friction: number;
  showAxis: boolean;
  separation: number;
  leanFwd: number;
  leanSide: number;
  elevation: number;
  roll: number;
  flatRoll: number;
  frustum: number;
  lights: [Light, Light, Light];
  tetAFaces: [string, string, string, string];
  tetBFaces: [string, string, string, string];
  flatFaces: boolean;
  showShadow: boolean;
  ambientColor: string;
  ambientIntensity: number;
  strokeColor: string;
  strokeOpacity: number;
  showStroke: boolean;
  showIntersect: boolean;
  geomMode: "tet" | "spike";
  spikeFaces: string[];
  spikeFaceMode: boolean;
}

const DEFAULTS: Params = {
  speed: 0.09,
  spinAxis: "3fold",
  dragSpin: false,
  friction: 0.5,
  showAxis: false,
  separation: 0,
  leanFwd: 0,
  leanSide: 0,
  elevation: 0,
  roll: 0,
  flatRoll: 0,
  frustum: 2,
  lights: [
    { enabled: true, color: "#4c9ccb", intensity: 2.3, az: 0, el: 63 },
    { enabled: true, color: "#0483c8", intensity: 2.6, az: 63, el: 0 },
    { enabled: true, color: "#00497d", intensity: 3.6, az: -50, el: -53 },
  ],
  tetAFaces: ["#a16363", "#ffffff", "#ffffff", "#ffffff"],
  tetBFaces: ["#ffffff", "#ffffff", "#ffffff", "#ffffff"],
  flatFaces: true,
  showShadow: true,
  ambientColor: "#0a2540",
  ambientIntensity: 0.18,
  strokeColor: "#0091ff",
  strokeOpacity: 0.74,
  showStroke: true,
  showIntersect: true,
  geomMode: "tet",
  spikeFaces: Array(24).fill("#ffffff"),
  spikeFaceMode: false,
};

// Intradark brand blues (exact, from intradark-symbol-blue.svg) plus the
// intermediate / deep tones from the rendered mark. Editable at runtime.
const INTRADARK_PALETTE = [
  "#4c9ccb", // brand light
  "#2e86c4", // light-mid
  "#0483c8", // brand mid
  "#0e5e96", // mid-dark
  "#00497d", // brand dark
  "#013a63", // deep navy
  "#ffffff",
];

const STORE_DEFAULTS = "intradark.spinner.defaults";
const STORE_PALETTE = "intradark.spinner.palette";

function normalizeHex(s: string): string | null {
  let h = s.trim();
  if (!h) return null;
  if (!h.startsWith("#")) h = "#" + h;
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    h = "#" + h.slice(1).split("").map((c) => c + c).join("");
  }
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toLowerCase() : null;
}

// ---- scene ------------------------------------------------------------------

function MerkabaCanvas({
  paramsRef,
  size = 360,
  onFaceClick,
  pausedRef,
  orbitRef,
  spinResetRef,
  lite = false,
}: {
  paramsRef: React.RefObject<Params>;
  size?: number;
  onFaceClick?: (hit: FaceHit) => void;
  pausedRef?: React.RefObject<boolean>;
  orbitRef?: React.RefObject<{ x: number; y: number }>;
  spinResetRef?: React.RefObject<boolean>;
  lite?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cbRef = useRef(onFaceClick);
  cbRef.current = onFaceClick;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.shadowMap.enabled = !lite;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Lit (shaded by the coloured lights) vs flat (unlit — face colours render
    // literally). Swapped per frame from the `flatFaces` param.
    const litMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.85,
      metalness: 0,
      flatShading: true,
    });
    const flatMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });

    const star = new THREE.Group();
    const geoA = buildTetra(TET_A);
    const geoB = buildTetra(TET_B);
    const tetA: THREE.Mesh = new THREE.Mesh(geoA, litMat);
    const tetB: THREE.Mesh = new THREE.Mesh(geoB, litMat);
    tetA.castShadow = true;
    tetB.castShadow = true;
    const edgesA = new THREE.EdgesGeometry(geoA);
    const edgesB = new THREE.EdgesGeometry(geoB);
    const lineA = new THREE.LineSegments(edgesA, edgeMaterial);
    const lineB = new THREE.LineSegments(edgesB, edgeMaterial);
    // Nudge strokes a hair outward so they sit proud of their own face (no
    // z-fight) while rear strokes stay occluded by the front faces.
    lineA.scale.setScalar(1.004);
    lineB.scale.setScalar(1.004);
    tetA.add(lineA);
    tetB.add(lineB);

    // Inner octahedron edges = the lines where the two tetrahedra intersect
    // (their vertices are the cube face centres; exact when separation = 0).
    const octSource = new THREE.OctahedronGeometry(1);
    const octEdges = new THREE.EdgesGeometry(octSource);
    octSource.dispose();
    const octLine = new THREE.LineSegments(octEdges, edgeMaterial);
    octLine.scale.setScalar(1.004);

    // Alternative geometry: 8 spike-tetrahedra (octahedron + spikes). Same shape,
    // 24 individually-colourable outer faces. Toggled via geomMode.
    const spikeGeo = buildSpikes();
    const spikeMesh: THREE.Mesh = new THREE.Mesh(spikeGeo, litMat);
    spikeMesh.castShadow = true;
    const spikeEdges = new THREE.EdgesGeometry(spikeGeo);
    const spikeLine = new THREE.LineSegments(spikeEdges, edgeMaterial);
    spikeLine.scale.setScalar(1.004);
    spikeMesh.add(spikeLine);

    star.add(tetA, tetB, octLine, spikeMesh);
    scene.add(star);

    const ambient = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambient);
    const dirLights = [0, 1, 2].map(() => {
      const dl = new THREE.DirectionalLight(0xffffff, 1);
      scene.add(dl);
      return dl;
    });

    // Shadow: a caster at intensity 0 (no illumination, just casts the shadow
    // map) + a ShadowMaterial plane behind the shape that only shows the shadow.
    const shadowLight = new THREE.DirectionalLight(0xffffff, 0);
    shadowLight.position.set(0.6, 2.5, 5);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(1024, 1024);
    shadowLight.shadow.camera.near = 0.1;
    shadowLight.shadow.camera.far = 40;
    const sc = shadowLight.shadow.camera as THREE.OrthographicCamera;
    sc.left = -3.5;
    sc.right = 3.5;
    sc.top = 3.5;
    sc.bottom = -3.5;
    sc.updateProjectionMatrix();
    scene.add(shadowLight);
    scene.add(shadowLight.target);

    const planeGeo = new THREE.PlaneGeometry(16, 16);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.set(0, 0, -2.6);
    plane.receiveShadow = true;
    scene.add(plane);

    // Rotation-axis indicator: a world-space line through the centre, drawn on top.
    const axisGeo = new THREE.BufferGeometry();
    axisGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(6), 3),
    );
    const axisMat = new THREE.LineBasicMaterial({
      color: 0xff3b5c,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });
    const axisLine = new THREE.LineSegments(axisGeo, axisMat);
    axisLine.renderOrder = 999;
    scene.add(axisLine);
    const axisVec = new THREE.Vector3();

    // Pointer: drag to spin the object (with momentum); a click (no drag) picks a face.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const doFacePick = (e: { clientX: number; clientY: number }) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const spikeOn = paramsRef.current?.geomMode === "spike";
      const hits = raycaster.intersectObjects(
        spikeOn ? [spikeMesh] : [tetA, tetB],
        false,
      );
      const hit = hits[0];
      const fi = hit?.faceIndex;
      if (hit == null || fi == null) return;
      if (spikeOn) {
        cbRef.current?.({ kind: "spike", spike: Math.floor(fi / 3), face: fi % 3 });
      } else {
        cbRef.current?.({
          kind: "tet",
          tet: hit.object === tetA ? "A" : "B",
          face: fi,
        });
      }
    };

    // Free drag-rotation (trackball) + thrown momentum.
    const dragQ = new THREE.Quaternion();
    const tmpDragQ = new THREE.Quaternion();
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let moved = 0;
    let velX = 0;
    let velY = 0;
    const DRAG_K = 0.007;
    const onDown = (e: PointerEvent) => {
      if (lite) return;
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      velX = 0;
      velY = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (lite || !dragging || !paramsRef.current?.dragSpin) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      velX = dy * DRAG_K;
      velY = dx * DRAG_K;
      tmpDragQ.setFromAxisAngle(X, velX);
      dragQ.premultiply(tmpDragQ);
      tmpDragQ.setFromAxisAngle(Y, velY);
      dragQ.premultiply(tmpDragQ);
    };
    // Click → send the object spinning evenly toward the clicked point,
    // rotating about the combined centre (screen centre of the canvas).
    const aimSpin = (e: { clientX: number; clientY: number }) => {
      const rect = renderer.domElement.getBoundingClientRect();
      let dx = e.clientX - (rect.left + rect.width / 2);
      let dy = e.clientY - (rect.top + rect.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const AIM = 0.035;
      velX = dy * AIM; // roll toward the click (about X)
      velY = dx * AIM; // and about Y
    };
    const onUp = (e: PointerEvent) => {
      if (lite) return;
      const drag = !!paramsRef.current?.dragSpin;
      const wasDrag = dragging && drag && moved > 4;
      dragging = false;
      if (wasDrag) return; // a fling — momentum already set from the drag
      if (drag) aimSpin(e); // a click in spin mode → even spin toward it
      else doFacePick(e); // a click in edit mode → pick a face
    };
    if (!lite) {
      renderer.domElement.addEventListener("pointerdown", onDown);
      renderer.domElement.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }

    const TET_AXIS = new THREE.Vector3(1, 1, 1).normalize();
    const X = new THREE.Vector3(1, 0, 0);
    const Y = new THREE.Vector3(0, 1, 0);
    const Z = new THREE.Vector3(0, 0, 1);
    const leanAxis = new THREE.Vector3();
    const spinDir = new THREE.Vector3();
    const baseQ = new THREE.Quaternion();
    const restQ = new THREE.Quaternion();
    const spinQ = new THREE.Quaternion();
    const orbX = new THREE.Quaternion();
    const orbY = new THREE.Quaternion();
    const flatRollQ = new THREE.Quaternion();
    const viewDir = new THREE.Vector3();
    const camPos = new THREE.Vector3();

    let raf = 0;
    let last = 0;
    let spin = 0;
    const tick = (t: number) => {
      const p = paramsRef.current;
      const dt = last ? (t - last) / 1000 : 0;
      last = t;

      if (p) {
        // camera
        camera.top = p.frustum;
        camera.bottom = -p.frustum;
        camera.left = -p.frustum;
        camera.right = p.frustum;
        camPos.set(0, p.elevation, 6);
        camera.position.copy(camPos);
        viewDir.set(0, 0, 0).sub(camPos).normalize();
        camera.up.set(0, 1, 0).applyAxisAngle(viewDir, deg(p.roll));
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        // lights
        ambient.color.set(p.ambientColor);
        ambient.intensity = p.ambientIntensity;
        for (let i = 0; i < 3; i++) {
          const l = p.lights[i];
          const dirLight = dirLights[i];
          if (!l || !dirLight) continue;
          dirLight.color.set(l.color);
          dirLight.intensity = l.enabled ? l.intensity : 0;
          const [dx, dy, dz] = dirFromAzEl(l.az, l.el);
          dirLight.position.set(dx, dy, dz);
        }

        // geometry mode: 2 tetrahedra vs 8 spikes
        const spikeOn = p.geomMode === "spike";
        tetA.visible = !spikeOn;
        tetB.visible = !spikeOn;
        spikeMesh.visible = spikeOn;

        // per-face base colours (tinted by the lights)
        if (spikeOn) {
          applySpikeColors(spikeGeo, p.spikeFaces);
        } else {
          applyFaceColors(geoA, p.tetAFaces);
          applyFaceColors(geoB, p.tetBFaces);
        }

        // lit vs flat material, and shadow on/off
        const mat = p.flatFaces ? flatMat : litMat;
        tetA.material = mat;
        tetB.material = mat;
        spikeMesh.material = mat;
        plane.visible = !lite && p.showShadow;
        shadowLight.castShadow = !lite && p.showShadow;

        // stroke
        edgeMaterial.color.set(p.strokeColor);
        edgeMaterial.opacity = p.strokeOpacity;
        lineA.visible = p.showStroke;
        lineB.visible = p.showStroke;
        spikeLine.visible = p.showStroke;
        octLine.visible = p.showStroke && p.showIntersect;

        // ---- rest pose: everything EXCEPT the continuous spin ----
        // base: align the 3-fold axis to a lean-tilted vertical
        leanAxis
          .set(0, 1, 0)
          .applyAxisAngle(X, deg(p.leanFwd))
          .applyAxisAngle(Z, deg(p.leanSide))
          .normalize();
        baseQ.setFromUnitVectors(TET_AXIS, leanAxis);
        restQ.copy(baseQ);
        // flat in-plane object roll
        flatRollQ.setFromAxisAngle(viewDir, deg(p.flatRoll));
        restQ.premultiply(flatRollQ);
        // orbit pose (persistent) — this is the "start position"
        if (orbitRef) {
          orbY.setFromAxisAngle(Y, deg(orbitRef.current.y));
          orbX.setFromAxisAngle(X, deg(orbitRef.current.x));
          restQ.premultiply(orbY).premultiply(orbX);
        }

        // ---- continuous spin about the chosen axis, from the rest pose ----
        spin += dt * (pausedRef?.current ? 0 : p.speed) * Math.PI * 2;
        if (p.spinAxis === "x") spinDir.set(1, 0, 0);
        else if (p.spinAxis === "y") spinDir.set(0, 1, 0);
        else if (p.spinAxis === "z") spinDir.copy(viewDir);
        // "3fold": spin about the object's own symmetry axis in the rest pose
        else spinDir.copy(TET_AXIS).applyQuaternion(restQ).normalize();
        spinQ.setFromAxisAngle(spinDir, spin);

        // free drag-spin: momentum decays by friction; reset on request
        if (!lite) {
          if (spinResetRef?.current) {
            dragQ.identity();
            velX = 0;
            velY = 0;
            spinResetRef.current = false;
          }
          if (
            !dragging &&
            p.dragSpin &&
            (Math.abs(velX) > 1e-4 || Math.abs(velY) > 1e-4)
          ) {
            tmpDragQ.setFromAxisAngle(X, velX);
            dragQ.premultiply(tmpDragQ);
            tmpDragQ.setFromAxisAngle(Y, velY);
            dragQ.premultiply(tmpDragQ);
            const keep = Math.pow(Math.max(0, 1 - p.friction), dt);
            velX *= keep;
            velY *= keep;
          }
          renderer.domElement.style.cursor = dragging
            ? "grabbing"
            : p.dragSpin
              ? "grab"
              : "pointer";
        }

        star.quaternion.copy(restQ).premultiply(spinQ).premultiply(dragQ);

        // rotation-axis indicator line
        if (p.showAxis) {
          axisLine.visible = true;
          if (!lite && (Math.abs(velX) > 1e-3 || Math.abs(velY) > 1e-3)) {
            axisVec.set(velX, velY, 0).normalize(); // momentum axis
          } else {
            axisVec.copy(spinDir); // auto-spin axis
          }
          const L = 2.4;
          const ap = axisGeo.getAttribute("position") as THREE.BufferAttribute;
          ap.setXYZ(0, -axisVec.x * L, -axisVec.y * L, -axisVec.z * L);
          ap.setXYZ(1, axisVec.x * L, axisVec.y * L, axisVec.z * L);
          ap.needsUpdate = true;
        } else {
          axisLine.visible = false;
        }

        // Slide the tetrahedra apart along their shared (local) 3-fold axis,
        // controlling where they intersect.
        tetA.position.copy(TET_AXIS).multiplyScalar(p.separation);
        tetB.position.copy(TET_AXIS).multiplyScalar(-p.separation);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      renderer.dispose();
      geoA.dispose();
      geoB.dispose();
      edgesA.dispose();
      edgesB.dispose();
      octEdges.dispose();
      spikeGeo.dispose();
      spikeEdges.dispose();
      litMat.dispose();
      flatMat.dispose();
      edgeMaterial.dispose();
      planeGeo.dispose();
      planeMat.dispose();
      axisGeo.dispose();
      axisMat.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [paramsRef, size]);

  return <div ref={mountRef} style={{ width: size, height: size }} />;
}

// ---- controls ---------------------------------------------------------------

// Per-control "lock" toggles, shown only in variations mode. A locked control's
// param is held fixed (kept from the base) when generating random variations.
interface LockCtx {
  active: boolean;
  locked: Set<string>;
  toggle: (key: string) => void;
}
const LockContext = createContext<LockCtx>({
  active: false,
  locked: new Set(),
  toggle: () => {},
});

function LockToggle({ lockKey }: { lockKey?: string }) {
  const { active, locked, toggle } = useContext(LockContext);
  if (!active || !lockKey) return null;
  const on = locked.has(lockKey);
  return (
    <button
      type="button"
      onClick={() => toggle(lockKey)}
      aria-label={on ? "Unlock — include in Variations" : "Lock — omit from Variations"}
      title={on ? "Locked — won't randomize" : "Lock to omit from Variations"}
      className={cn(
        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded transition-colors",
        on
          ? "text-sky-400"
          : "text-muted-foreground/40 hover:text-muted-foreground",
      )}
    >
      {on ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
    </button>
  );
}

function ResetButton({
  show,
  onClick,
  label,
}: {
  show: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`Reset ${label}`}
      onClick={onClick}
      className={cn(
        "size-5 text-muted-foreground transition-opacity",
        show ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <RotateCcw className="size-3" />
    </Button>
  );
}

function Control({
  label,
  value,
  def,
  min,
  max,
  step = 0.01,
  onChange,
  lockKey,
}: {
  label: string;
  value: number;
  def: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  lockKey?: string;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <LockToggle lockKey={lockKey} />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <div className="flex items-center gap-0.5">
            <span className="font-mono text-xs tabular-nums">{value.toFixed(2)}</span>
            <ResetButton show={value !== def} onClick={() => onChange(def)} label={label} />
          </div>
        </div>
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(v) => {
            if (v[0] !== undefined) onChange(v[0]);
          }}
        />
      </div>
    </div>
  );
}

// Wraps a non-slider control row (switch/button-group) with a lock on its left.
function LockRow({
  lockKey,
  children,
}: {
  lockKey: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <LockToggle lockKey={lockKey} />
      <div className="flex flex-1 items-center justify-between">{children}</div>
    </div>
  );
}

// Palette + reference-eyedropper made available to every ColorControl.
interface PickerCtx {
  palette: string[];
  startPick: (label: string, apply: (c: string) => void) => void;
}
const PaletteContext = createContext<PickerCtx>({
  palette: [],
  startPick: () => {},
});

function ColorControl({
  label,
  value,
  def,
  onChange,
}: {
  label: string;
  value: string;
  def: string;
  onChange: (v: string) => void;
}) {
  const { palette, startPick } = useContext(PaletteContext);
  const [palOpen, setPalOpen] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-6 cursor-pointer rounded border border-border bg-transparent"
          title="Custom colour"
        />
        <span className="w-14 font-mono text-[10px] text-muted-foreground">
          {value}
        </span>
        <Popover open={palOpen} onOpenChange={setPalOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="Pick from palette"
              className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <Palette className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-2">
            <div className="grid grid-cols-6 gap-1.5">
              {palette.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => {
                    onChange(c);
                    setPalOpen(false);
                  }}
                  className={cn(
                    "size-5 rounded-full border border-white/25 transition-transform hover:scale-110",
                    value.toLowerCase() === c.toLowerCase() && "ring-2 ring-sky-400",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          title="Pick from reference"
          onClick={() => startPick(label, onChange)}
          className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          <Pipette className="size-3.5" />
        </button>
        <ResetButton
          show={value.toLowerCase() !== def.toLowerCase()}
          onClick={() => onChange(def)}
          label={label}
        />
      </div>
    </div>
  );
}

function Section({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="py-3 text-sm">{title}</AccordionTrigger>
      <AccordionContent className="flex flex-col gap-3 pb-4">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

interface ApplyTarget {
  label: string;
  apply: (c: string) => void;
}

function Swatch({ color, targets }: { color: string; targets: ApplyTarget[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={color}
          className="size-7 rounded-full border border-white/25 shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ backgroundColor: color }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
          <span
            className="size-3 rounded-full border border-white/30"
            style={{ backgroundColor: color }}
          />
          Apply {color} to…
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {targets.map((t) => (
          <DropdownMenuItem
            key={t.label}
            className="text-xs"
            onSelect={() => t.apply(color)}
          >
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GridOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* fine grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      {/* center crosshair */}
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/25" />
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/25" />
    </div>
  );
}

// Flat reference rendered to a canvas so we can sample the pixel colour on click.
function ReferenceArt({
  src,
  size,
  picking,
  onPick,
}: {
  src: string;
  size: number;
  picking: boolean;
  onPick: (c: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const img = new window.Image();
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      const ar = (img.naturalWidth || 23.64) / (img.naturalHeight || 20.47);
      let w = size;
      let h = size;
      if (ar >= 1) h = size / ar;
      else w = size * ar;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    };
    img.src = src;
  }, [src, size]);

  const pick = (e: React.MouseEvent) => {
    if (!picking) return;
    const cv = ref.current;
    const ctx = cv?.getContext("2d", { willReadFrequently: true });
    if (!cv || !ctx) return;
    const rect = cv.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * cv.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * cv.height);
    const d = ctx.getImageData(x, y, 1, 1).data;
    if (d[3] === 0) return; // transparent → ignore
    const hex =
      "#" +
      [d[0], d[1], d[2]].map((v) => (v ?? 0).toString(16).padStart(2, "0")).join("");
    onPick(hex);
  };

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      onClick={pick}
      style={{ width: size, height: size }}
      className={cn(
        "rounded-lg",
        picking && "cursor-crosshair ring-2 ring-sky-400",
      )}
    />
  );
}

// ---- variations grid -------------------------------------------------------

const rand = (min: number, max: number) => min + Math.random() * (max - min);
function choose<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

// Randomise everything EXCEPT colours (face/light/ambient/stroke colours kept)
// and any params whose control is locked (kept from the base).
function randomizeParams(base: Params, locked: Set<string>): Params {
  const keep = (key: string) => locked.has(key);
  return {
    ...base,
    speed: keep("speed") ? base.speed : rand(0.05, 0.8),
    spinAxis: keep("spinAxis") ? base.spinAxis : choose(["3fold", "x", "y", "z"] as const),
    separation: keep("separation")
      ? base.separation
      : Math.random() < 0.5
        ? 0
        : rand(-1, 1),
    leanFwd: keep("leanFwd") ? base.leanFwd : rand(-60, 60),
    leanSide: keep("leanSide") ? base.leanSide : rand(-60, 60),
    elevation: keep("elevation") ? base.elevation : rand(-1, 3),
    roll: keep("roll") ? base.roll : rand(-180, 180),
    flatRoll: keep("flatRoll") ? base.flatRoll : rand(-180, 180),
    frustum: keep("frustum") ? base.frustum : rand(1.7, 2.7),
    flatFaces: keep("flatFaces") ? base.flatFaces : Math.random() < 0.5,
    geomMode: keep("geomMode") ? base.geomMode : Math.random() < 0.4 ? "spike" : "tet",
    showIntersect: keep("showIntersect") ? base.showIntersect : Math.random() < 0.6,
    showStroke: keep("showStroke") ? base.showStroke : Math.random() < 0.85,
    lights: base.lights.map((l, i) => ({
      ...l,
      intensity: keep(`light-${i}-intensity`) ? l.intensity : rand(1, 4),
      az: keep(`light-${i}-az`) ? l.az : rand(-180, 180),
      el: keep(`light-${i}-el`) ? l.el : rand(-90, 90),
    })) as [Light, Light, Light],
  };
}

function GridCell({
  params,
  size,
  primary,
  onClick,
}: {
  params: Params;
  size: number;
  primary?: boolean;
  onClick?: () => void;
}) {
  const ref = useRef(params);
  ref.current = params;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card",
        primary
          ? "ring-2 ring-sky-400"
          : "cursor-pointer transition hover:ring-1 hover:ring-white/40",
      )}
      style={{ width: size, height: size }}
    >
      <MerkabaCanvas paramsRef={ref} size={size} lite />
      <span
        className={cn(
          "absolute left-1.5 top-1.5 rounded px-1 text-[9px]",
          primary ? "bg-sky-500/80 text-white" : "bg-black/50 text-white/70",
        )}
      >
        {primary ? "current" : "apply"}
      </span>
    </button>
  );
}

export default function SpinnerPlaygroundPage() {
  const [p, setP] = useState<Params>(DEFAULTS);
  const [showGrid, setShowGrid] = useState(false);
  const [gridOver, setGridOver] = useState(true);
  const [variationsMode, setVariationsMode] = useState(false);
  const [variations, setVariations] = useState<Params[]>([]);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const toggleLock = (key: string) =>
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const [pickTarget, setPickTarget] = useState<{
    label: string;
    apply: (c: string) => void;
  } | null>(null);
  const selectedFaceRef = useRef<{ label: string; apply: (c: string) => void } | null>(null);
  const [palette, setPalette] = useState<string[]>(INTRADARK_PALETTE);
  const [draft, setDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["palette", "motion"]);
  const [hlId, setHlId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [orbitX, setOrbitX] = useState(0);
  const [orbitY, setOrbitY] = useState(0);
  const orbitRef = useRef({ x: 0, y: 0 });
  orbitRef.current.x = orbitX;
  orbitRef.current.y = orbitY;
  const spinResetRef = useRef(false);
  const defaultsRef = useRef<Params>(DEFAULTS);
  const paramsRef = useRef<Params>(p);
  paramsRef.current = p;

  // Load saved defaults + palette from localStorage on mount.
  useEffect(() => {
    try {
      const d = localStorage.getItem(STORE_DEFAULTS);
      if (d) {
        const saved = { ...DEFAULTS, ...JSON.parse(d) } as Params;
        defaultsRef.current = saved;
        setP(saved);
      }
      const pal = localStorage.getItem(STORE_PALETTE);
      if (pal) {
        const arr = JSON.parse(pal);
        if (Array.isArray(arr) && arr.length) setPalette(arr);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist palette edits (after hydration so we don't clobber saved with seed).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORE_PALETTE, JSON.stringify(palette));
    } catch {
      /* ignore */
    }
  }, [palette, hydrated]);

  const D = DEFAULTS;
  const set = (patch: Partial<Params>) => setP((prev) => ({ ...prev, ...patch }));
  const setLight = (i: number, patch: Partial<Light>) =>
    setP((prev) => {
      const lights = [...prev.lights] as [Light, Light, Light];
      const current = lights[i];
      if (current) lights[i] = { ...current, ...patch };
      return { ...prev, lights };
    });
  const setFace = (tet: "A" | "B", f: number, color: string) =>
    setP((prev) => {
      const key = tet === "A" ? "tetAFaces" : "tetBFaces";
      const faces = [...prev[key]] as [string, string, string, string];
      faces[f] = color;
      return { ...prev, [key]: faces };
    });
  const setSpikeFace = (s: number, f: number, color: string) =>
    setP((prev) => {
      const arr = [...prev.spikeFaces];
      arr[s * 3 + f] = color;
      return { ...prev, spikeFaces: arr };
    });
  const setSpikeGroup = (s: number, color: string) =>
    setP((prev) => {
      const arr = [...prev.spikeFaces];
      arr[s * 3] = arr[s * 3 + 1] = arr[s * 3 + 2] = color;
      return { ...prev, spikeFaces: arr };
    });

  const saveAsDefault = () => {
    defaultsRef.current = p;
    try {
      localStorage.setItem(STORE_DEFAULTS, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  };
  const addColors = () => {
    const found = draft
      .split(/[\s,]+/)
      .map(normalizeHex)
      .filter((c): c is string => Boolean(c));
    if (found.length) setPalette((prev) => Array.from(new Set([...prev, ...found])));
    setDraft("");
  };
  const openVariations = () => {
    setVariations(Array.from({ length: 14 }, () => randomizeParams(p, locked)));
    setVariationsMode(true);
  };
  const rerollVariations = () =>
    setVariations(Array.from({ length: 14 }, () => randomizeParams(p, locked)));

  const startPick = (label: string, apply: (c: string) => void) =>
    setPickTarget({ label, apply });
  const handleRefPick = (c: string) => {
    pickTarget?.apply(c);
    setPickTarget(null);
  };
  // Esc cancels an armed eyedropper.
  useEffect(() => {
    if (!pickTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickTarget]);

  // Press [i] after clicking a face → native screen eyedropper for that face.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "i" && e.key !== "I") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const sel = selectedFaceRef.current;
      const EyeDropperCtor = (
        window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }
      ).EyeDropper;
      if (!sel || !EyeDropperCtor) return;
      new EyeDropperCtor()
        .open()
        .then((res) => sel.apply(res.sRGBHex))
        .catch(() => {});
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleFaceClick = (hit: FaceHit) => {
    setPaused(true);
    let section: string;
    let id: string;
    let apply: (c: string) => void;
    let label: string;
    if (hit.kind === "tet") {
      section = "faces";
      id = `face-${hit.tet}-${hit.face}`;
      apply = (c) => setFace(hit.tet, hit.face, c);
      label = `Tet ${hit.tet} · face ${hit.face + 1}`;
    } else if (p.spikeFaceMode) {
      section = "spikes";
      id = `spikeface-${hit.spike}-${hit.face}`;
      apply = (c) => setSpikeFace(hit.spike, hit.face, c);
      label = `spike ${SPIKE_LABELS[hit.spike]} · face ${hit.face + 1}`;
    } else {
      section = "spikes";
      id = `spike-group-${hit.spike}`;
      apply = (c) => setSpikeGroup(hit.spike, c);
      label = `spike ${SPIKE_LABELS[hit.spike]}`;
    }
    selectedFaceRef.current = { label, apply };
    setOpenSections((prev) => (prev.includes(section) ? prev : [...prev, section]));
    setHlId(id);
    window.setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    window.setTimeout(() => setHlId(null), 1800);
  };

  const TARGETS: ApplyTarget[] = [
    { label: "Light 1", apply: (c) => setLight(0, { color: c }) },
    { label: "Light 2", apply: (c) => setLight(1, { color: c }) },
    { label: "Light 3", apply: (c) => setLight(2, { color: c }) },
    { label: "Ambient", apply: (c) => set({ ambientColor: c }) },
    { label: "Stroke", apply: (c) => set({ strokeColor: c }) },
    { label: "Tet A · face 1", apply: (c) => setFace("A", 0, c) },
    { label: "Tet A · face 2", apply: (c) => setFace("A", 1, c) },
    { label: "Tet A · face 3", apply: (c) => setFace("A", 2, c) },
    { label: "Tet A · face 4", apply: (c) => setFace("A", 3, c) },
    { label: "Tet B · face 1", apply: (c) => setFace("B", 0, c) },
    { label: "Tet B · face 2", apply: (c) => setFace("B", 1, c) },
    { label: "Tet B · face 3", apply: (c) => setFace("B", 2, c) },
    { label: "Tet B · face 4", apply: (c) => setFace("B", 3, c) },
    ...SPIKE_LABELS.map((lbl, s) => ({
      label: `Spike ${lbl} (all)`,
      apply: (c: string) => setSpikeGroup(s, c),
    })),
  ];

  return (
    <PaletteContext.Provider value={{ palette, startPick }}>
    <LockContext.Provider value={{ active: variationsMode, locked, toggle: toggleLock }}>
    <main className="dark flex h-screen gap-6 overflow-hidden bg-background p-6 text-foreground">
      {/* center: variations grid, or flat reference + 3D preview */}
      {variationsMode ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-auto p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Variations</span>
            <span className="text-xs text-muted-foreground">
              first = current · click any to apply · lock a control (right) to omit it
            </span>
            <Button size="sm" className="h-7" onClick={rerollVariations}>
              Randomize 14
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => setVariationsMode(false)}
            >
              Exit
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[p, ...variations].map((vp, i) => (
              <GridCell
                key={i}
                params={vp}
                size={168}
                primary={i === 0}
                onClick={
                  i === 0
                    ? undefined
                    : () => {
                        setP(vp);
                        setVariationsMode(false);
                      }
                }
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center gap-10">
        <div className="flex flex-col items-center gap-2">
          <ReferenceArt
            src="/images/logos/intradark-symbol-blue.svg"
            size={208}
            picking={!!pickTarget}
            onPick={handleRefPick}
          />
          <span className="text-xs text-muted-foreground">
            {pickTarget
              ? `click to pick → ${pickTarget.label} (Esc to cancel)`
              : "flat SVG · reference"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border bg-card p-6">
              <div className="relative">
                <div className="relative z-10">
                  <MerkabaCanvas
                    paramsRef={paramsRef}
                    size={440}
                    onFaceClick={handleFaceClick}
                    pausedRef={pausedRef}
                    orbitRef={orbitRef}
                    spinResetRef={spinResetRef}
                  />
                </div>
                {showGrid && (
                  <GridOverlay className={gridOver ? "z-20" : "z-0"} />
                )}
              </div>
            </div>
            {/* Y-axis orbit (vertical), active while paused */}
            <div className="flex flex-col items-center gap-1">
              <Slider
                orientation="vertical"
                value={[orbitY]}
                min={-180}
                max={180}
                step={1}
                onValueChange={(v) => {
                  if (v[0] !== undefined) setOrbitY(v[0]);
                  setPaused(true);
                }}
                className="h-[460px]"
              />
              <span className="font-mono text-[10px] text-muted-foreground">
                Y {orbitY}°
              </span>
            </div>
          </div>

          {/* X-axis orbit (horizontal) under the preview */}
          <div className="flex w-[488px] items-center gap-2">
            <span className="w-12 font-mono text-[10px] text-muted-foreground">
              X {orbitX}°
            </span>
            <Slider
              value={[orbitX]}
              min={-180}
              max={180}
              step={1}
              onValueChange={(v) => {
                if (v[0] !== undefined) setOrbitX(v[0]);
                setPaused(true);
              }}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-5">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={showGrid} onCheckedChange={setShowGrid} />
              grid overlay
            </label>
            {showGrid && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={gridOver} onCheckedChange={setGridOver} />
                {gridOver ? "on top" : "behind"}
              </label>
            )}
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={paused} onCheckedChange={setPaused} />
              pause spin
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={p.showAxis} onCheckedChange={(c) => set({ showAxis: c })} />
              axis line
            </label>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => {
                setOrbitX(0);
                setOrbitY(0);
                spinResetRef.current = true;
              }}
            >
              reset view
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Tip: click a face, then press{" "}
            <kbd className="rounded border border-border px-1 font-mono">i</kbd>{" "}
            to eyedrop a colour from anywhere on screen.
          </p>
        </div>
      </div>
      )}

      {/* right: all controls in a scrollable accordion */}
      <div className="flex w-80 shrink-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-sm font-semibold">Controls</h1>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-7"
              onClick={openVariations}
            >
              Variations
            </Button>
            <Button size="sm" className="h-7" onClick={saveAsDefault}>
              Save as default
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => setP(defaultsRef.current)}
            >
              Reset all
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-card px-4">
          <Accordion
            type="multiple"
            value={openSections}
            onValueChange={setOpenSections}
          >
            <Section value="palette" title="Intradark colors">
              <div className="flex flex-wrap gap-2">
                {palette.map((c) => (
                  <Swatch key={c} color={c} targets={TARGETS} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addColors();
                  }}
                  placeholder="#0483c8, #00497d…"
                  className="h-7 text-xs"
                />
                <Button size="sm" variant="secondary" className="h-7" onClick={addColors}>
                  Add
                </Button>
              </div>
              <button
                type="button"
                className="self-start text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setPalette(INTRADARK_PALETTE)}
              >
                reset palette
              </button>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Click a colour, then choose where to apply it. Add hexes (comma or
                space separated) to grow the list.
              </p>
            </Section>

            <Section value="motion" title="Motion & camera">
              <Control label="speed" value={p.speed} def={D.speed} min={0} max={1.5} onChange={(v) => set({ speed: v })} lockKey="speed" />
              <LockRow lockKey="spinAxis">
                <Label className="text-xs text-muted-foreground">spin axis</Label>
                <div className="flex gap-1">
                  {(["3fold", "x", "y", "z"] as const).map((ax) => (
                    <button
                      key={ax}
                      type="button"
                      onClick={() => set({ spinAxis: ax })}
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] transition-colors",
                        p.spinAxis === ax
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {ax === "3fold" ? "3-fold" : ax.toUpperCase()}
                    </button>
                  ))}
                </div>
              </LockRow>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">drag to spin</Label>
                <Switch checked={p.dragSpin} onCheckedChange={(c) => set({ dragSpin: c })} />
              </div>
              {p.dragSpin && (
                <>
                  <Control label="friction" value={p.friction} def={D.friction} min={0} max={1} onChange={(v) => set({ friction: v })} />
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    Drag to fling it, or click a spot to send it rolling evenly
                    that way (about the centre). Friction = how fast it slows
                    (0 = never stops). “reset view” recentres it.
                  </p>
                </>
              )}
              <Control label="separation" value={p.separation} def={D.separation} min={-1.5} max={1.5} onChange={(v) => set({ separation: v })} lockKey="separation" />
              <Control label="lean fwd°" value={p.leanFwd} def={D.leanFwd} min={-90} max={90} step={1} onChange={(v) => set({ leanFwd: v })} lockKey="leanFwd" />
              <Control label="lean side°" value={p.leanSide} def={D.leanSide} min={-90} max={90} step={1} onChange={(v) => set({ leanSide: v })} lockKey="leanSide" />
              <Control label="elevation" value={p.elevation} def={D.elevation} min={-4} max={6} step={0.1} onChange={(v) => set({ elevation: v })} lockKey="elevation" />
              <Control label="roll°" value={p.roll} def={D.roll} min={-180} max={180} step={1} onChange={(v) => set({ roll: v })} lockKey="roll" />
              <Control label="flat roll°" value={p.flatRoll} def={D.flatRoll} min={-180} max={180} step={1} onChange={(v) => set({ flatRoll: v })} lockKey="flatRoll" />
              <Control label="zoom" value={p.frustum} def={D.frustum} min={1.2} max={3.5} step={0.05} onChange={(v) => set({ frustum: v })} lockKey="frustum" />
            </Section>

            {p.lights.map((l, i) => {
              const dl = D.lights[i] ?? l;
              return (
              <Section key={i} value={`light-${i}`} title={`Light ${i + 1}`}>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">enabled</Label>
                  <Switch checked={l.enabled} onCheckedChange={(c) => setLight(i, { enabled: c })} />
                </div>
                <div className={cn("flex flex-col gap-3", !l.enabled && "pointer-events-none opacity-40")}>
                  <ColorControl label="color" value={l.color} def={dl.color} onChange={(v) => setLight(i, { color: v })} />
                  <Control label="intensity" value={l.intensity} def={dl.intensity} min={0} max={6} step={0.1} onChange={(v) => setLight(i, { intensity: v })} lockKey={`light-${i}-intensity`} />
                  <Control label="azimuth°" value={l.az} def={dl.az} min={-180} max={180} step={1} onChange={(v) => setLight(i, { az: v })} lockKey={`light-${i}-az`} />
                  <Control label="elevation°" value={l.el} def={dl.el} min={-90} max={90} step={1} onChange={(v) => setLight(i, { el: v })} lockKey={`light-${i}-el`} />
                </div>
              </Section>
              );
            })}

            <Section value="faces" title="Tet faces">
              <LockRow lockKey="flatFaces">
                <Label className="text-xs text-muted-foreground">flat (ignore lights)</Label>
                <Switch checked={p.flatFaces} onCheckedChange={(c) => set({ flatFaces: c })} />
              </LockRow>
              <p className="text-[10px] leading-snug text-muted-foreground">
                {p.flatFaces
                  ? "Flat: faces render at their literal colour, unlit."
                  : "Lit: white shows the lights; a tint is multiplied by the lighting."}
                {" Set speed to 0 to identify which face is which."}
              </p>
              <div className="text-[11px] font-medium text-foreground/70">Tet A</div>
              {p.tetAFaces.map((c, f) => (
                <div
                  key={f}
                  id={`face-A-${f}`}
                  className={cn(
                    "rounded-md transition-shadow",
                    hlId === `face-A-${f}` && "ring-2 ring-sky-400",
                  )}
                >
                  <ColorControl label={`face ${f + 1}`} value={c} def="#ffffff" onChange={(v) => setFace("A", f, v)} />
                </div>
              ))}
              <div className="mt-1 text-[11px] font-medium text-foreground/70">Tet B</div>
              {p.tetBFaces.map((c, f) => (
                <div
                  key={f}
                  id={`face-B-${f}`}
                  className={cn(
                    "rounded-md transition-shadow",
                    hlId === `face-B-${f}` && "ring-2 ring-sky-400",
                  )}
                >
                  <ColorControl label={`face ${f + 1}`} value={c} def="#ffffff" onChange={(v) => setFace("B", f, v)} />
                </div>
              ))}
            </Section>

            <Section value="spikes" title="Spikes (8-tet)">
              <LockRow lockKey="geomMode">
                <Label className="text-xs text-muted-foreground">8-spike geometry</Label>
                <Switch
                  checked={p.geomMode === "spike"}
                  onCheckedChange={(c) => set({ geomMode: c ? "spike" : "tet" })}
                />
              </LockRow>
              <div
                className={cn(
                  "flex flex-col gap-3",
                  p.geomMode !== "spike" && "pointer-events-none opacity-40",
                )}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">individual faces</Label>
                  <Switch
                    checked={p.spikeFaceMode}
                    onCheckedChange={(c) => set({ spikeFaceMode: c })}
                  />
                </div>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Octahedron + 8 spikes — same shape, 8 × 3 = 24 faces. The top
                  picker sets a whole spike; turn on “individual faces” for the 3
                  faces each. Click a face on the model to jump to its control.
                </p>
                {SPIKE_LABELS.map((lbl, s) => (
                  <div key={s} className="flex flex-col gap-2 border-t border-border/40 pt-2">
                    <div
                      id={`spike-group-${s}`}
                      className={cn(
                        "rounded-md transition-shadow",
                        hlId === `spike-group-${s}` && "ring-2 ring-sky-400",
                      )}
                    >
                      <ColorControl
                        label={`spike ${lbl}`}
                        value={p.spikeFaces[s * 3] ?? "#ffffff"}
                        def="#ffffff"
                        onChange={(v) => setSpikeGroup(s, v)}
                      />
                    </div>
                    {p.spikeFaceMode &&
                      [0, 1, 2].map((f) => (
                        <div
                          key={f}
                          id={`spikeface-${s}-${f}`}
                          className={cn(
                            "ml-3 rounded-md transition-shadow",
                            hlId === `spikeface-${s}-${f}` && "ring-2 ring-sky-400",
                          )}
                        >
                          <ColorControl
                            label={`· face ${f + 1}`}
                            value={p.spikeFaces[s * 3 + f] ?? "#ffffff"}
                            def="#ffffff"
                            onChange={(v) => setSpikeFace(s, f, v)}
                          />
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </Section>

            <Section value="ambient" title="Ambient & stroke">
              <ColorControl label="ambient" value={p.ambientColor} def={D.ambientColor} onChange={(v) => set({ ambientColor: v })} />
              <Control label="amb intensity" value={p.ambientIntensity} def={D.ambientIntensity} min={0} max={1} onChange={(v) => set({ ambientIntensity: v })} />
              <ColorControl label="stroke" value={p.strokeColor} def={D.strokeColor} onChange={(v) => set({ strokeColor: v })} />
              <Control label="stroke α" value={p.strokeOpacity} def={D.strokeOpacity} min={0} max={1} onChange={(v) => set({ strokeOpacity: v })} />
              <LockRow lockKey="showStroke">
                <Label className="text-xs text-muted-foreground">show stroke</Label>
                <Switch checked={p.showStroke} onCheckedChange={(c) => set({ showStroke: c })} />
              </LockRow>
              <LockRow lockKey="showIntersect">
                <Label className="text-xs text-muted-foreground">intersection edges</Label>
                <Switch checked={p.showIntersect} onCheckedChange={(c) => set({ showIntersect: c })} />
              </LockRow>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">drop shadow</Label>
                <Switch checked={p.showShadow} onCheckedChange={(c) => set({ showShadow: c })} />
              </div>
            </Section>

            <Section value="values" title="Values (JSON)">
              <pre className="max-h-60 overflow-auto rounded-md bg-muted/40 p-3 text-[10px] text-muted-foreground">
                {JSON.stringify(p, null, 2)}
              </pre>
            </Section>
          </Accordion>
        </div>
      </div>
    </main>
    </LockContext.Provider>
    </PaletteContext.Provider>
  );
}
