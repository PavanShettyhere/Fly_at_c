import { simulation } from './simulation.js';
import { celestialData } from './astronomy_data.js';

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const destinations = document.querySelectorAll('.dest-item');
    const displayTarget = document.getElementById('t-target');
    const displayDistance = document.getElementById('t-distance');
    const displayETA = document.getElementById('t-eta');
    const displaySuggested = document.getElementById('t-suggested-speed');
    const speedSlider = document.getElementById('speed-slider');
    const speedDisplay = document.getElementById('speed-display');
    
    // Info Panel Elements
    const infoTitle = document.getElementById('info-title');
    const infoDesc = document.getElementById('info-description');
    const exploreBtn = document.getElementById('explore-btn');
    const plantFlagBtn = document.getElementById('plant-flag-btn');
    
    // Settings Elements
    const spaceModeSelect = document.getElementById('space-mode');
    const cockpitToggle = document.getElementById('cockpit-toggle');
    const cameraLockBtn = document.getElementById('camera-lock-btn');
    const readMoreBtn = document.getElementById('read-more-btn');
    const modal = document.getElementById('detail-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    // Visited Logic
    let visited = JSON.parse(localStorage.getItem('galactic_visited') || '[]');
    function updateChecklist() {
        visited.forEach(body => {
            const item = document.querySelector(`.check-item[data-body="${body}"]`);
            if (item) {
                item.classList.add('done');
                item.classList.remove('lock');
            }
        });
    }
    updateChecklist();

    // Target Selection Logic
    destinations.forEach(item => {
        item.addEventListener('click', (e) => {
            // Prevent summary click from double-firing
            const targetEl = e.target.closest('.dest-item') || e.target;
            targetEl.classList.add('active');
            
            const targetName = targetEl.getAttribute('data-target');
            if (!targetName) return;

            simulation.flyTo(targetName);
            displayTarget.textContent = targetName;
            
            // Update Info Panel with Educational Content
            if (celestialData[targetName]) {
                infoTitle.textContent = targetName;
                infoDesc.textContent = celestialData[targetName].description || "Sector analysis complete. No biological anomalies detected.";
            }

            simulation.setTarget(targetName);
        });
    });

    // Start with Earth focused
    simulation.setTarget('Earth');
    displayTarget.textContent = 'Earth';

    // Vehicle Selection
    const vehicleBtns = document.querySelectorAll('.vehicle-btn');
    vehicleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            vehicleBtns.forEach(v => v.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const type = e.currentTarget.getAttribute('data-vehicle');
            simulation.setVehicle(type);
        });
    });

    // Speed Slider Logic
    function updateSpeed() {
        const val = parseFloat(speedSlider.value);
        let displayStr = "";
        let speedKmS = 0;
        
        if (val < 10) {
            const speedKmH = (val / 10) * 50000;
            speedKmS = speedKmH / 3600;
            displayStr = `${Math.floor(speedKmH).toLocaleString()} km/h`;
        } else if (val < 90) {
            speedKmS = 14 + ((val - 10) / 80) * 986;
            displayStr = `${Math.floor(speedKmS).toLocaleString()} km/s`;
        } else {
            let fractionC = (val - 90) / 10;
            if(fractionC === 0) fractionC = 0.01;
            speedKmS = fractionC * 299792;
            displayStr = `${fractionC.toFixed(2)} c`;
        }
        
        speedDisplay.textContent = displayStr;
        simulation.setTravelSpeed(speedKmS);
    }
    
    speedSlider.addEventListener('input', updateSpeed);
    updateSpeed(); // Initialize

    // Telemetry Callback
    simulation.onTelemetryUpdate = (data) => {
        displayDistance.textContent = data.distanceKm > 1000000 
            ? `${(data.distanceKm / 149597870).toFixed(4)} AU` 
            : `${Math.round(data.distanceKm).toLocaleString()} km`;
        
        displayETA.textContent = data.etaText;
        displaySuggested.textContent = data.suggestedSpeed;

        // Show/Hide Explore button based on proximity (within 5000km)
        if (data.distanceKm < 5000 && data.distanceKm > 0.1) {
            exploreBtn.classList.remove('hidden');
        } else {
            exploreBtn.classList.add('hidden');
        }
    };

    // Explore Button Click
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            simulation.enterExplorationMode();
            
            const target = simulation.currentTargetName;
            if (target && !visited.includes(target)) {
                visited.push(target);
                localStorage.setItem('galactic_visited', JSON.stringify(visited));
                updateChecklist();
            }
        });
    }

    // Plant Flag
    plantFlagBtn.addEventListener('click', () => {
        simulation.plantFlag();
        const target = simulation.currentTargetName;
        // The log check-items were moved in the UI consolidation, 
        // they might be in a different section or need a new container
        // For now, let's just mark it in our visited array
        if (target && !visited.includes(target)) {
            visited.push(target);
            localStorage.setItem('galactic_visited', JSON.stringify(visited));
            updateChecklist();
        }
    });

    // Camera Lock
    cameraLockBtn.addEventListener('click', () => {
        const isCurrentlyOff = cameraLockBtn.innerText.includes('OFF');
        simulation.setCameraLock(isCurrentlyOff);
        cameraLockBtn.innerText = `LOCK VIEW: ${isCurrentlyOff ? 'ON' : 'OFF'}`;
    });

    // Read More
    readMoreBtn.addEventListener('click', () => {
        let name = simulation.currentTargetName || "Earth";
        // Normalize name to match celestialData keys (e.g. capitalize)
        name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        
        const data = celestialData[name];
        if (!data) {
            console.warn("No data for target:", name);
            // Fallback check for case sensitivity
            const foundKey = Object.keys(celestialData).find(k => k.toLowerCase() === name.toLowerCase());
            if (foundKey) name = foundKey;
            else return;
        }

        console.log("Opening details for:", name);
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        document.getElementById('modal-title').innerText = name.toUpperCase();
        document.getElementById('modal-description').innerText = data.description || "Sector analysis incoming...";
        
        const statsGrid = document.getElementById('modal-stats-grid');
        statsGrid.innerHTML = '';
        const stats = [
            { label: 'Type', value: data.type || 'Planet' },
            { label: 'Color', value: data.color },
            { label: 'Radius', value: data.radius ? `${data.radius} rel` : 'Unknown' }
        ];

        stats.forEach(s => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `<span class="label">${s.label}</span><span class="value">${s.value}</span>`;
            statsGrid.appendChild(card);
        });

        initModalViewer(name, data);
    });

    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (window.modalReq) cancelAnimationFrame(window.modalReq);
    });

    function initModalViewer(name, data) {
        const container = document.getElementById('object-viewer');
        container.innerHTML = '';
        const w = container.clientWidth, h = container.clientHeight;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 1000);
        camera.position.z = 5;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(w, h);
        container.appendChild(renderer.domElement);
        
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const p = new THREE.PointLight(0xffffff, 1.2); p.position.set(5,5,5); scene.add(p);
        
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(2, 64, 64), new THREE.MeshPhysicalMaterial({ color: data.color, roughness: 0.5, metalness: 0.3 }));
        scene.add(mesh);
        if (data.hasRings) {
            const r = new THREE.Mesh(new THREE.RingGeometry(2.5, 4, 64), new THREE.MeshBasicMaterial({ color: data.color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
            r.rotation.x = Math.PI / 2; mesh.add(r);
        }

        function anim() {
            if (!modal.classList.contains('hidden')) {
                window.modalReq = requestAnimationFrame(anim);
                mesh.rotation.y += 0.01;
                renderer.render(scene, camera);
            }
        }
        anim();
    }

    // Settings Listeners
    spaceModeSelect.addEventListener('change', (e) => {
        simulation.setSpaceMode(e.target.value);
    });

    cockpitToggle.addEventListener('change', (e) => {
        simulation.setCockpitVisible(e.target.checked);
    });
});
