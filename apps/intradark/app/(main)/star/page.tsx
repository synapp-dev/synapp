// app/components/StellatedTetrahedronMatte.tsx
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function StellatedTetrahedronMatte() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene / Camera / Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b0f14");
    const fov = 38;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Lighting: cool/warm split for strong face separation
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const key = new THREE.DirectionalLight(0xffffff, 0.9); // neutral key
    key.position.set(4, 5, 8);
    const coolSide = new THREE.DirectionalLight(0x7fc8ff, 0.45); // cooler fill
    coolSide.position.set(-6, -3, -5);
    const warmFill = new THREE.PointLight(0xffe0b3, 0.35); // warm bounce
    warmFill.position.set(0, 2, 0);
    scene.add(key, coolSide, warmFill);

    // Geometry
    const geo = new THREE.TetrahedronGeometry(1.5, 0);
    geo.center();

    // Materials (matte)
    const matA = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#0483c8"),
      metalness: 0.12,
      roughness: 0.55, // matte, geometric shading
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.98,
      depthWrite: true,
    });
    const matB = matA.clone();
    matB.color = new THREE.Color("#0483c8");

    const tetraA = new THREE.Mesh(geo, matA);
    const tetraB = new THREE.Mesh(geo, matB);
    tetraB.scale.set(-1, -1, -1);

    const edges = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({ color: new THREE.Color("#4b9ccb"), opacity: 0.35, transparent: true })
    );

    // Hierarchy: spinner -> model
    const spinner = new THREE.Group();
    const model = new THREE.Group();
    model.add(tetraA, tetraB, edges);
    spinner.add(model);
    scene.add(spinner);

    // Align a true vertex to +Y (point on top)
    const pos = geo.getAttribute("position");
    let top = new THREE.Vector3();
    let tmp = new THREE.Vector3();
    let maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      tmp.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (tmp.y > maxY) { maxY = tmp.y; top.copy(tmp); }
    }
    model.quaternion.setFromUnitVectors(top.clone().normalize(), new THREE.Vector3(0, 1, 0));

    // Frame camera + slight down-tilt so you see the apex center
    geo.computeBoundingSphere();
    const r = geo.boundingSphere!.radius;
    const fit = 1.35;
    const z = (r * fit) / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
    const phi = THREE.MathUtils.degToRad(25);
    camera.position.set(0, Math.tan(phi) * z, z);
    camera.lookAt(0, 0, 0);

    // Animate (steady left -> right spin)
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      spinner.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mountRef.current);

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      geo.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="flex items-center justify-center py-8">
      <div ref={mountRef} className="w-[420px] h-[420px] rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 shadow-xl" />
    </div>
  );
}
