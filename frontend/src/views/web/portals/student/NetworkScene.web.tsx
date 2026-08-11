// @ts-nocheck
/**
 * NetworkScene — web-only three.js hero backdrop.
 *
 * Renders a slowly-rotating point cloud with nearest-neighbour connecting
 * lines: a literal "alumni graph" visual (nodes = people, edges = network)
 * that doubles as the AI/tech motif for the hero. Additive-blended violet /
 * blue / teal points match the FinTax360 glass palette.
 *
 * Platform-split: this file only resolves on web (Metro `.web.tsx`
 * extension). The native counterpart (NetworkScene.tsx) is a no-op stub,
 * so `three` never enters the iOS/Android bundle graph.
 *
 * Respects prefers-reduced-motion (freezes rotation/parallax, still renders
 * a static frame) and pauses the render loop when the tab is hidden.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import * as THREE from 'three';

export default function NetworkScene({ intensity = 1 }: { intensity?: number }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === 'undefined') return undefined;

    const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 0, 19);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.pointerEvents = 'none';
    host.appendChild(renderer.domElement);

    const isSmall = window.innerWidth < 768;
    const COUNT = isSmall ? 60 : 150;
    const RADIUS = 13;

    const positions = new Float32Array(COUNT * 3);
    const nodes = [];
    for (let i = 0; i < COUNT; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * RADIUS * 2.3,
        (Math.random() - 0.5) * RADIUS * 1.3,
        (Math.random() - 0.5) * RADIUS,
      );
      nodes.push(v);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const palette = [0x8b5cf6, 0x3b82f6, 0x22d3ee];
    const colors = new Float32Array(COUNT * 3);
    const tmpColor = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      tmpColor.set(palette[i % palette.length]);
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointsMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.85 * intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(pointsGeo, pointsMat);

    // Nearest-neighbour edges — capped per-node so the graph stays legible.
    const lineVerts = [];
    const LINK_DIST = 4.4;
    for (let i = 0; i < COUNT; i++) {
      let links = 0;
      for (let j = i + 1; j < COUNT && links < 3; j++) {
        if (nodes[i].distanceTo(nodes[j]) < LINK_DIST) {
          lineVerts.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
          links++;
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineVerts), 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.13 * intensity,
      blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);

    const group = new THREE.Group();
    group.rotation.x = 0.18;
    group.add(points, lines);
    scene.add(group);

    let pointerX = 0;
    let pointerY = 0;
    let camX = 0;
    let camY = 0;
    const onPointerMove = (e) => {
      pointerX = e.clientX / window.innerWidth - 0.5;
      pointerY = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(host);
    window.addEventListener('resize', resize);

    let running = true;
    const onVisibility = () => { running = !document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);

    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!running) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!reducedMotion) {
        group.rotation.y += dt * 0.045;
        camX += (pointerX * 2.2 - camX) * 0.035;
        camY += (-pointerY * 1.6 - camY) * 0.035;
        camera.position.x = camX;
        camera.position.y = camY;
        camera.lookAt(0, 0, 0);
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      ro?.disconnect();
      pointsGeo.dispose();
      lineGeo.dispose();
      pointsMat.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [intensity]);

  return <View ref={hostRef} pointerEvents="none" style={StyleSheet.absoluteFillObject} />;
}
