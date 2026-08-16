'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Gauri's face — a procedurally-built 3D robotic/wireframe head rendered in
// Three.js, replacing the old static photo + CSS-overlay approach.
//
// Why procedural instead of a sourced human face model: it stays consistent
// with the site's amber/JARVIS visual language everywhere else, needs no
// external rigged asset (licensing-free, fully ours), and every animated
// part below — the blink curve and the mouth shape — is real geometry moving
// in real 3D space, not a sprite or gif.
//
// Blink: a hand-authored easing curve (fast close, brief hold, slower
// re-open), randomized timing, occasional double-blink — this is the same
// technique real blendshape rigs use, just driven by a small state machine
// here instead of an imported animation clip.
//
// Mouth: built as a line of points we reshape every frame by lerping toward
// one of four named "viseme" target shapes (closed / narrow / wide / round).
// The parent page picks which shape to move toward — see the `viseme` prop —
// driven by real word-boundary timing from SpeechSynthesisUtterance, with a
// graceful fallback cycle if the browser/voice never fires that event. This
// is the same underlying idea as morph-target blendshape lip-sync: named
// poses, interpolated in real time.

const AMBER = 0xe8a33d;

function buildMouthArc(openAmt, widenAmt, points) {
  const pts = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = THREE.MathUtils.lerp(-0.55 - widenAmt, 0.55 + widenAmt, t);
    const y = -Math.sin(t * Math.PI) * openAmt;
    pts.push(new THREE.Vector3(x, y, 0));
  }
  return pts;
}

export default function GauriFace3D({ mode, viseme }) {
  const mountRef = useRef(null);
  const liveRef = useRef({ mode: 'idle', viseme: 'closed' });

  useEffect(() => {
    liveRef.current.mode = mode;
  }, [mode]);

  useEffect(() => {
    liveRef.current.viseme = viseme || 'closed';
  }, [viseme]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let width = mount.clientWidth || 340;
    let height = mount.clientHeight || 424;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 0, 9.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // --- Head shell: layered wireframe ellipsoid, hologram-style ---
    const headGeo = new THREE.SphereGeometry(2.55, 28, 22);
    headGeo.scale(0.85, 1.12, 0.9);
    const headWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(headGeo),
      new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.16 })
    );
    group.add(headWire);

    const headShell = new THREE.Mesh(
      headGeo,
      new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.035, side: THREE.DoubleSide })
    );
    group.add(headShell);

    // Jaw accent ring (lower face contour)
    const jawGeo = new THREE.TorusGeometry(1.55, 0.012, 6, 40, Math.PI * 1.15);
    const jaw = new THREE.LineSegments(
      new THREE.WireframeGeometry(jawGeo),
      new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.4 })
    );
    jaw.rotation.z = Math.PI * 1.32;
    jaw.position.set(0, -1.15, 2.05);
    group.add(jaw);

    // Brow accent line
    const browGeoL = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.12, 0.78, 2.05), new THREE.Vector3(-0.44, 0.9, 2.15),
    ]);
    const browGeoR = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(1.12, 0.78, 2.05), new THREE.Vector3(0.44, 0.9, 2.15),
    ]);
    const browMat = new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.35 });
    group.add(new THREE.Line(browGeoL, browMat), new THREE.Line(browGeoR, browMat));

    // --- Eyes: glowing ring + pupil, each an independent group we scale for blink ---
    function makeEye(x) {
      const eyeGroup = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.032, 10, 30),
        new THREE.MeshBasicMaterial({ color: AMBER })
      );
      const pupil = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 20),
        new THREE.MeshBasicMaterial({ color: AMBER })
      );
      pupil.position.z = 0.02;
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.48, 24),
        new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.06 })
      );
      glow.position.z = -0.01;
      eyeGroup.add(glow, ring, pupil);
      eyeGroup.position.set(x, 0.32, 2.18);
      return eyeGroup;
    }
    const eyeL = makeEye(-0.74);
    const eyeR = makeEye(0.74);
    group.add(eyeL, eyeR);

    // --- Mouth: point-array line, reshaped every frame toward a named viseme ---
    const MOUTH_SEGS = 14;
    const mouthShapes = {
      closed: buildMouthArc(0.015, 0, MOUTH_SEGS),
      narrow: buildMouthArc(0.11, 0.02, MOUTH_SEGS),
      wide: buildMouthArc(0.2, 0.09, MOUTH_SEGS),
      round: buildMouthArc(0.13, -0.12, MOUTH_SEGS),
    };
    const mouthGeo = new THREE.BufferGeometry().setFromPoints(mouthShapes.closed);
    const mouthLine = new THREE.Line(mouthGeo, new THREE.LineBasicMaterial({ color: AMBER, linewidth: 2 }));
    mouthLine.position.set(0, -0.92, 2.2);
    group.add(mouthLine);
    const currentMouth = mouthShapes.closed.map((p) => p.clone());

    // --- Fine particle field for a "digital" texture, orbiting loosely around the head ---
    const PARTICLE_COUNT = 90;
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.lerp(-1, 1, Math.random()));
      const r = 2.85 + Math.random() * 0.55;
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 0.9;
      particlePositions[i * 3 + 1] = r * Math.cos(phi) * 1.05;
      particlePositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) * 0.85;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({ color: AMBER, size: 0.028, transparent: true, opacity: 0.35 })
    );
    group.add(particles);

    // --- Animation loop ---
    let frameId;
    const blink = { phase: 'idle', start: 0, next: performance.now() + 1400, doubleQueued: false };
    let mouthTarget = 'closed';

    function scheduleNextBlink(now) {
      blink.next = now + 2400 + Math.random() * 4000;
      blink.doubleQueued = Math.random() < 0.16;
    }

    function animate(now) {
      frameId = requestAnimationFrame(animate);
      const t = now * 0.001;

      // idle micro-motion — subtle head presence, not a static bust
      group.rotation.y = Math.sin(t * 0.32) * 0.045;
      group.rotation.x = Math.sin(t * 0.47) * 0.018;
      group.position.y = Math.sin(t * 0.85) * 0.02;
      particles.rotation.y = t * 0.06;

      // --- blink state machine ---
      if (blink.phase === 'idle' && now >= blink.next) {
        blink.phase = 'closing';
        blink.start = now;
      }
      let eyeScale = 1;
      if (blink.phase === 'closing') {
        const p = Math.min(1, (now - blink.start) / 105);
        eyeScale = 1 - p * p;
        if (p >= 1) { blink.phase = 'hold'; blink.start = now; }
      } else if (blink.phase === 'hold') {
        eyeScale = 0;
        if (now - blink.start > 45) { blink.phase = 'opening'; blink.start = now; }
      } else if (blink.phase === 'opening') {
        const p = Math.min(1, (now - blink.start) / 170);
        eyeScale = 1 - (1 - p) * (1 - p);
        if (p >= 1) {
          if (blink.doubleQueued) {
            blink.doubleQueued = false;
            blink.phase = 'idle';
            blink.next = now + 130;
          } else {
            blink.phase = 'idle';
            scheduleNextBlink(now);
          }
        }
      }
      eyeL.scale.y = Math.max(0.04, eyeScale);
      eyeR.scale.y = Math.max(0.04, eyeScale);

      // --- mouth: lerp current point cloud toward the live target viseme ---
      const speaking = liveRef.current.mode === 'speaking';
      const desired = speaking ? liveRef.current.viseme || 'narrow' : 'closed';
      mouthTarget = desired;
      const targetPts = mouthShapes[mouthTarget] || mouthShapes.closed;
      const posAttr = mouthGeo.attributes.position;
      for (let i = 0; i < currentMouth.length; i++) {
        currentMouth[i].lerp(targetPts[i], 0.22);
        posAttr.setXYZ(i, currentMouth[i].x, currentMouth[i].y, currentMouth[i].z);
      }
      posAttr.needsUpdate = true;

      // --- listening / speaking ambient glow pulse on the head shell ---
      const listening = liveRef.current.mode === 'listening';
      const pulse = listening ? Math.sin(t * 3.2) * 0.5 + 0.5 : speaking ? Math.sin(t * 9) * 0.5 + 0.5 : 0;
      headShell.material.opacity = 0.035 + pulse * (listening ? 0.05 : 0.025);
      headWire.material.opacity = 0.16 + pulse * 0.08;

      renderer.render(scene, camera);
    }
    frameId = requestAnimationFrame(animate);

    function onResize() {
      if (!mount) return;
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      renderer.dispose();
      headGeo.dispose();
      jawGeo.dispose();
      particleGeo.dispose();
      mouthGeo.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="gav-face3d-mount" />;
}
