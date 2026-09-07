'use client';
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The 3D canvas host implements arrow-key rotation and zoom controls. */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Box } from 'lucide-react';
import {
  createModel,
  disposeGroup,
  optimizeExhibit,
  type Marker,
} from './models';
import type { Part } from './catalog';
import { markerText, text, type Language } from './i18n';
export type SceneCommand = {
  type: 'reset' | 'top' | 'bottom' | 'zoomIn' | 'zoomOut';
  tick: number;
};
type Props = {
  language: Language;
  part: Part;
  parts: Part[];
  rotate: boolean;
  operation: number;
  labels: boolean;
  explode: number;
  overview: boolean;
  command: SceneCommand;
  onSelect: (id: string) => void;
};
export default function Scene(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    runtime = useRef<{
      controls: OrbitControls;
      camera: THREE.PerspectiveCamera;
      objects: THREE.Group;
      renderer: THREE.WebGLRenderer;
      scene: THREE.Scene;
      markers: Marker[];
      size: number;
      distance: number;
      labels: HTMLDivElement[];
      explode: number;
      reset: (view?: string) => void;
    } | null>(null);
  const state = useRef(props);
  useEffect(() => {
    state.current = props;
  }, [props]);
  const [error, setError] = useState(false),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      queueMicrotask(() => setError(true));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor('#11161e');
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#11161e', 18, 55);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 150),
      controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI - 0.12;
    controls.minDistance = 2;
    controls.maxDistance = 55;
    controls.autoRotateSpeed = 0.65;
    controls.enablePan = true;
    const room = new RoomEnvironment(),
      pmrem = new THREE.PMREMGenerator(renderer),
      env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.58;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight('#c7dcff', '#334437', 2.25));
    const light = new THREE.DirectionalLight('#eff4ff', 4.5);
    light.position.set(4, 9, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 10;
    light.shadow.camera.bottom = -10;
    light.shadow.normalBias = 0.04;
    light.shadow.bias = -0.001;
    scene.add(light);
    const rim = new THREE.DirectionalLight('#bdd4fc', 3.2);
    rim.position.set(-7, 4, -5);
    scene.add(rim);
    const warm = new THREE.DirectionalLight('#d8e7b8', 1.2);
    warm.position.set(3, 2, -7);
    scene.add(warm);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshStandardMaterial({
        color: '#131a23',
        roughness: 0.9,
        metalness: 0.08,
        side: THREE.DoubleSide,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.05;
    ground.name = 'workbench-floor';
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(100, 100, '#2e3e50', '#253040');
    grid.position.y = -1.041;
    grid.name = 'workbench-grid';
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.47;
    scene.add(grid);
    const objects = new THREE.Group();
    scene.add(objects);
    const r = {
      controls,
      camera,
      objects,
      renderer,
      scene,
      markers: [] as Marker[],
      size: 5,
      distance: 10,
      labels: [] as HTMLDivElement[],
      explode: 0,
      reset: (view = 'reset') => {
        const rt = runtime.current;
        if (!rt) return;
        rt.objects.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(rt.objects);
        if (bounds.isEmpty())
          bounds.set(
            new THREE.Vector3(-2, -0.5, -2),
            new THREE.Vector3(2, 0.5, 2),
          );
        const target = bounds.getCenter(new THREE.Vector3());
        controls.target.copy(target);
        camera.up.set(0, 1, 0);
        const direction = (
          view === 'top'
            ? new THREE.Vector3(0, 1, 0.001)
            : view === 'bottom'
              ? new THREE.Vector3(0, -1, 0.001)
              : new THREE.Vector3(0.62, 0.67, 0.76)
        ).normalize();
        const right = new THREE.Vector3()
            .crossVectors(camera.up, direction)
            .normalize(),
          up = new THREE.Vector3().crossVectors(direction, right).normalize();
        const tanV =
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
          Math.max(0.6, (container.clientHeight - 70) / container.clientHeight);
        const tanH =
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
          camera.aspect *
          Math.max(0.55, (container.clientWidth - 90) / container.clientWidth);
        let distance = 2;
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z]) {
              const offset = new THREE.Vector3(x, y, z).sub(target),
                depth = offset.dot(direction);
              distance = Math.max(
                distance,
                depth + Math.abs(offset.dot(right)) / tanH,
                depth + Math.abs(offset.dot(up)) / tanV,
              );
            }
        rt.distance = distance * 1.08;
        controls.maxDistance = Math.max(
          state.current.overview ? 90 : 24,
          rt.distance * 2,
        );
        camera.far = Math.max(150, rt.distance * 4);
        camera.updateProjectionMatrix();
        camera.position.copy(target).addScaledVector(direction, rt.distance);
        controls.update();
      },
    };
    runtime.current = r;
    const resize = () => {
      const w = container.clientWidth,
        h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (r.objects.children.length) r.reset();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    let mouseStart = { x: 0, y: 0 };
    const down = (e: PointerEvent) => {
      mouseStart = { x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent) => {
      if (
        !state.current.overview ||
        Math.hypot(e.clientX - mouseStart.x, e.clientY - mouseStart.y) > 5
      )
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hits = ray.intersectObject(objects, true);
      if (hits.length) {
        let o: THREE.Object3D | null = hits[0].object;
        while (o && !o.userData.partId) o = o.parent;
        if (o?.userData.partId) state.current.onSelect(o.userData.partId);
      }
    };
    const key = (e: KeyboardEvent) => {
      if (
        [
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          '+',
          '-',
          '0',
        ].includes(e.key)
      ) {
        e.preventDefault();
        const offset = camera.position.clone().sub(controls.target);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          offset.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            e.key === 'ArrowLeft' ? 0.15 : -0.15,
          );
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          const spherical = new THREE.Spherical().setFromVector3(offset);
          spherical.phi = THREE.MathUtils.clamp(
            spherical.phi + (e.key === 'ArrowUp' ? -0.12 : 0.12),
            0.02,
            Math.PI - 0.02,
          );
          offset.setFromSpherical(spherical);
        } else if (e.key === '+' || e.key === '-') {
          offset.multiplyScalar(e.key === '+' ? 0.9 : 1.1);
        }
        if (e.key === '0') r.reset();
        else camera.position.copy(controls.target).add(offset);
        controls.update();
      }
    };
    container.addEventListener('keydown', key);
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointerup', up);
    const lost = (e: Event) => {
      e.preventDefault();
      setError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    const temp = new THREE.Vector3();
    let ready = false;
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      controls.autoRotate =
        state.current.rotate &&
        !state.current.overview &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      controls.update(dt);
      r.explode = THREE.MathUtils.damp(
        r.explode,
        state.current.overview ? 0 : state.current.explode / 100,
        8,
        dt,
      );
      objects.traverse((o) => {
        if (o.userData.explode !== undefined)
          o.position.y = o.userData.baseY + r.explode * o.userData.explode;
        const operation = state.current.overview ? 0 : state.current.operation;
        if (o.userData.press)
          o.position.y -= o.userData.press * (operation ? 1 : 0);
        if (o.userData.slide)
          o.position.x = o.userData.slide * (operation ? 2 : 0);
        if (o instanceof THREE.Mesh && o.userData.emitter) {
          const m = o.material as THREE.MeshStandardMaterial;
          m.emissiveIntensity = (
            o.userData.rgbChannel
              ? operation === o.userData.rgbChannel
              : operation > 0
          )
            ? 2.8
            : 0.03;
        }
        if (o instanceof THREE.Mesh && o.userData.glow) {
          const m = o.material as THREE.MeshBasicMaterial;
          m.opacity = operation ? 0.5 : 0;
          if (o.userData.rgb)
            m.color.set(
              ['#ff3344', '#ff3344', '#42ef7c', '#4786ff'][operation] ||
                '#ff3344',
            );
        }
      });
      // The ground moves out of the way when inspecting the underside.
      ground.visible = camera.position.y > ground.position.y + 0.1;
      grid.visible = ground.visible;
      for (let i = 0; i < r.labels.length; i++) {
        const el = r.labels[i],
          m = r.markers[i];
        if (!m) continue;
        temp.copy(m.point);
        temp.y += (m.explode || 0) * r.explode;
        temp.applyMatrix4(objects.matrixWorld).project(camera);
        el.style.display =
          state.current.labels &&
          !state.current.overview &&
          temp.z < 1 &&
          temp.z > -1
            ? 'flex'
            : 'none';
        el.style.left = `${(temp.x * 0.5 + 0.5) * container.clientWidth}px`;
        el.style.top = `${(-temp.y * 0.5 + 0.5) * container.clientHeight}px`;
      }
      renderer.render(scene, camera);
      if (!ready) {
        ready = true;
        setLoaded(true);
      }
    });
    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      container.removeEventListener('keydown', key);
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      r.labels.forEach((l) => l.remove());
      disposeGroup(scene);
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      runtime.current = null;
    };
  }, []);
  useEffect(() => {
    const r = runtime.current;
    if (!r) return;
    r.labels.forEach((l) => l.remove());
    r.labels = [];
    disposeGroup(r.objects);
    r.objects.clear();
    r.markers = [];
    r.explode = 0;
    if (props.overview) {
      const cols = Math.max(
          1,
          Math.min(15, Math.ceil(Math.sqrt(props.parts.length))),
        ),
        rows = Math.max(1, Math.ceil(props.parts.length / cols)),
        spacing = 4.3;
      props.parts.forEach((p, i) => {
        const { group } = createModel(p);
        optimizeExhibit(group);
        const bb = new THREE.Box3().setFromObject(group);
        const sz = bb.getSize(new THREE.Vector3());
        const scale = 2.65 / Math.max(sz.x, sz.y, sz.z);
        group.scale.setScalar(scale);
        group.position.set(
          ((i % cols) - (cols - 1) / 2) * spacing,
          0,
          (Math.floor(i / cols) - (rows - 1) / 2) * spacing,
        );
        group.userData.partId = p.id;
        r.objects.add(group);
        const pedestal = new THREE.Mesh(
          new THREE.BoxGeometry(3.6, 0.15, 3.9),
          new THREE.MeshStandardMaterial({
            color: '#24312d',
            metalness: 0.1,
            roughness: 0.7,
          }),
        );
        pedestal.position.set(group.position.x, -0.8, group.position.z);
        pedestal.userData.partId = p.id;
        r.objects.add(pedestal);
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 80;
        const cx = c.getContext('2d')!;
        cx.fillStyle = '#bacaab';
        cx.textAlign = 'center';
        cx.font = '25px monospace';
        cx.fillText(p.name, 256, 36, 490);
        cx.fillStyle = '#7f91a6';
        cx.font = '18px monospace';
        cx.fillText(p.package, 256, 65, 490);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(3.2, 0.5),
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
          }),
        );
        plane.position.set(group.position.x, -0.706, group.position.z + 1.5);
        plane.rotation.x = -Math.PI / 2;
        plane.userData.partId = p.id;
        r.objects.add(plane);
      });
      r.distance = Math.max(cols, rows) * 4.15;
      r.controls.maxDistance = 70;
    } else {
      const model = createModel(props.part);
      r.objects.add(model.group);
      r.markers = model.markers;
      const bounds = new THREE.Box3().setFromObject(model.group),
        size = bounds.getSize(new THREE.Vector3()),
        center = bounds.getCenter(new THREE.Vector3());
      model.group.position.sub(new THREE.Vector3(center.x, 0, center.z));
      const maxSize = Math.max(size.x, size.y, size.z);
      const scale = 4.8 / maxSize;
      model.group.scale.setScalar(scale);
      model.group.position.multiplyScalar(scale);
      model.group.traverse((o) => {
        if (o.userData.explode !== undefined) o.userData.explode /= scale;
      });
      r.markers = r.markers.map((m) => ({
        ...m,
        point: m.point
          .clone()
          .sub(new THREE.Vector3(center.x, 0, center.z))
          .multiplyScalar(scale),
        explode: m.explode || 0,
      }));
      r.distance = 8.2 * Math.max(1, 0.9 / r.camera.aspect);
      r.controls.maxDistance = 24;
      r.markers.forEach((m) => {
        const el = document.createElement('div');
        el.className = 'part-hotspot';
        el.textContent = markerText(m.label, props.language);
        host.current!.appendChild(el);
        r.labels.push(el);
      });
    }
    const floor = r.scene.getObjectByName('workbench-floor')!,
      grid = r.scene.getObjectByName('workbench-grid')!;
    const lower = new THREE.Box3().setFromObject(r.objects).min.y;
    floor.position.y = Number.isFinite(lower) ? lower - 0.3 : -1.05;
    grid.position.y = floor.position.y + 0.009;
    r.scene.fog = new THREE.Fog(
      '#11161e',
      props.overview ? 120 : 18,
      props.overview ? 400 : 55,
    );
    r.reset();
  }, [props.part, props.overview, props.parts, props.language]);
  useEffect(() => {
    const r = runtime.current;
    if (!r) return;
    if (props.command.type === 'zoomIn' || props.command.type === 'zoomOut') {
      const offset = r.camera.position
        .clone()
        .sub(r.controls.target)
        .multiplyScalar(props.command.type === 'zoomIn' ? 0.8 : 1.25);
      const length = THREE.MathUtils.clamp(
        offset.length(),
        r.controls.minDistance,
        r.controls.maxDistance,
      );
      offset.setLength(length);
      r.camera.position.copy(r.controls.target).add(offset);
      r.controls.update();
    } else r.reset(props.command.type);
  }, [props.command]);
  return (
    <>
      <div
        ref={host}
        className="three-host"
        tabIndex={0}
        role="application"
        aria-label={text(
          props.language,
          'Interactive 3D model. Drag to rotate, scroll to zoom. Arrow keys rotate, plus/minus zoom, 0 resets.',
          '交互式三维元件模型。鼠标拖动旋转，滚轮缩放；键盘方向键旋转，加减键缩放，0 重置。',
        )}
      />
      {!loaded && !error && (
        <div className="loading-scene">
          <Box size={32} />
          <span>
            {text(
              props.language,
              'Preparing the 3D workbench…',
              '正在准备 3D 实验台…',
            )}
          </span>
        </div>
      )}
      {error && (
        <div
          className="loading-scene"
          style={{ pointerEvents: 'auto', background: '#11161e' }}
        >
          <div className="model-error">
            {text(
              props.language,
              'The 3D view requires WebGL 2. You can read the learning notes while enabling hardware acceleration in your browser settings.',
              '3D 视图需要 WebGL 2 图形支持。可继续阅读元件资料，并尝试在浏览器设置中启用硬件加速。',
            )}
            <br />
            <button onClick={() => window.location.reload()}>
              {text(props.language, 'Reload scene', '重新载入场景')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
