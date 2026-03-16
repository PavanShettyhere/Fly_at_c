import * as THREE from 'three';
import { FlightController } from './FlightController.js';
import { celestialData, AU_MULTIPLIER, TIME_SCALE_DEFAULT } from './astronomy_data.js';

class SolarSystemSimulation {
    constructor(canvasContainerId) {
        this.container = document.getElementById(canvasContainerId);
        
        // Basic Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020204);
        
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 2000000); // Massive far plane
        this.camera.position.set(0, 100, 300);
        
        // Target tracking lerp
        this.cameraLookTarget = new THREE.Vector3(0,0,0);
        this.lerpFactor = 0.05;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true }); // Need log depth for massive scales
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Custom Flight Controller
        this.flightController = new FlightController(this.camera, this.renderer.domElement, this.scene);
        
        this.bodies = {}; // Mesh references
        this.orbitData = {}; // Keeping track of angles and parents
        
        // Navigation Aids
        this.trajectoryLine = null;
        this.initTrajectoryLine();
        
        // Travel Mechanics
        this.travelSpeedKmS = 0;
        this.isTraveling = false;
        this.currentTargetName = null;
        this.onTelemetryUpdate = null; 
        
        // Game Features
        this.flags = [];
        this.showCockpit = true;
        this.spaceMode = 'cinematic'; // Default
        
        this.initLighting();
        this.createStarfield();
        this.createCockpit(); // New
        this.createCelestialBodies();
        this.createAsteroidBelt();
        
        // Window resize binding
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        
        // Start loop
        this.clock = new THREE.Clock();
        this.animate();
    }
    
    initLighting() {
        const ambientLight = new THREE.AmbientLight(0x111111);
        this.scene.add(ambientLight);
        
        // Sun light
        const pointLight = new THREE.PointLight(0xffffff, 2.5, 0, 0); 
        pointLight.position.set(0, 0, 0);
        this.scene.add(pointLight);

        // Sun Glow Halo
        const glowGeo = new THREE.SphereGeometry(25, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffdd00,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const sunGlow = new THREE.Mesh(glowGeo, glowMat);
        this.scene.add(sunGlow);
    }
    
    createStarfield() {
        if (this.stars) this.scene.remove(this.stars);
        if (this.nebulae) this.scene.remove(this.nebulae);

        const starCount = this.spaceMode === 'cinematic' ? 20000 : 5000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        
        for(let i=0; i<starCount; i++) {
            const r = 100000 + Math.random() * 50000;
            const theta = 2 * Math.PI * Math.random();
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i*3+2] = r * Math.cos(phi);
            
            const p = Math.random();
            const color = new THREE.Color();
            if (p > 0.98) color.setHex(0xaaccff);
            else if (p > 0.95) color.setHex(0xffcc88);
            else color.setHex(0xffffff);
            
            colors[i*3] = color.r;
            colors[i*3+1] = color.g;
            colors[i*3+2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: this.spaceMode === 'cinematic' ? 150 : 50,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        
        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);

        // Add Nebula Glows in Cinematic mode
        if (this.spaceMode === 'cinematic') {
            const nGeo = new THREE.SphereGeometry(1, 16, 16);
            this.nebulae = new THREE.Group();
            for(let i=0; i<15; i++) {
                const nMat = new THREE.MeshBasicMaterial({
                    color: new THREE.Color().setHSL(Math.random(), 0.5, 0.2),
                    transparent: true,
                    opacity: 0.05,
                    side: THREE.BackSide
                });
                const n = new THREE.Mesh(nGeo, nMat);
                const r = 120000;
                n.position.set(
                    (Math.random()-0.5)*r,
                    (Math.random()-0.5)*r,
                    (Math.random()-0.5)*r
                );
                n.scale.setScalar(20000 + Math.random()*30000);
                this.nebulae.add(n);
            }
            this.scene.add(this.nebulae);
        }
    }

    createCockpit() {
        this.cockpitGroup = new THREE.Group();
        
        // Frame pieces (HUD-like)
        const frameMat = new THREE.MeshBasicMaterial({ 
            color: 0x00f0ff, 
            transparent: true, 
            opacity: 0.1,
            wireframe: true 
        });
        
        // Horizontal bar
        const barGeo = new THREE.BoxGeometry(2, 0.05, 0.1);
        const bar = new THREE.Mesh(barGeo, frameMat);
        bar.position.set(0, -0.6, -1);
        
        // HUD circle
        const ringGeo = new THREE.RingGeometry(0.3, 0.31, 32);
        const ring = new THREE.Mesh(ringGeo, frameMat);
        ring.position.set(0, 0, -1);
        
        this.cockpitGroup.add(bar, ring);
        this.scene.add(this.cockpitGroup);
    }

    plantFlag() {
        const flagGroup = new THREE.Group();
        const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        
        const clothGeo = new THREE.PlaneGeometry(0.6, 0.4);
        const clothMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
        const cloth = new THREE.Mesh(clothGeo, clothMat);
        cloth.position.set(0.3, 0.3, 0);
        
        flagGroup.add(pole, cloth);
        flagGroup.position.copy(this.camera.position);
        flagGroup.quaternion.copy(this.camera.quaternion);
        
        this.scene.add(flagGroup);
        this.flags.push(flagGroup);
        return true;
    }

    setSpaceMode(mode) {
        this.spaceMode = mode;
        this.createStarfield();
    }

    setCockpitVisible(visible) {
        this.showCockpit = visible;
        this.cockpitGroup.visible = visible;
    }
    
    initTrajectoryLine() {
        const material = new THREE.LineBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.5,
            linewidth: 2
        });
        const points = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.trajectoryLine = new THREE.Line(geometry, material);
        this.scene.add(this.trajectoryLine);
        this.trajectoryLine.visible = false;
    }
    
    createCelestialBodies() {
        const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
        const textureLoader = new THREE.TextureLoader();
        textureLoader.setCrossOrigin('anonymous');
        
        for (const [name, data] of Object.entries(celestialData)) {
            let material;
            
            if (data.texture) {
                const map = textureLoader.load(data.texture);
                if (data.type === 'star') {
                    material = new THREE.MeshBasicMaterial({ map: map });
                } else {
                    const matConfig = { map: map, roughness: 0.6, metalness: 0.1 };
                    if (data.bumpMap) {
                        matConfig.bumpMap = textureLoader.load(data.bumpMap);
                        matConfig.bumpScale = 0.05;
                    }
                    material = new THREE.MeshStandardMaterial(matConfig);
                }
            } else {
                // Fallback to solid color if no texture
                if (data.type === 'star') {
                    material = new THREE.MeshBasicMaterial({ color: data.color });
                } else {
                    material = new THREE.MeshStandardMaterial({ 
                        color: data.color, 
                        roughness: 0.8, 
                        metalness: 0.1 
                    });
                }
            }
            
            const mesh = new THREE.Mesh(sphereGeo, material);
            mesh.scale.set(data.radius, data.radius, data.radius);
            
            // Name it for raycasting later
            mesh.name = name;
            
            this.scene.add(mesh);
            
            this.bodies[name] = mesh;
            
            // Randomize starting angle
            const startAngle = Math.random() * Math.PI * 2;
            
            this.orbitData[name] = {
                ...data,
                currentAngle: startAngle,
                distanceUnits: data.distance * AU_MULTIPLIER
            };
            
            // Draw Orbit Ring for primary planets
            if (data.type === 'planet' && data.distance > 0) {
                const radius = data.distance * AU_MULTIPLIER;
                const pathGeometry = new THREE.RingGeometry(radius - 0.2, radius + 0.2, 256);
                const pathMaterial = new THREE.MeshBasicMaterial({ 
                    color: data.color, 
                    side: THREE.DoubleSide, 
                    transparent: true, 
                    opacity: 0.25,
                    blending: THREE.AdditiveBlending
                });
                const ring = new THREE.Mesh(pathGeometry, pathMaterial);
                ring.rotation.x = Math.PI / 2;
                this.scene.add(ring);
            }
            
            // Rings for Saturn
            if (data.hasRings) {
                const ringGeo = new THREE.RingGeometry(data.ringInner, data.ringOuter, 64);
                const ringMat = new THREE.MeshStandardMaterial({
                    color: data.color,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.6
                });
                const ringMesh = new THREE.Mesh(ringGeo, ringMat);
                ringMesh.rotation.x = Math.PI / 2 + 0.2; // Tilt
                mesh.add(ringMesh); // Attach as child to Saturn
            }
        }
    }
    
    createAsteroidBelt() {
        // Belt between Mars (1.5 AU) and Jupiter (5.2 AU)
        const innerRadius = 2.0 * AU_MULTIPLIER;
        const outerRadius = 3.5 * AU_MULTIPLIER;
        const particleCount = 4000;
        
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            // Random radius between inner and outer
            const r = innerRadius + Math.random() * (outerRadius - innerRadius);
            const theta = Math.random() * Math.PI * 2;
            
            positions[i * 3] = r * Math.cos(theta);
            positions[i * 3 + 1] = (Math.random() - 0.5) * 15; // slight Y variance
            positions[i * 3 + 2] = r * Math.sin(theta);
            
            sizes[i] = Math.random() * 0.5 + 0.1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0x888888,
            size: 0.5,
            transparent: true,
            opacity: 0.6
        });
        
        this.asteroidBelt = new THREE.Points(geometry, material);
        this.scene.add(this.asteroidBelt);
    }
    
    setTarget(bodyName) {
        if(this.bodies[bodyName] && this.currentTargetName !== bodyName) {
            this.currentTargetName = bodyName;
            this.isTraveling = true;
        }
    }
    
    setTravelSpeed(speedKmS) {
        this.travelSpeedKmS = speedKmS;
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    enterExplorationMode() {
        if (!this.currentTargetName || !this.bodies[this.currentTargetName]) return;
        
        const targetBody = this.bodies[this.currentTargetName];
        const data = this.orbitData[this.currentTargetName];
        
        // Transition to low orbit / surface view
        const surfaceAltitude = data.radius + 1.0; 
        const currentPos = new THREE.Vector3();
        targetBody.getWorldPosition(currentPos);
        
        // Offset slightly
        this.camera.position.set(
            currentPos.x,
            currentPos.y + surfaceAltitude,
            currentPos.z + surfaceAltitude
        );
        this.camera.lookAt(currentPos);
        this.isTraveling = false;
        
        // Update Log
        console.log(`Exploration mode engaged for ${this.currentTargetName}`);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = this.clock.getDelta();
        const timeScale = TIME_SCALE_DEFAULT; 
        
        // Dynamic time warp for travel (make it feel fast!)
        const travelWarp = this.isTraveling ? 1000 : 1;
        const effectiveDelta = delta * travelWarp;
        
        // Update positions
        for (const [name, mesh] of Object.entries(this.bodies)) {
            const data = this.orbitData[name];
            
            // Rotation
            mesh.rotation.y += 0.5 * delta; 
            
            // Orbit calculation
            if (data.period > 0) {
                // Angular velocity: 2PI per period
                const angularVel = (Math.PI * 2) / data.period;
                data.currentAngle += angularVel * delta * timeScale;
                
                let cx = 0, cz = 0, cy = 0;
                
                // If orbiting a parent (Moon around Earth)
                if (data.parent && this.bodies[data.parent]) {
                    cx = this.bodies[data.parent].position.x;
                    cz = this.bodies[data.parent].position.z;
                    cy = this.bodies[data.parent].position.y;
                }
                
                mesh.position.x = cx + Math.cos(data.currentAngle) * data.distanceUnits;
                mesh.position.z = cz + Math.sin(data.currentAngle) * data.distanceUnits;
                mesh.position.y = cy; // Keep mostly flat for simple sim
            }
        }
        
        // Rotate asteroid belt slowly
        if(this.asteroidBelt) {
            this.asteroidBelt.rotation.y += 0.05 * delta * timeScale;
        }
        
        // --- Navigation, Telemetry & Flight ---
        let distanceKm = 0;
        let etaText = "N/A";
        let suggestedSpeed = "N/A";
        
        if (this.currentTargetName && this.bodies[this.currentTargetName]) {
            const targetBody = this.bodies[this.currentTargetName];
            
            // Ensure we use the absolute world position for distance calc
            const targetPos = new THREE.Vector3();
            targetBody.getWorldPosition(targetPos);
            
            const distanceUnits = this.camera.position.distanceTo(targetPos);
            
            // 1 AU = 149,597,870 km. 1 AU distance is mapped to AU_MULTIPLIER units.
            distanceKm = (distanceUnits / AU_MULTIPLIER) * 149597870;
            
            // Draw Trajectory
            this.trajectoryLine.visible = true;
            this.trajectoryLine.geometry.setFromPoints([
                this.camera.position,
                targetPos
            ]);
            
            // Calculate Suggested Speed (take 10 seconds to arrive)
            const recSpeed = Math.min(distanceKm / 10, 299792); 
            if(recSpeed >= 299792) suggestedSpeed = `1.00 c (MAX)`;
            else if(recSpeed > 100) suggestedSpeed = `${recSpeed.toFixed(0)} km/s`;
            else suggestedSpeed = `${(recSpeed*3600).toFixed(0)} km/h`;
            
            // Flight Logic and Collision
            const physicalRadiusUnits = this.orbitData[this.currentTargetName].radius;
            const collisionDistance = physicalRadiusUnits + 0.5; // Slightly above surface
            
            if (distanceUnits <= collisionDistance) {
                // Landed!
                this.isTraveling = false;
                etaText = "LANDED - SURFACE EXPLORATION MODE";
                
                // Keep camera locked to surface rotation/position
                const relPos = new THREE.Vector3().subVectors(this.camera.position, targetPos).normalize().multiplyScalar(collisionDistance);
                this.camera.position.copy(targetPos).add(relPos);
            } else if (this.isTraveling) {
                const simUnitsPerSec = this.travelSpeedKmS * (1 / 149597870) * AU_MULTIPLIER;
                const moveDist = simUnitsPerSec * effectiveDelta; // Use warp delta
                
                // If the next step would put us inside the planet, clamp it to the surface
                if (distanceUnits - moveDist <= collisionDistance) {
                    const dir = new THREE.Vector3().subVectors(targetPos, this.camera.position).normalize();
                    const clampDist = distanceUnits - collisionDistance;
                    this.camera.position.add(dir.multiplyScalar(clampDist));
                } else {
                    // Normal travel straight forward (assuming camera is looking at target)
                    this.camera.translateZ(-moveDist);
                }
                
                // ETA Calculation
                if (this.travelSpeedKmS > 0) {
                    const seconds = distanceKm / this.travelSpeedKmS;
                    if(seconds > 31536000) etaText = `${(seconds/31536000).toFixed(1)} years`;
                    else if(seconds > 86400) etaText = `${(seconds/86400).toFixed(1)} days`;
                    else if(seconds > 3600) etaText = `${(seconds/3600).toFixed(1)} hours`;
                    else if(seconds > 60) etaText = `${(seconds/60).toFixed(1)} mins`;
                    else etaText = `${seconds.toFixed(0)} secs`;
                }
            } else {
                etaText = "Holding Position / Manual Flight";
            }
            
            // Auto-steer towards target if traveling AND not manually steering
            const isManuallySteering = this.flightController.keys.W || this.flightController.keys.A || 
                                       this.flightController.keys.S || this.flightController.keys.D ||
                                       this.flightController.keys.Q || this.flightController.keys.E;
            
            if(this.isTraveling && !isManuallySteering) {
                // Smoothly look at target
                const targetQuaternion = new THREE.Quaternion();
                const dummy = new THREE.Object3D();
                dummy.position.copy(this.camera.position);
                dummy.lookAt(targetPos);
                targetQuaternion.copy(dummy.quaternion);
                this.camera.quaternion.slerp(targetQuaternion, this.lerpFactor);
            }
        } else {
            this.trajectoryLine.visible = false;
        }
        
        // Manual Flight Controller Update
        // Apply manual thrust or brake (even if traveling, let user boost)
        if (this.flightController.keys.Shift) {
            this.camera.translateZ(-this.travelSpeedKmS * (1 / 149597870) * AU_MULTIPLIER * delta);
        }
        if (this.flightController.keys.Space) {
            this.camera.translateZ(this.travelSpeedKmS * (1 / 149597870) * AU_MULTIPLIER * delta);
        }
        
        this.flightController.update(delta);
        
        // Report Telemetry
        if(this.onTelemetryUpdate) {
            this.onTelemetryUpdate({
                distanceKm: distanceKm,
                speedKmS: this.travelSpeedKmS,
                etaText: etaText,
                suggestedSpeed: suggestedSpeed
            });
        }
        
        // Update Cockpit position
        if (this.showCockpit) {
            this.cockpitGroup.position.copy(this.camera.position);
            this.cockpitGroup.quaternion.copy(this.camera.quaternion);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Export single instance
export const simulation = new SolarSystemSimulation('canvas-container');
