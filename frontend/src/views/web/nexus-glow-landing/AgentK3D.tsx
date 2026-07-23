import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/* ─── tiny helpers ──────────────────────────────────────────── */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ─── palette ───────────────────────────────────────────────── */
const C = {
  body:       0xf0f0ff,
  bodyShad:   0xdcd8f8,
  head:       0xfafafe,
  eyeOuter:   0x1a1240,
  eyeInner:   0x2a6cff,
  eyeGlow:    0x6ee7ff,
  pupil:      0xffffff,
  antenna:    0xd0c8f8,
  antTip:     0xff80c8,
  k:          0xc850ff,
  kGlow:      0xff4ecd,
  arm:        0xe8e4fc,
  joint:      0xb8b0ec,
  platform:   0xf8d8ff,
  platGlow:   0xd090ff,
  shadow:     0xb090dd,
};

/* ─── material factory ──────────────────────────────────────── */
const mat = (color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.08, ...opts });

export function AgentK3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [greeting, setGreeting] = useState(false);
  const [mood, setMood]         = useState<"idle" | "happy" | "wave">("idle");
  const stateRef = useRef({ greeting: false, mood: "idle" as "idle" | "happy" | "wave" });

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    /* ── renderer ────────────────────────── */
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    /* ── scene / camera ──────────────────── */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.3, 5.5);

    /* ── lighting ────────────────────────── */
    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(amb);

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xb0c0ff, 0.6);
    fill.position.set(-4, 2, 2);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xff80ff, 0.4);
    rim.position.set(0, -2, -4);
    scene.add(rim);

    const ptGlow = new THREE.PointLight(0xd090ff, 1.2, 6);
    ptGlow.position.set(0, -1.4, 0);
    scene.add(ptGlow);

    /* ── root group ──────────────────────── */
    const root  = new THREE.Group();
    scene.add(root);

    /* ══════════════════════════════════════
       BUILD AGENT K
    ══════════════════════════════════════ */

    /* ── body ────────────────────────────── */
    const bodyGeo = new THREE.SphereGeometry(0.72, 32, 32);
    bodyGeo.scale(1, 1.12, 0.9);
    const body = new THREE.Mesh(bodyGeo, mat(C.body));
    body.castShadow = true;
    body.position.y = -0.15;
    root.add(body);

    /* ── chest "k" emblem ─────────────────── */
    const emblemGroup = new THREE.Group();
    emblemGroup.position.set(0, -0.12, 0.72);
    body.add(emblemGroup);

    // circle backing
    const emblemBg = new THREE.Mesh(
      new THREE.CircleGeometry(0.26, 32),
      new THREE.MeshStandardMaterial({ color: C.k, roughness: 0.2, metalness: 0.3, emissive: C.kGlow, emissiveIntensity: 0.35 })
    );
    emblemGroup.add(emblemBg);

    // "K" letter — built from boxes
    const letterMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
    const addBar = (sx: number, sy: number, sz: number, px: number, py: number, pz: number, ry = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), letterMat);
      m.position.set(px, py, pz);
      m.rotation.z = ry;
      emblemGroup.add(m);
    };
    addBar(0.045, 0.28, 0.02, -0.045, 0,     0.01);          // vertical
    addBar(0.13,  0.045, 0.02, 0.045, 0.06,  0.01, -0.55);   // top diagonal
    addBar(0.13,  0.045, 0.02, 0.045, -0.06, 0.01,  0.55);   // bottom diagonal

    /* ── shoulder joints ─────────────────── */
    const makeJoint = (x: number) => {
      const g = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat(C.joint));
      g.position.set(x, -0.05, 0);
      body.add(g);
      return g;
    };
    makeJoint(-0.82);
    makeJoint( 0.82);

    /* ── right arm (waving) ──────────────── */
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.82, -0.05, 0);
    body.add(rightArmGroup);

    const armGeo = new THREE.CapsuleGeometry(0.1, 0.42, 8, 16);
    const rightArm = new THREE.Mesh(armGeo, mat(C.arm));
    rightArm.position.set(0.28, 0.1, 0);
    rightArm.rotation.z = -0.7;
    rightArmGroup.add(rightArm);

    // hand
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), mat(C.arm));
    rightHand.position.set(0.55, 0.38, 0);
    rightArmGroup.add(rightHand);

    // fingers
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.03, 0.1, 4, 8),
        mat(C.arm)
      );
      const angle = (i / 3) * 1.1 - 0.55;
      f.position.set(rightHand.position.x + Math.cos(angle) * 0.13, rightHand.position.y + 0.12, Math.sin(angle) * 0.05);
      f.rotation.z = angle * 0.3;
      rightArmGroup.add(f);
    }

    /* ── left arm (resting) ──────────────── */
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.82, -0.05, 0);
    body.add(leftArmGroup);

    const leftArm = new THREE.Mesh(armGeo, mat(C.arm));
    leftArm.position.set(-0.28, -0.12, 0);
    leftArm.rotation.z = 0.35;
    leftArmGroup.add(leftArm);

    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), mat(C.arm));
    leftHand.position.set(-0.52, -0.38, 0);
    leftArmGroup.add(leftHand);

    /* ── neck ────────────────────────────── */
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 0.22, 16),
      mat(C.joint)
    );
    neck.position.y = 0.64;
    body.add(neck);

    /* ── head ────────────────────────────── */
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.5;
    root.add(headGroup);

    const headGeo = new THREE.SphereGeometry(0.58, 32, 32);
    headGeo.scale(1, 1.05, 0.95);
    const head = new THREE.Mesh(headGeo, mat(C.head));
    head.castShadow = true;
    headGroup.add(head);

    /* ── face plate removed per user request ─────────── */

    /* ── eyes ────────────────────────────── */
    const makeEye = (x: number, rotY: number) => {
      const eyeGroup = new THREE.Group();
      // Lowered eyes slightly (y: 0.02) for cuter "baby" proportions
      eyeGroup.position.set(x, 0.02, 0.54);
      eyeGroup.rotation.y = rotY;
      eyeGroup.scale.set(0.85, 1.25, 1); // Cute oval shape

      // outer ring
      const outer = new THREE.Mesh(
        new THREE.CircleGeometry(0.14, 32),
        new THREE.MeshStandardMaterial({ color: C.eyeOuter, roughness: 0.1 })
      );
      eyeGroup.add(outer);

      // iris glow
      const iris = new THREE.Mesh(
        new THREE.CircleGeometry(0.11, 32),
        new THREE.MeshStandardMaterial({ color: C.eyeInner, emissive: C.eyeGlow, emissiveIntensity: 0.8, roughness: 0.0 })
      );
      iris.position.z = 0.001;
      eyeGroup.add(iris);

      // pupil
      const pupil = new THREE.Mesh(
        new THREE.CircleGeometry(0.075, 32),
        new THREE.MeshStandardMaterial({ color: C.pupil, emissive: 0xffffff, emissiveIntensity: 0.9 })
      );
      pupil.position.set(x < 0 ? 0.015 : -0.015, 0, 0.002);
      eyeGroup.add(pupil);

      // cute anime eye highlight (catchlight)
      const highlight = new THREE.Mesh(
        new THREE.CircleGeometry(0.025, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      highlight.position.set(0.025, 0.035, 0.003); // Top right of the pupil
      eyeGroup.add(highlight);

      // secondary tiny highlight
      const highlightSmall = new THREE.Mesh(
        new THREE.CircleGeometry(0.01, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      highlightSmall.position.set(-0.02, -0.03, 0.003);
      eyeGroup.add(highlightSmall);

      // point-light glow
      const ePt = new THREE.PointLight(C.eyeGlow, 0.5, 1.2);
      ePt.position.z = 0.1;
      eyeGroup.add(ePt);

      headGroup.add(eyeGroup);
      return { eyeGroup, iris, pupil };
    };

    // Angled outwards, placed slightly closer together
    const eyeL = makeEye(-0.16, -0.22);
    const eyeR = makeEye( 0.16,  0.22);

    /* pink blush removed per user request */

    /* ── smile removed per user request ──────────── */

    /* ── ear panels ──────────────────────── */
    const makeEar = (x: number) => {
      const ear = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.08, 24),
        new THREE.MeshStandardMaterial({ color: C.joint, metalness: 0.3, roughness: 0.3 })
      );
      ear.rotation.z = Math.PI / 2;
      ear.position.set(x, 0.06, 0);
      headGroup.add(ear);
    };
    makeEar(-0.58);
    makeEar( 0.58);

    /* ── antenna ─────────────────────────── */
    const antennaGroup = new THREE.Group();
    antennaGroup.position.y = 0.56;
    headGroup.add(antennaGroup);

    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.38, 12),
      mat(C.antenna)
    );
    stick.position.y = 0.19;
    antennaGroup.add(stick);

    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshStandardMaterial({ color: C.antTip, emissive: C.antTip, emissiveIntensity: 0.7, roughness: 0.1 })
    );
    tip.position.y = 0.42;
    antennaGroup.add(tip);

    const tipGlow = new THREE.PointLight(C.antTip, 0.6, 1.5);
    tipGlow.position.y = 0.42;
    antennaGroup.add(tipGlow);

    /* ── platform ────────────────────────── */
    const platGeo = new THREE.CylinderGeometry(0.7, 0.55, 0.12, 32);
    const plat = new THREE.Mesh(
      platGeo,
      new THREE.MeshStandardMaterial({ color: C.platform, emissive: C.platGlow, emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.2 })
    );
    plat.position.y = -1.15;
    plat.receiveShadow = true;
    root.add(plat);

    // platform ring
    const ringGeo = new THREE.TorusGeometry(0.72, 0.03, 8, 64);
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshStandardMaterial({ color: C.platGlow, emissive: C.platGlow, emissiveIntensity: 0.9 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.09;
    root.add(ring);

    /* ── drop shadow plane ───────────────── */
    const shadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.65, 32),
      new THREE.MeshBasicMaterial({ color: C.shadow, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.09;
    root.add(shadowMesh);

    /* ══════════════════════════════════════
       ANIMATION STATE
    ══════════════════════════════════════ */
    let t = 0;
    let wavePhase   = 0;
    let greetTimer  = 0;
    let happyBounce = 0;
    let clickPulse  = 0;

    /* ── raycaster for click ─────────────── */
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects([body, head], true);
      if (hits.length > 0) {
        stateRef.current.mood = "happy";
        setMood("happy");
        clickPulse = 1;
        setTimeout(() => {
          stateRef.current.mood = "idle";
          setMood("idle");
        }, 2800);
      }
    };
    el.addEventListener("click", onClick);

    /* ── mouse tracking (eye follow) ─────── */
    let mxN = 0, myN = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mxN = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      myN = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    };
    el.addEventListener("mousemove", onMouseMove);

    /* ── resize ──────────────────────────── */
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* ══════════════════════════════════════
       RENDER LOOP
    ══════════════════════════════════════ */
    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;

      const curMood = stateRef.current.mood;

      /* ── float ────────────────────────── */
      const floatY   = Math.sin(t * 0.9) * 0.14;
      const floatTilt = Math.sin(t * 0.6) * 0.025;
      root.position.y = floatY;
      root.rotation.z = floatTilt;

      /* ── gentle self-rotation ─────────── */
      root.rotation.y = Math.sin(t * 0.4) * 0.2 + mxN * 0.15;

      /* ── head tilt follows mouse ─────── */
      headGroup.rotation.y = lerp(headGroup.rotation.y, mxN * 0.22, 0.06);
      headGroup.rotation.x = lerp(headGroup.rotation.x, -myN * 0.12, 0.06);

      /* ── platform shadow sync ─────────── */
      const shadowS = 1 - (floatY + 0.14) * 0.35;
      shadowMesh.scale.set(shadowS, shadowS, shadowS);
      (shadowMesh.material as THREE.MeshBasicMaterial).opacity = 0.18 * shadowS;

      /* ── platform ring pulse ─────────── */
      ring.rotation.y += 0.012;
      const ringGlow = 0.5 + Math.sin(t * 2.2) * 0.4;
      (ring.material as THREE.MeshStandardMaterial).emissiveIntensity = ringGlow;

      /* ── antenna tip blink ───────────── */
      tipGlow.intensity = 0.4 + Math.sin(t * 4) * 0.35;

      /* blink logic removed */

      /* ── eye iris subtle pulse ──────── */
      const eyePulse = 0.9 + Math.sin(t * 3.1) * 0.1;
      eyeL.iris.scale.setScalar(eyePulse);
      eyeR.iris.scale.setScalar(eyePulse);

      /* ── eye follow mouse ───────────── */
      const eyeOffX = mxN * 0.03;
      const eyeOffY = -myN * 0.02;
      eyeL.pupil.position.set(eyeOffX, eyeOffY, 0.002);
      eyeR.pupil.position.set(eyeOffX, eyeOffY, 0.002);

      /* ── move arms ───────────────────── */
      if (curMood === "idle" || curMood === "wave") {
        wavePhase += dt * 3.2;
        // Right arm waves
        rightArmGroup.rotation.z = -0.5 + Math.sin(wavePhase) * 0.35;
        rightArmGroup.rotation.x = Math.sin(wavePhase * 0.7) * 0.1;
        
        // Left arm subtle swing
        leftArmGroup.rotation.z = Math.sin(wavePhase * 0.85) * 0.2;
        leftArmGroup.rotation.x = Math.sin(wavePhase * 0.65) * 0.15;
      }

      /* ── happy mood ──────────────────── */
      happyBounce = curMood === "happy" ? Math.sin(t * 8) * 0.06 : 0;
      root.position.y = floatY + happyBounce;

      /* ── click pulse ─────────────────── */
      if (clickPulse > 0) {
        clickPulse = Math.max(0, clickPulse - dt * 1.2);
        const ps = 1 + clickPulse * 0.08;
        root.scale.setScalar(lerp(1, ps, clickPulse));
        ptGlow.intensity = 1.2 + clickPulse * 2.5;
      } else {
        root.scale.setScalar(1);
        ptGlow.intensity = 1.2;
      }

      /* ── subtle body sway ────────────── */
      body.rotation.z = Math.sin(t * 1.1) * 0.02;

      /* ── greeting timer ──────────────── */
      greetTimer += dt;
      if (greetTimer > 12 && !stateRef.current.greeting) {
        stateRef.current.greeting = true;
        setGreeting(true);
        setTimeout(() => {
          stateRef.current.greeting = false;
          setGreeting(false);
        }, 3500);
        greetTimer = 0;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener("click", onClick);
      el.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Three.js canvas mount */}
      <div ref={mountRef} className="w-full h-full cursor-pointer" />

      {/* ── "Agent K" name badge ── */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1.5">
        {/* glowing pill name tag */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-indigo-200/60 shadow-[0_4px_20px_rgba(139,92,246,0.3)]">
          {/* animated dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500"></span>
          </span>
          <span className="text-sm font-black tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-violet-600 bg-clip-text text-transparent">
            Agent K
          </span>
          <span className="text-[10px] font-semibold text-indigo-400/80 tracking-wide">AI • ONLINE</span>
        </div>
        {/* subtitle */}
        <span className="text-[10px] font-semibold text-indigo-400/60 tracking-widest uppercase">
          Your Career Companion
        </span>
      </div>

      {/* Greeting speech bubble */}
      <div
        className={`absolute top-4 left-1/2 -translate-x-1/2 transition-all duration-500 pointer-events-none ${
          greeting ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-3 scale-95"
        }`}
      >
        <div className="relative bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-2xl px-4 py-2.5 shadow-lg shadow-indigo-200/50 whitespace-nowrap">
          <span className="text-sm font-bold text-indigo-700">
            Hi! 👋 I'm <span className="text-fuchsia-600">Agent K</span>!
          </span>
          {/* bubble tail */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 border-b border-r border-indigo-100 rotate-45 rounded-sm" />
        </div>
      </div>

      {/* Mood indicator */}
      {mood === "happy" && (
        <div className="absolute top-4 right-4 text-lg animate-bounce pointer-events-none">🎉</div>
      )}
    </div>
  );
}
