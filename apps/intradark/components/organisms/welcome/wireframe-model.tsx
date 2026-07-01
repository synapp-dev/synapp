"use client";

/**
 * A CS2 (Source 2) model exported to glTF, rendered as a brand-blue wireframe.
 *
 * - Weapons/grenades carry baked clips (inspect/reload) that are SCRUBBED by
 *   scroll position (`mixer.setTime(pass*duration)`).
 * - Static meshes (e.g. the spawn-point player bodies, which have geometry but
 *   no skeleton) turntable on scroll instead.
 *
 * Orientation is solved at runtime from three's authoritative bounding box:
 * the thinnest axis is rotated into the screen (so the broad side faces us),
 * then laid landscape (weapons) or upright (players), then fit-to-fill so it
 * reads big. No per-model rotation guessing required.
 *
 * Robust: own WebGL canvas, lazy (only renders while near the viewport), and if
 * the .glb is missing/failing it renders nothing (no crash, no layout shift).
 *
 * Models are extracted from the CS2 install with Source 2 Viewer CLI
 * (ValveResourceFormat): `-i <pak01_dir.vpk> -d -f <path> -o <out>
 * --gltf_export_format glb --gltf_export_animations`.
 */

import * as React from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { cn } from "@workspace/ui/lib/utils";

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));
const WX = new THREE.Vector3(1, 0, 0);
const WY = new THREE.Vector3(0, 1, 0);
const WZ = new THREE.Vector3(0, 0, 1);

export interface WireframeModelProps {
  /** Public path to the exported .glb, e.g. "/models/ak47.glb". */
  src: string;
  className?: string;
  /** Wireframe colour. Default brand light blue. */
  color?: string;
  /** Line opacity. Default 0.5. */
  opacity?: number;
  /** Animation clip to scrub, by name (e.g. "inventory_inspect"). Falls back to clipIndex. */
  clipName?: string;
  clipIndex?: number;
  /** Stand the model up (players) vs lay it landscape (weapons). Default false. */
  upright?: boolean;
  /** Fraction of the canvas the model fills. Higher = bigger. Default 0.92. */
  zoom?: number;
  /** Extra world-space rotation (radians) applied AFTER auto-orient, for fine tuning. */
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  /** Scroll window the scrub/turntable maps across (fractions of a viewport pass). */
  scrubStart?: number;
  scrubEnd?: number;
  /** Degrees of turntable spin across the pass when there is no clip. Default 150. */
  fallbackSpinDeg?: number;
}

export function WireframeModel({
  src,
  className,
  color = "#4c9ccb",
  opacity = 0.5,
  clipName,
  clipIndex = 0,
  upright = false,
  zoom = 0.92,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
  scrubStart = 0.08,
  scrubEnd = 0.92,
  fallbackSpinDeg = 150,
}: WireframeModelProps) {
  const mountRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let raf = 0;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const root = new THREE.Group();
    scene.add(root);

    // Framing state, filled once the model is oriented.
    let frameCenter: THREE.Vector3 | null = null;
    let frameSize: THREE.Vector3 | null = null;
    let baseQuat: THREE.Quaternion | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let clipDuration = 0;
    let hasClip = false;

    const frameCamera = () => {
      if (!frameCenter || !frameSize) return;
      const halfV = Math.tan((camera.fov * Math.PI) / 360);
      const fitH = frameSize.y / 2 / halfV;
      const fitW = frameSize.x / 2 / (halfV * camera.aspect);
      const dist = Math.max(fitH, fitW) / clamp(zoom, 0.1, 2);
      camera.position.set(
        frameCenter.x,
        frameCenter.y,
        frameCenter.z + dist + frameSize.z,
      );
      camera.lookAt(frameCenter);
      camera.updateProjectionMatrix();
    };

    const setSize = () => {
      const w = mount.clientWidth || 400;
      const h = mount.clientHeight || 400;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      frameCamera();
    };
    setSize();
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const wireMat = () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        wireframe: true,
        transparent: true,
        opacity,
        depthWrite: false,
      });

    const measure = () =>
      new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());

    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.material = wireMat();
            mesh.frustumCulled = false;
          }
        });
        root.add(model);

        // 1) Thinnest axis → into the screen (Z), so the broad side faces us.
        let s = measure();
        const shortIdx = [s.x, s.y, s.z].indexOf(Math.min(s.x, s.y, s.z));
        if (shortIdx === 0) root.rotateOnWorldAxis(WY, Math.PI / 2);
        else if (shortIdx === 1) root.rotateOnWorldAxis(WX, Math.PI / 2);

        // 2) Lay out the two remaining axes: upright → taller one vertical;
        //    landscape → longer one horizontal.
        s = measure();
        if (upright) {
          if (s.x > s.y) root.rotateOnWorldAxis(WZ, Math.PI / 2);
        } else if (s.y > s.x) {
          root.rotateOnWorldAxis(WZ, Math.PI / 2);
        }

        // 3) Optional manual tweaks.
        if (rotationY) root.rotateOnWorldAxis(WY, rotationY);
        if (rotationX) root.rotateOnWorldAxis(WX, rotationX);
        if (rotationZ) root.rotateOnWorldAxis(WZ, rotationZ);

        baseQuat = root.quaternion.clone();

        // 4) Frame it.
        const box = new THREE.Box3().setFromObject(root);
        frameCenter = box.getCenter(new THREE.Vector3());
        frameSize = box.getSize(new THREE.Vector3());
        frameCamera();

        // 5) Animation.
        if (gltf.animations && gltf.animations.length > 0) {
          const byName = clipName
            ? gltf.animations.find((a) => a.name === clipName)
            : undefined;
          const clip =
            byName ?? gltf.animations[clipIndex] ?? gltf.animations[0]!;
          mixer = new THREE.AnimationMixer(model);
          const action = mixer.clipAction(clip);
          action.play();
          action.paused = true;
          clipDuration = clip.duration;
          hasClip = true;
        }
      },
      undefined,
      () => {
        /* missing/failed asset — silent empty canvas */
      },
    );

    const spinRange = (fallbackSpinDeg * Math.PI) / 180;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!frameCenter) return;

      const rect = mount.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < -80 || rect.top > vh + 80) return;

      setSize();

      const pass = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
      const p = reduce
        ? 0.5
        : clamp(
            (pass - scrubStart) / Math.max(0.001, scrubEnd - scrubStart),
            0,
            1,
          );

      if (mixer && hasClip) {
        mixer.setTime(p * clipDuration);
      } else if (baseQuat) {
        root.quaternion.copy(baseQuat);
        root.rotateOnWorldAxis(WY, -spinRange / 2 + p * spinRange);
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => setSize();
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      mixer?.stopAllAction();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const mat = mesh.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [
    src,
    color,
    opacity,
    clipName,
    clipIndex,
    upright,
    zoom,
    rotationX,
    rotationY,
    rotationZ,
    scrubStart,
    scrubEnd,
    fallbackSpinDeg,
  ]);

  return (
    <div ref={mountRef} className={cn("h-full w-full", className)} aria-hidden />
  );
}
