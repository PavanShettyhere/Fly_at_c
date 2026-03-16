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
        
        this.turnSpeed = 2.0; // Increased
        this.baseThrust = 100; // Multiplier for manual movement speed
        
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
        
        // 1. Rocket
        const rocketGroup = new THREE.Group();
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 3, 16);
        const bodyMat = new THREE.MeshStandardMaterial({color: 0xdddddd});
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        
        const coneGeo = new THREE.ConeGeometry(0.5, 1, 16);
        const coneMat = new THREE.MeshStandardMaterial({color: 0xff3300});
        const cone = new THREE.Mesh(coneGeo, coneMat);
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
        
        // 2. Duck (More detailed)
        const duckGroup = new THREE.Group();
        const dMat = new THREE.MeshStandardMaterial({color: 0xffcc00, roughness: 0.3});
        
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
        
        duckGroup.add(dBody, dHead, beak, lEye, rEye, helmet, tail);
        duckGroup.scale.set(0.4, 0.4, 0.4);
        this.vehicles['duck'] = duckGroup;
        
        // 3. Roadster (More detailed sports car look)
        const carGroup = new THREE.Group();
        const paintMat = new THREE.MeshStandardMaterial({
            color: 0x770000, 
            metalness: 0.9, 
            roughness: 0.1
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

    update(delta) {
        // Manual steering
        if (this.keys.W) this.camera.rotateX(this.turnSpeed * delta);
        if (this.keys.S) this.camera.rotateX(-this.turnSpeed * delta);
        if (this.keys.A) this.camera.rotateY(this.turnSpeed * delta);
        if (this.keys.D) this.camera.rotateY(-this.turnSpeed * delta);
        if (this.keys.Q) this.camera.rotateZ(this.turnSpeed * delta);
        if (this.keys.E) this.camera.rotateZ(-this.turnSpeed * delta);
        
        // Position Ship Wrapper exactly in front of the camera, looking the same way
        this.shipWrapper.position.copy(this.camera.position);
        this.shipWrapper.quaternion.copy(this.camera.quaternion);
        this.shipWrapper.translateZ(-3); // Put it 3 units in front
        this.shipWrapper.translateY(-0.8); // Slightly below center
    }
}
