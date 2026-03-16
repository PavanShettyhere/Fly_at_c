import * as THREE from 'three';

export class FlightController {
    constructor(camera, domElement, scene) {
        this.camera = camera;
        this.domElement = domElement;
        this.scene = scene;
        
        // Settings
        this.moveSpeed = 0; // km/s
        this.autoPilotSpeed = 0;
        this.isAutoPilot = false;
        
        this.keys = {
            W: false, A: false, S: false, D: false, 
            Q: false, E: false, 
            Shift: false, Space: false
        };
        
        this.turnSpeed = 1.2; 
        this.baseThrust = 1.0; 
        
        // Momentum Physics
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.angularVelocity = new THREE.Vector3(0, 0, 0);
        this.friction = 0.98; // Damping
        this.thrustForce = 5.0;
        this.rotateForce = 1.5;
        
        // Particle System for Boosters
        this.particles = [];
        this.particleGroup = new THREE.Group();
        this.scene.add(this.particleGroup);
        
        // Ship Avatar Mesh
        this.shipWrapper = new THREE.Group();
        this.scene.add(this.shipWrapper);
        this.currentVehicle = null;
        
        this.buildVehicles();
        this.setVehicle('rocket');
        
        // Bindings
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }
    
    buildVehicles() {
        this.vehicles = {};
        
        // 1. Rocket (Toy Style)
        const rocketGroup = new THREE.Group();
        const toyMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        const accentMat = new THREE.MeshPhysicalMaterial({
            color: 0xff3300,
            metalness: 0.1,
            roughness: 0.2,
            clearcoat: 1.0
        });

        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 3, 16);
        const body = new THREE.Mesh(bodyGeo, toyMat);
        body.rotation.x = Math.PI / 2;
        
        const coneGeo = new THREE.ConeGeometry(0.5, 1, 16);
        const cone = new THREE.Mesh(coneGeo, accentMat);
        cone.position.z = -2;
        cone.rotation.x = -Math.PI / 2;
        
        const finGeo = new THREE.BoxGeometry(0.1, 1, 1);
        const fin1 = new THREE.Mesh(finGeo, coneMat);
        fin1.position.set(0.7, 0, 1);
        const fin2 = new THREE.Mesh(finGeo, coneMat);
        fin2.position.set(-0.7, 0, 1);
        
        rocketGroup.add(body, cone, fin1, fin2);
        rocketGroup.scale.set(0.5, 0.5, 0.5);
        this.vehicles['rocket'] = rocketGroup;
        
        // 2. Duck (Toy Style)
        const duckGroup = new THREE.Group();
        const dMat = new THREE.MeshPhysicalMaterial({
            color: 0xffcc00, 
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05
        });
        
        // Body (Egg shape)
        const dBodyGeo = new THREE.SphereGeometry(1, 24, 24);
        const dBody = new THREE.Mesh(dBodyGeo, dMat);
        dBody.scale.set(1.1, 0.8, 1.4);
        
        // Tail
        const tailGeo = new THREE.ConeGeometry(0.3, 0.6, 8);
        const tail = new THREE.Mesh(tailGeo, dMat);
        tail.position.set(0, 0.3, 1.2);
        tail.rotation.x = -Math.PI / 4;
        
        // Head
        const dHeadGeo = new THREE.SphereGeometry(0.7, 24, 24);
        const dHead = new THREE.Mesh(dHeadGeo, dMat);
        dHead.position.set(0, 0.8, -0.8);
        
        // Beak
        const beakGeo = new THREE.BoxGeometry(0.5, 0.2, 0.6);
        const beakMat = new THREE.MeshStandardMaterial({color: 0xff6600});
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.position.set(0, 0.7, -1.4);
        
        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({color: 0x000000});
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(0.3, 1, -1.2);
        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(-0.3, 1, -1.2);
        
        // Space Suit Helmet
        const helmetGeo = new THREE.SphereGeometry(1.2, 24, 24);
        const helmetMat = new THREE.MeshPhysicalMaterial({
            color: 0x88ccff, 
            transmission: 0.95, 
            opacity: 0.4, 
            transparent: true, 
            roughness: 0,
            metalness: 0.2,
            thickness: 0.5
        });
        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.set(0, 0.8, -0.8);
        
        // Backpack (Jetpack)
        const packGeo = new THREE.BoxGeometry(1.2, 1.2, 0.4);
        const packMat = new THREE.MeshStandardMaterial({color: 0x999999, metalness: 0.8});
        const pack = new THREE.Mesh(packGeo, packMat);
        pack.position.set(0, 0.5, 0.8);
        
        duckGroup.add(dBody, dHead, beak, lEye, rEye, helmet, tail, pack);
        duckGroup.scale.set(0.4, 0.4, 0.4);
        this.vehicles['duck'] = duckGroup;
        
        // 3. Roadster (Toy Style)
        const carGroup = new THREE.Group();
        const paintMat = new THREE.MeshPhysicalMaterial({
            color: 0xee0000, 
            metalness: 0.5, 
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05
        });
        
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 4), paintMat);
        
        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 2), paintMat);
        hood.position.set(0, 0.3, -1);
        
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.5), paintMat);
        spoiler.position.set(0, 0.6, 1.8);
        
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.5), new THREE.MeshStandardMaterial({color: 0x111111}));
        seat.position.set(0.4, 0.4, 0.5);
        
        const windshieldGeo = new THREE.PlaneGeometry(1.8, 0.8);
        const glassMat = new THREE.MeshPhysicalMaterial({
            transmission: 1, opacity: 0.5, transparent: true, color: 0xccffff
        });
        const windshield = new THREE.Mesh(windshieldGeo, glassMat);
        windshield.rotation.x = -Math.PI / 4;
        windshield.position.set(0, 0.7, -0.2);
        
        carGroup.add(chassis, hood, spoiler, seat, windshield);
        carGroup.scale.set(0.4, 0.4, 0.4);
        this.vehicles['roadster'] = carGroup;
    }
    
    setVehicle(type) {
        if(this.currentVehicle) {
            this.shipWrapper.remove(this.currentVehicle);
        }
        if(this.vehicles[type]) {
            this.currentVehicle = this.vehicles[type];
            this.shipWrapper.add(this.currentVehicle);
        }
    }
    
    onKeyDown(event) {
        switch(event.code) {
            case 'KeyW': this.keys.W = true; break;
            case 'KeyS': this.keys.S = true; break;
            case 'KeyA': this.keys.A = true; break;
            case 'KeyD': this.keys.D = true; break;
            case 'KeyQ': this.keys.Q = true; break;
            case 'KeyE': this.keys.E = true; break;
            case 'ShiftLeft': this.keys.Shift = true; break;
            case 'Space': this.keys.Space = true; break;
        }
    }
    
    onKeyUp(event) {
        switch(event.code) {
            case 'KeyW': this.keys.W = false; break;
            case 'KeyS': this.keys.S = false; break;
            case 'KeyA': this.keys.A = false; break;
            case 'KeyD': this.keys.D = false; break;
            case 'KeyQ': this.keys.Q = false; break;
            case 'KeyE': this.keys.E = false; break;
            case 'ShiftLeft': this.keys.Shift = false; break;
            case 'Space': this.keys.Space = false; break;
        }
    }
    
    setAutoPilot(targetPos, speed, delta) {
        // ... (This logic will be handled inside simulation.js to feed vectors here)
    }

    createBoosterParticle() {
        const pGeo = new THREE.SphereGeometry(0.1, 4, 4);
        const pMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.8
        });
        const p = new THREE.Mesh(pGeo, pMat);
        
        // Position at vehicle back
        const offset = new THREE.Vector3(0, -0.5, 1.5).applyQuaternion(this.camera.quaternion);
        p.position.copy(this.camera.position).add(offset);
        
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            2 + Math.random() * 2
        ).applyQuaternion(this.camera.quaternion);
        
        this.particleGroup.add(p);
        this.particles.push({ mesh: p, vel: velocity, life: 1.0 });
    }

    update(delta) {
        // Linear Input -> Forces
        if (this.keys.Shift) {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            this.velocity.add(forward.multiplyScalar(this.thrustForce * delta));
            if (Math.random() > 0.5) this.createBoosterParticle();
        }
        if (this.keys.Space) {
            const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion);
            this.velocity.add(backward.multiplyScalar(this.thrustForce * delta));
        }

        // Angular Input -> Torques
        if (this.keys.W) this.angularVelocity.x += this.rotateForce * delta;
        if (this.keys.S) this.angularVelocity.x -= this.rotateForce * delta;
        if (this.keys.A) this.angularVelocity.y += this.rotateForce * delta;
        if (this.keys.D) this.angularVelocity.y -= this.rotateForce * delta;
        if (this.keys.Q) this.angularVelocity.z += this.rotateForce * delta;
        if (this.keys.E) this.angularVelocity.z -= this.rotateForce * delta;

        // Apply Damping
        this.velocity.multiplyScalar(this.friction);
        this.angularVelocity.multiplyScalar(this.friction);

        // Apply velocities to camera
        this.camera.position.add(this.velocity);
        
        // Rotation is trickier with quaternion
        this.camera.rotateX(this.angularVelocity.x * delta);
        this.camera.rotateY(this.angularVelocity.y * delta);
        this.camera.rotateZ(this.angularVelocity.z * delta);

        // Particles Update
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.add(p.vel.clone().multiplyScalar(delta * 10));
            p.life -= delta * 2;
            p.mesh.scale.setScalar(p.life);
            p.mesh.material.opacity = p.life;
            if (p.life <= 0) {
                this.particleGroup.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
        
        // Position Ship Wrapper exactly in front of the camera
        this.shipWrapper.position.copy(this.camera.position);
        this.shipWrapper.quaternion.copy(this.camera.quaternion);
        this.shipWrapper.translateZ(-3); 
        this.shipWrapper.translateY(-0.8); 
    }
}
