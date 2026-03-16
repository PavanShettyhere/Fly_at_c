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
        this.labels = {}; // New labels storage
        this.createCelestialBodies();
        this.createAsteroidBelt();
        this.initTrajectoryLine();
        
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
        if (this.warpStars) this.scene.remove(this.warpStars);

        const starCount = this.spaceMode === 'cinematic' ? 20000 : 5000;
        // ... standard stars block ...
        // (rest of star creation logic remains essentially same)

        // Warp Stars setup (lines)
        const warpCount = 400;
        const warpGeo = new THREE.BufferGeometry();
        const warpPos = new Float32Array(warpCount * 6); // 2 points per line
        for(let i=0; i<warpCount; i++) {
            const x = (Math.random()-0.5) * 1000;
            const y = (Math.random()-0.5) * 1000;
            const z = -Math.random() * 2000;
            warpPos[i*6] = x; warpPos[i*6+1] = y; warpPos[i*6+2] = z;
            warpPos[i*6+3] = x; warpPos[i*6+4] = y; warpPos[i*6+5] = z - 50; 
        }
        warpGeo.setAttribute('position', new THREE.BufferAttribute(warpPos, 3));
        const warpMat = new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0 });
        this.warpStars = new THREE.LineSegments(warpGeo, warpMat);
        this.scene.add(this.warpStars);

        // Standard stars logic (truncated for brevity here, should be kept intact)
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
                n.position.set( (Math.random()-0.5)*r, (Math.random()-0.5)*r, (Math.random()-0.5)*r );
                n.scale.setScalar(20000 + Math.random()*30000);
                this.nebulae.add(n);
            }
            this.scene.add(this.nebulae);
        }
    }

    createCockpit() {
        this.cockpitGroup = new THREE.Group();
        
        // Load High-Fi Frame Texture
        const loader = new THREE.TextureLoader();
        const frameTex = loader.load('./cyberpunk_cockpit_frame_1773674726703.png');
        
        // Main Dashboard Plane (Covers the view)
        const frameGeo = new THREE.PlaneGeometry(8, 4); // Wide aspect
        const frameMat = new THREE.MeshBasicMaterial({ 
            map: frameTex,
            transparent: true,
            opacity: 0.95
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 0, -1.5); // Sits just in front of camera
        this.cockpitGroup.add(frame);
        
        // Screens (Canvas Textures) - Placed over the CRT areas of the texture
        this.cockpitScreens = [];
        const createScreen = (w, h, x, y, z, rx, ry) => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 256;
            const tex = new THREE.CanvasTexture(canvas);
            const screenMat = new THREE.MeshBasicMaterial({ 
                map: tex, 
                transparent: true,
                opacity: 0.8
            });
            const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
            screen.position.set(x, y, z);
            screen.rotation.set(rx, ry, 0);
            this.cockpitGroup.add(screen);
            this.cockpitScreens.push({ canvas, ctx: canvas.getContext('2d'), tex });
        };

        // Align screens with the side panels of the texture
        createScreen(1.2, 0.6, -2.5, -0.8, -1.45, 0, 0.2); // Left Screen
        createScreen(1.2, 0.6, 2.5, -0.8, -1.45, 0, -0.2); // Right Screen
        createScreen(1.0, 0.4, 0, -1.4, -1.45, -0.2, 0);   // Bottom/Center Screen

        this.scene.add(this.cockpitGroup);
        this.cockpitVisibleY = 0;
        this.cockpitHiddenY = -10; // Hide deep
        this.cockpitGroup.position.y = this.showCockpit ? this.cockpitVisibleY : this.cockpitHiddenY;
    }

    updateCockpitScreens(telemetry) {
        if (!this.cockpitScreens.length) return;

        // 1. Center Screen: Target & Speed
        const s1 = this.cockpitScreens[0];
        s1.ctx.fillStyle = '#0a0a14';
        s1.ctx.fillRect(0, 0, 256, 128);
        s1.ctx.strokeStyle = '#00f0ff';
        s1.ctx.lineWidth = 4;
        s1.ctx.strokeRect(5, 5, 246, 118);
        
        s1.ctx.fillStyle = '#00f0ff';
        s1.ctx.font = 'bold 30px Orbitron'; // Fallback to sans-serif if not loaded
        s1.ctx.textAlign = 'center';
        s1.ctx.fillText(telemetry.target?.toUpperCase() || 'NO TARGET', 128, 45);
        s1.ctx.font = '20px Orbitron';
        s1.ctx.fillText(`${Math.round(telemetry.speedKmS * 3600).toLocaleString()} KM/H`, 128, 85);
        s1.tex.needsUpdate = true;

        // 2. Left Screen: Distance/ETA
        const s2 = this.cockpitScreens[1];
        s2.ctx.fillStyle = '#0a0a14';
        s2.ctx.fillRect(0, 0, 256, 128);
        s2.ctx.fillStyle = '#00f0ff';
        s2.ctx.font = '20px Orbitron';
        s2.ctx.fillText(`DIST:`, 20, 40);
        s2.ctx.fillText(`${telemetry.distanceKm > 1000000 ? (telemetry.distanceKm/149597870).toFixed(4) + ' AU' : Math.round(telemetry.distanceKm).toLocaleString() + ' KM'}`, 20, 70);
        s2.ctx.fillText(`ETA: ${telemetry.etaText}`, 20, 100);
        s2.tex.needsUpdate = true;
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
        // The visibility is now handled by animation in the update loop
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

            // Create Name Tag for major bodies
            if (data.type === 'star' || data.type === 'planet' || name === 'Moon') {
                this.createNameTag(name, data.color);
            }
        }
    }

    createNameTag(name, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add subtle glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fillText(name.toUpperCase(), 256, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            depthTest: false,
            sizeAttenuation: true
        });
        
        const sprite = new THREE.Sprite(material);
        this.scene.add(sprite);
        this.labels[name] = sprite;
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

    setVehicle(type) {
        this.flightController.setVehicle(type);
    }

    enterExplorationMode() {
        // Wrapper for flag planting and vicinity simulation
        this.plantFlag();
    }

    setCameraLock(locked) {
        this.flightController.cameraLocked = locked;
    }

    showObjectDetails(name) {
        const data = this.orbitData[name] || this.astronomyData[name];
        if (!data) return;
        
        // Dispatch custom event for main.js to show the modal
        const event = new CustomEvent('showObjectDetails', { detail: { name, data } });
        window.dispatchEvent(event);
    }
    
    initTrajectoryLine() {
        this.pathPoints = [];
        const geo = new THREE.BufferGeometry();
        const mat = new THREE.LineBasicMaterial({ 
            color: 0x00f0ff, 
            transparent: true, 
            opacity: 0.4,
            blending: THREE.AdditiveBlending 
        });
        this.trajectoryLine = new THREE.Line(geo, mat);
        this.scene.add(this.trajectoryLine);
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
        
        // Update Cockpit position & Animation
        const targetY = this.showCockpit ? this.cockpitVisibleY : this.cockpitHiddenY;
        this.cockpitGroup.position.y = THREE.MathUtils.lerp(this.cockpitGroup.position.y, targetY, 0.1);
        
        this.cockpitGroup.position.copy(this.camera.position);
        this.cockpitGroup.quaternion.copy(this.camera.quaternion);
        this.cockpitGroup.translateY(this.cockpitGroup.position.y); // Apply relative animation Y

        if (this.onTelemetryUpdate && this.showCockpit) {
            // This is slightly complex because telemetry is calculated later in the frame
            // We'll update the screens in the next frame or use a stored state
            if (this._lastTelemetry) this.updateCockpitScreens(this._lastTelemetry);
        }

        // Update Labels (Name Tags)
        const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        for (const [name, sprite] of Object.entries(this.labels)) {
            const bodyPos = new THREE.Vector3();
            this.bodies[name].getWorldPosition(bodyPos);
            
            // Offset label slightly above the planet
            const bounce = Math.sin(Date.now() * 0.002) * 0.2;
            sprite.position.copy(bodyPos).add(new THREE.Vector3(0, this.orbitData[name].radius * 1.5 + bounce, 0));
            
            // Adjusted scale based on distance - more subtle
            const dist = this.camera.position.distanceTo(bodyPos);
            const scaleFactor = Math.log10(dist + 1) * 2; // Logarithmic growth to prevent massive tags
            const baseScale = 0.5 + scaleFactor * 0.1;
            sprite.scale.set(baseScale, baseScale * 0.25, 1);
            
            // Fade out if not looking towards it or too close
            const toBody = bodyPos.clone().sub(this.camera.position).normalize();
            const lookWeight = cameraForward.dot(toBody);
            
            // Tighter threshold for "looking towards"
            const threshold = 0.94; 
            let opacity = 0.15; // Dimmer default
            if (lookWeight > threshold) {
                opacity = 0.15 + (lookWeight - threshold) / (1 - threshold) * 0.7;
            }
            
            // Hide if on top of it
            if (dist < this.orbitData[name].radius * 5) {
                opacity *= (dist - this.orbitData[name].radius) / (this.orbitData[name].radius * 4);
            }
            
            sprite.material.opacity = THREE.MathUtils.clamp(opacity, 0, 0.7);
        }

        // --- Warp Speed Effect (Star Streaks) ---
        if (this.warpStars) {
            const relSpeed = this.travelSpeedKmS / 299792; // Fraction of light speed
            const isWarp = relSpeed > 0.02; // Trigger earlier
            this.warpStars.visible = isWarp;
            if (isWarp) {
                const intensity = THREE.MathUtils.clamp((relSpeed - 0.02) * 10, 0, 1.5); // Steeper curve
                this.warpStars.material.opacity = intensity * 0.8;
                this.warpStars.position.copy(this.camera.position);
                this.warpStars.quaternion.copy(this.camera.quaternion);
                // Stretch based on intensity
                this.warpStars.scale.z = 1 + intensity * 50; // Much longer streaks
                this.warpStars.scale.x = 1 + intensity * 2; 
                this.warpStars.scale.y = 1 + intensity * 2;
            }
        }

        // Update Trajectory
        this.pathPoints.push(this.camera.position.clone());
        if (this.pathPoints.length > 500) this.pathPoints.shift();
        this.trajectoryLine.geometry.setFromPoints(this.pathPoints);

        // Store telemetry for cockpit screens
        this._lastTelemetry = {
            target: this.currentTargetName,
            distanceKm: distanceKm,
            speedKmS: this.travelSpeedKmS,
            etaText: etaText
        };

        this.renderer.render(this.scene, this.camera);
    }
}

// Export single instance
export const simulation = new SolarSystemSimulation('canvas-container');
