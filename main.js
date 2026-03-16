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

    // Target Selection Logic
    destinations.forEach(item => {
        item.addEventListener('click', (e) => {
            // Prevent summary click from double-firing
            if (e.target.tagName !== 'SUMMARY' && e.target.tagName !== 'DIV' && !e.target.classList.contains('dest-item')) return;
            
            destinations.forEach(d => d.classList.remove('active'));
            const targetEl = e.target.closest('.dest-item') || e.target;
            targetEl.classList.add('active');
            
            const targetName = targetEl.getAttribute('data-target');
            if (!targetName) return;

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
    exploreBtn.addEventListener('click', () => {
        simulation.enterExplorationMode();
    });
});
