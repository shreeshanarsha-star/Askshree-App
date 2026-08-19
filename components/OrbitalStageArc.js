'use client';
import { useEffect, useRef, useState } from 'react';
import { DEPARTMENTS, Icon } from './OrbitalSystems';

// Third reactor style: real WebGL arc reactor (metal rings + tick belt)
// with a Sri Chakra (9 interlocking triangles + bindu) glowing in the
// center circle, in place of the sunburst/dial's flat CSS core. Same
// selection contract as OrbitalStage/OrbitalStageDial (selectedId,
// onSelect, onMicClick, voiceActive) so ReactorHome can swap this in with
// no other code changes -- the 12 department nodes sit on the ring using
// the identical left/top-percentage math and CSS classes as the other two
// styles (orb2-node-wrap etc.), so hover/keyboard/selection all behave the
// same; only the center visual and the ring itself are new.
//
// The center click target doubles as the mic button (talk to Hey Shree),
// exactly like the other two styles' core -- it's the same physical spot
// users already expect to tap.
export function OrbitalStageArc({ selectedId, onSelect, onMicClick, voiceActive }) {
  const n = DEPARTMENTS.length;
  const R = 39;
  const [hintOn, setHintOn] = useState(true);
  const stageRef = useRef(null);
  const mountRef = useRef(null);
  const voiceActiveRef = useRef(voiceActive);

  useEffect(() => { voiceActiveRef.current = voiceActive; }, [voiceActive]);
  useEffect(() => { if (selectedId) setHintOn(false); }, [selectedId]);

  useEffect(() => {
    let disposed = false;
    let renderer, composer, camera, scene, reactor, coreLight, chakraSprite, rafId;
    let ro;

    (async () => {
      const THREE = await import('three');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
      const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');
      const { OutputPass } = await import('three/examples/jsm/postprocessing/OutputPass.js');
      if (disposed || !mountRef.current) return;

      const mount = mountRef.current;
      const size = () => [mount.clientWidth || 1, mount.clientHeight || 1];

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.05);

      let [w0, h0] = size();
      camera = new THREE.PerspectiveCamera(38, w0 / h0, 0.1, 100);
      camera.position.set(0, 0.1, 7.6);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w0, h0);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.9;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      scene.add(new THREE.AmbientLight(0x121c38, 0.7));
      coreLight = new THREE.PointLight(0x8fd6ff, 8, 8, 2);
      scene.add(coreLight);
      const rim1 = new THREE.PointLight(0x4488ff, 3.2, 16);
      rim1.position.set(-4, 2, 3.5);
      scene.add(rim1);
      const rim2 = new THREE.PointLight(0xffffff, 2.6, 16);
      rim2.position.set(4, -1.5, 4.5);
      scene.add(rim2);
      const fill = new THREE.PointLight(0xdfeeff, 2.4, 18);
      fill.position.set(0, 0.5, 7);
      scene.add(fill);

      reactor = new THREE.Group();
      scene.add(reactor);

      const metal = new THREE.MeshStandardMaterial({ color: 0xb9c8e0, metalness: 1, roughness: 0.32, envMapIntensity: 0.55 });
      const metalDark = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.9, roughness: 0.45, envMapIntensity: 0.5 });
      const emissive = new THREE.MeshBasicMaterial({ color: 0xdff3ff });

      const ringDefs = [
        { r: 0.7, tube: 0.075 },
        { r: 1.05, tube: 0.05 },
        { r: 1.4, tube: 0.09 },
        { r: 1.75, tube: 0.04 },
      ];
      ringDefs.forEach((d, i) => {
        const geo = new THREE.TorusGeometry(d.r, d.tube, 24, 120);
        reactor.add(new THREE.Mesh(geo, i % 2 === 0 ? metal : metalDark));
      });

      const tickGeo = new THREE.BoxGeometry(0.03, 0.09, 0.03);
      const tickCount = 28;
      const ticks = new THREE.InstancedMesh(tickGeo, emissive, tickCount);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < tickCount; i++) {
        const a = (Math.PI * 2 / tickCount) * i;
        dummy.position.set(Math.cos(a) * 1.95, Math.sin(a) * 1.95, 0);
        dummy.rotation.z = a;
        dummy.updateMatrix();
        ticks.setMatrixAt(i, dummy.matrix);
      }
      reactor.add(ticks);

      // Sri Chakra drawn to an offscreen canvas, used as a camera-facing
      // sprite texture in the center circle (approved design -- see
      // askshree-sri-chakra-reactor.html / reactor-preview.html).
      const chakraCanvas = document.createElement('canvas');
      chakraCanvas.width = chakraCanvas.height = 512;
      {
        const c = chakraCanvas.getContext('2d');
        const W = 512, cx = W / 2, cy = W / 2;
        const glow = c.createRadialGradient(cx, cy, 0, cx, cy, W * 0.42);
        glow.addColorStop(0, 'rgba(235,245,255,.65)');
        glow.addColorStop(0.45, 'rgba(200,225,255,.28)');
        glow.addColorStop(1, 'rgba(200,225,255,0)');
        c.fillStyle = glow;
        c.fillRect(0, 0, W, W);
        const Rr = W * 0.4;
        const triangles = [
          { apexY: -0.86, baseY: 0.84, hw: 0.92 * Rr },
          { apexY: -0.62, baseY: 0.70, hw: 0.72 * Rr },
          { apexY: -0.40, baseY: 0.53, hw: 0.53 * Rr },
          { apexY: -0.20, baseY: 0.32, hw: 0.32 * Rr },
          { apexY: 0.90, baseY: -0.85, hw: 0.95 * Rr },
          { apexY: 0.76, baseY: -0.66, hw: 0.78 * Rr },
          { apexY: 0.58, baseY: -0.48, hw: 0.60 * Rr },
          { apexY: 0.40, baseY: -0.28, hw: 0.42 * Rr },
          { apexY: 0.20, baseY: -0.10, hw: 0.20 * Rr },
        ];
        c.strokeStyle = 'rgba(225,240,255,.95)';
        c.lineWidth = 2.4;
        c.shadowColor = 'rgba(150,205,255,.95)';
        c.shadowBlur = 14;
        triangles.forEach((t) => {
          const ay = cy + t.apexY * Rr, by = cy + t.baseY * Rr;
          c.beginPath();
          c.moveTo(cx, ay);
          c.lineTo(cx - t.hw, by);
          c.lineTo(cx + t.hw, by);
          c.closePath();
          c.stroke();
        });
        c.shadowBlur = 22;
        c.shadowColor = 'rgba(255,255,255,1)';
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(cx, cy, 6, 0, Math.PI * 2);
        c.fill();
      }
      const chakraTex = new THREE.CanvasTexture(chakraCanvas);
      chakraSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: chakraTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      chakraSprite.scale.set(1.3, 1.3, 1);
      reactor.add(chakraSprite);

      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new OutputPass());

      const resize = () => {
        const [w, h] = size();
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
      };
      ro = new ResizeObserver(resize);
      ro.observe(mount);
      resize();

      let t = 0;
      const tick = () => {
        if (disposed) return;
        t += 0.01;
        const speedUp = voiceActiveRef.current ? 1.8 : 1;
        reactor.rotation.z += 0.0018;
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.6 * speedUp);
        chakraSprite.scale.setScalar(1.3 + breathe * (voiceActiveRef.current ? 0.12 : 0.05));
        coreLight.intensity = 6 + breathe * (voiceActiveRef.current ? 7 : 3);
        camera.lookAt(0, 0, 0);
        composer.render();
        rafId = requestAnimationFrame(tick);
      };
      tick();
    })();

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onNodeKeyDown(e, id) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  }

  return (
    <div className="arc-stage-card" ref={stageRef}>
      <div className="arc-stage">
        <div className="arc-canvas-mount" ref={mountRef} />
        {DEPARTMENTS.map((d, i) => {
          const angle = -90 + (360 / n) * i;
          const rad = (angle * Math.PI) / 180;
          const left = 50 + R * Math.cos(rad);
          const top = 50 + R * Math.sin(rad);
          const labelAbove = Math.sin(rad) < -0.15;
          return (
            <div
              key={d.id}
              role="button"
              tabIndex={0}
              aria-label={d.name}
              className={`orb2-node-wrap orb2-${d.status} ${selectedId === d.id ? 'orb2-selected' : ''} ${labelAbove ? 'orb2-label-above' : 'orb2-label-below'}`}
              style={{ left: `${left}%`, top: `${top}%` }}
              onClick={() => onSelect(d.id)}
              onKeyDown={(e) => onNodeKeyDown(e, d.id)}
            >
              <div className="orb2-node">
                <Icon name={d.icon} />
              </div>
              <span className="orb2-nm">{d.name}</span>
            </div>
          );
        })}

        <div
          className={`arc-mic-hit${voiceActive ? ' arc-mic-active' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Talk to Hey Shree"
          title="Talk to Hey Shree"
          onClick={() => onMicClick && onMicClick()}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onMicClick) { e.preventDefault(); onMicClick(); } }}
        />
      </div>
      {!selectedId && (
        <div className={`orb2-hint ${hintOn ? 'orb2-hint-on' : 'orb2-hint-off'}`}>
          Tap a system to begin
        </div>
      )}
    </div>
  );
}
