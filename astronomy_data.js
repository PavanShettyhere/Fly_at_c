// astronomy_data.js
// Simplistic data representation for the solar system simulation.
// Distances are conceptually Astronomical Units (AU), scaled for visualization.
// Sizes are conceptually relative to Earth radii, scaled for visibility.

export const AU_MULTIPLIER = 200; // 1 AU = 200 WebGL units (increased scale for realism)
export const TIME_SCALE_DEFAULT = 1; // 1 second real time = 1 day sim time

// Reliable CDNs for textures
const BASE_TEX = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/';

export const celestialData = {
    Sun: {
        radius: 20,
        distance: 0,
        period: 0,
        color: 0xffdd00,
        emissive: 0xffaa00,
        type: 'star',
        texture: BASE_TEX + 'sun.jpg'
    },
    Mercury: {
        radius: 0.38,
        distance: 0.39,
        period: 88,
        color: 0x888888,
        type: 'planet',
        texture: BASE_TEX + 'mercury.jpg'
    },
    Venus: {
        radius: 0.95,
        distance: 0.72,
        period: 225,
        color: 0xe3bb76,
        type: 'planet',
        texture: BASE_TEX + 'venus.jpg'
    },
    Earth: {
        radius: 1,
        distance: 1.0,
        period: 365.25,
        color: 0x00aaff,
        type: 'planet',
        texture: BASE_TEX + 'earth_atmos_2048.jpg',
        bumpMap: BASE_TEX + 'earth_normal_2048.jpg'
    },
    Moon: { 
        radius: 0.27,
        distance: 0.03, 
        period: 27.3,
        color: 0xcccccc,
        type: 'moon',
        parent: 'Earth',
        texture: BASE_TEX + 'moon_1024.jpg'
    },
    ISS: {
        radius: 0.05,
        distance: 0.005,
        period: 0.063,
        color: 0xffffff,
        type: 'station',
        parent: 'Earth'
    },
    Mars: {
        radius: 0.53,
        distance: 1.52,
        period: 687,
        color: 0xff5500,
        type: 'planet',
        texture: BASE_TEX + 'mars_1k_color.jpg'
    },
    Phobos: { radius: 0.02, distance: 0.01, period: 0.3, color: 0xaaaaaa, type: 'moon', parent: 'Mars' },
    Deimos: { radius: 0.01, distance: 0.025, period: 1.2, color: 0x999999, type: 'moon', parent: 'Mars' },
    
    Jupiter: {
        radius: 11,
        distance: 5.20,
        period: 4333,
        color: 0xd39c7e,
        type: 'planet',
        texture: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/jupiter.jpg'
    },
    Io: { radius: 0.28, distance: 0.5, period: 1.76, color: 0xffff00, type: 'moon', parent: 'Jupiter' },
    Europa: { radius: 0.24, distance: 0.8, period: 3.55, color: 0xffffff, type: 'moon', parent: 'Jupiter' },
    Ganymede: { radius: 0.41, distance: 1.2, period: 7.15, color: 0xaaaaaa, type: 'moon', parent: 'Jupiter' },
    Callisto: { radius: 0.37, distance: 1.8, period: 16.68, color: 0x888888, type: 'moon', parent: 'Jupiter' },
    
    Saturn: {
        radius: 9.5,
        distance: 9.58,
        period: 10759,
        color: 0xc5ab6e,
        hasRings: true,
        ringInner: 12,
        ringOuter: 20,
        type: 'planet',
        texture: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/saturn.jpg'
    },
    Titan: { radius: 0.4, distance: 1.5, period: 15.9, color: 0xffa500, type: 'moon', parent: 'Saturn' },
    Enceladus: { radius: 0.04, distance: 0.8, period: 1.37, color: 0xffffff, type: 'moon', parent: 'Saturn' },
    
    Uranus: {
        radius: 4,
        distance: 19.22,
        period: 30687,
        color: 0x66ccff,
        type: 'planet'
    },
    Neptune: {
        radius: 3.8,
        distance: 30.05,
        period: 60190,
        color: 0x3366ff,
        type: 'planet'
    }
};
