import { simulation } from './simulation.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // Target Selection Logic
    const destinations = document.querySelectorAll('.dest-item');
    const displayTarget = document.getElementById('t-target');
    
    destinations.forEach(item => {
        item.addEventListener('click', (e) => {
            // Prevent summary click from double-firing or messing up active state
            if (e.target.tagName !== 'SUMMARY' && e.target.tagName !== 'DIV') return;
            
            destinations.forEach(d => d.classList.remove('active'));
            e.target.classList.add('active');
            
            const targetName = e.target.getAttribute('data-target');
            displayTarget.textContent = targetName;
            simulation.setTarget(targetName);
        });
    });
            
    // Start with Earth focused
    simulation.setTarget('Earth');
    displayTarget.textContent = 'Earth';

    // Telemetry Callback
    simulation.onTelemetryUpdate = (data) => {
        document.getElementById('t-distance').textContent = `${data.distanceKm.toLocaleString(undefined, {maximumFractionDigits: 0})} km`;
        document.getElementById('t-velocity').textContent = `${data.speedKmS.toLocaleString(undefined, {maximumFractionDigits: 2})} km/s`;
        document.getElementById('t-eta').textContent = data.etaText;
        document.getElementById('t-suggested-speed').textContent = data.suggestedSpeed;
    };
    
    // Vehicle Selection Logic
    const vehicles = document.querySelectorAll('.vehicle-btn');
    vehicles.forEach(btn => {
        btn.addEventListener('click', (e) => {
            vehicles.forEach(v => v.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const vehicleType = e.currentTarget.getAttribute('data-vehicle');
            if (simulation.flightController) {
                simulation.flightController.setVehicle(vehicleType);
            }
        });
    });
    
    // Speed Slider Logic
    const speedSlider = document.getElementById('speed-slider');
    const speedDisplay = document.getElementById('speed-display');
    
    function updateSpeed() {
        const val = parseFloat(speedSlider.value);
        let displayStr = "";
        let speedKmS = 0;
        
        if (val < 10) {
            // Orbital speeds: 0 to 50,000 km/h -> 0 to 13.88 km/s
            const speedKmH = (val / 10) * 50000;
            speedKmS = speedKmH / 3600;
            displayStr = `${Math.floor(speedKmH).toLocaleString()} km/h`;
        } else if (val < 90) {
            // Interplanetary speeds: 14 km/s to 1,000 km/s (logarithmic scale feels better visually, but linear is fine)
            speedKmS = 14 + ((val - 10) / 80) * 986;
            displayStr = `${Math.floor(speedKmS).toLocaleString()} km/s`;
        } else {
            // Relativistic speeds: 0.01c to 1.0c (c = 299,792.458 km/s)
            let fractionC = (val - 90) / 10;
            if(fractionC === 0) fractionC = 0.01;
            speedKmS = fractionC * 299792;
            displayStr = `${fractionC.toFixed(2)} c`;
        }
        
        speedDisplay.textContent = displayStr;
        simulation.setTravelSpeed(speedKmS);
    }
    
    speedSlider.addEventListener('input', updateSpeed);
    
    // Initialize speed
    updateSpeed();
    
});
