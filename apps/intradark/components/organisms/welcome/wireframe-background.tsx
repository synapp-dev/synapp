"use client";

/**
 * A single persistent full-viewport layer behind the reel that renders the
 * active section's CS2 model as a solid brand-blue SILHOUETTE.
 *
 * Motion:
 * - The model turntables CLOCKWISE continuously and independently of scroll
 *   (time-based, a few degrees per second — "super slow").
 * - Scroll drives the ZOOM: the camera dollies from far (small, deep in the
 *   background) to near (large) as the section passes.
 * - It fades in/out at section edges and SWAPS model per section.
 *
 * One WebGL context; models are oriented + normalised once and cached. Fade is
 * applied to the whole canvas (CSS opacity) so the flat silhouette stays clean
 * (no double-blended transparent triangles). Honors prefers-reduced-motion
 * (still frame, mid zoom).
 */

import * as React from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface BgModel {
  src: string;
  upright?: boolean;
  color?: string;
}

const WX = new THREE.Vector3(1, 0, 0);
const WY = new THREE.Vector3(0, 1, 0);
const WZ = new THREE.Vector3(0, 0, 1);
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));
const smooth = (t: number) => t * t * (3 - 2 * t);

const TARGET = 2.3; // normalised model size (world units)
const FAR = 6.6; // camera distance when the model is deep in the background
const NEAR = 2.7; // camera distance when zoomed in
const MAX_OPACITY = 0.5; // peak silhouette opacity (whole-canvas)
const SPIN_DEG_PER_SEC = 6; // continuous clockwise turntable speed

interface Entry {
  outer: THREE.Group; // centered + scaled
  inner: THREE.Group; // oriented (spun for turntable)
  baseQuat: THREE.Quaternion;
}

export function WireframeBackground({ models }: { models: (BgModel | null)[] }) {
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
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const setSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    setSize();
    mount.appendChild(renderer.domElement);
    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.opacity = "0";

    const cache = new Map<string, Entry>();
    const loading = new Set<string>();
    const loader = new GLTFLoader();

    const prepare = (gltf: { scene: THREE.Group }, cfg: BgModel): Entry => {
      const model = gltf.scene;
      model.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          // Flat, unlit, solid single colour = clean silhouette. Double-sided
          // so open/concave meshes read as a filled shape with no holes.
          mesh.material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(cfg.color ?? "#4c9ccb"),
            side: THREE.DoubleSide,
          });
          mesh.frustumCulled = false;
        }
      });

      const inner = new THREE.Group();
      inner.add(model);
      const measure = () =>
        new THREE.Box3().setFromObject(inner).getSize(new THREE.Vector3());

      // Thinnest axis → into the screen.
      let s = measure();
      const shortIdx = [s.x, s.y, s.z].indexOf(Math.min(s.x, s.y, s.z));
      if (shortIdx === 0) inner.rotateOnWorldAxis(WY, Math.PI / 2);
      else if (shortIdx === 1) inner.rotateOnWorldAxis(WX, Math.PI / 2);
      // Upright (players/grenades) vs landscape (weapons).
      s = measure();
      if (cfg.upright) {
        if (s.x > s.y) inner.rotateOnWorldAxis(WZ, Math.PI / 2);
      } else if (s.y > s.x) {
        inner.rotateOnWorldAxis(WZ, Math.PI / 2);
      }
      const baseQuat = inner.quaternion.clone();

      // Center at origin, scale to a normalised size.
      const box = new THREE.Box3().setFromObject(inner);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      inner.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;

      const outer = new THREE.Group();
      outer.add(inner);
      outer.scale.setScalar(TARGET / maxDim);
      outer.visible = false;
      scene.add(outer);

      return { outer, inner, baseQuat };
    };

    const ensure = (cfg: BgModel) => {
      if (cache.has(cfg.src) || loading.has(cfg.src)) return;
      loading.add(cfg.src);
      loader.load(
        cfg.src,
        (gltf) => {
          loading.delete(cfg.src);
          if (disposed) return;
          cache.set(cfg.src, prepare(gltf, cfg));
        },
        undefined,
        () => loading.delete(cfg.src),
      );
    };

    const fadeCurve = (p: number) => {
      if (p < 0.16) return p / 0.16;
      if (p > 0.86) return (1 - p) / 0.14;
      return 1;
    };

    let currentSrc: string | null = null;
    let last = 0;
    let spin = 0; // accumulated turntable angle (radians)
    const spinPerMs = (SPIN_DEG_PER_SEC * Math.PI) / 180 / 1000;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? now - last : 0;
      last = now;
      // Clockwise (viewed from above) = negative Y rotation.
      if (!reduce) spin -= dt * spinPerMs;

      const vh = window.innerHeight;
      const els = Array.from(
        document.querySelectorAll<HTMLElement>("[data-welcome-section]"),
      );
      let active = 0;
      let best = Infinity;
      let activeRect: DOMRect | null = null;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - vh / 2);
        if (dist < best) {
          best = dist;
          active = Number(el.dataset.welcomeSection ?? 0);
          activeRect = r;
        }
      }

      const cfg = models[active] ?? null;
      const targetSrc = cfg?.src ?? null;
      if (targetSrc !== currentSrc) {
        currentSrc = targetSrc;
        if (cfg) ensure(cfg);
        const next = models[active + 1];
        const prev = models[active - 1];
        if (next) ensure(next);
        if (prev) ensure(prev);
      }

      for (const [src, e] of cache) e.outer.visible = src === currentSrc;

      const entry = currentSrc ? cache.get(currentSrc) : null;
      if (entry && activeRect) {
        const pass = clamp(
          (vh - activeRect.top) / (vh + activeRect.height),
          0,
          1,
        );
        const p = reduce ? 0.5 : pass;

        // Scroll → zoom (camera dolly).
        camera.position.set(0, 0, FAR + (NEAR - FAR) * smooth(p));
        camera.lookAt(0, 0, 0);

        // Continuous turntable, independent of scroll.
        entry.inner.quaternion.copy(entry.baseQuat);
        entry.inner.rotateOnWorldAxis(WY, spin);

        canvas.style.opacity = String((reduce ? 1 : fadeCurve(p)) * MAX_OPACITY);
      } else {
        canvas.style.opacity = "0";
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("resize", setSize);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setSize);
      for (const e of cache.values()) {
        e.outer.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.geometry?.dispose();
            const mat = mesh.material;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat?.dispose();
          }
        });
      }
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
    };
  }, [models]);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[2]"
    />
  );
}
