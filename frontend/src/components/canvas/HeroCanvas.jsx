import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * 3D Interactive Hero Canvas built with Three.js.
 * Features an animated icosahedron wireframe lattice with floating particles.
 * Optimized for 60fps performance and responsive window resizing.
 */
export const HeroCanvas = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Geometry & Mesh (Icosahedron Lattice)
    const geometry = new THREE.IcosahedronGeometry(1.6, 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      wireframe: true,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.25,
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // 3. Floating particle cloud
    const particlesCount = 200;
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 8;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.035,
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x60a5fa, 2, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // 5. Interactive mouse parallax
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    // 6. Animation loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth rotation
      sphere.rotation.x += 0.002;
      sphere.rotation.y += 0.003;
      particles.rotation.y -= 0.001;

      // Parallax damping
      sphere.rotation.x += (mouseY * 0.3 - sphere.rotation.x) * 0.05;
      sphere.rotation.y += (mouseX * 0.3 - sphere.rotation.y) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full min-h-[380px] flex items-center justify-center relative pointer-events-auto"
      aria-label="Interactive 3D Graphic"
    />
  );
};
