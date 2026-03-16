// astronomy_data.js
// Simplistic data representation for the solar system simulation.
// Distances are conceptually Astronomical Units (AU), scaled for visualization.
// Sizes are conceptually relative to Earth radii, scaled for visibility.

export const AU_MULTIPLIER = 200; // 1 AU = 200 WebGL units (increased scale for realism)
export const TIME_SCALE_DEFAULT = 1; // 1 second real time = 1 day sim time

// Reliable base URL for textures from a stable Three.js revision
const BASE_TEX = 'https://raw.githubusercontent.com/mrdoob/three.js/r129/examples/textures/planets/';

export const celestialData = {
    Sun: {
        radius: 20,
        distance: 0,
        period: 0,
        color: 0xffdd00,
        emissive: 0xffaa00,
        type: 'star',
        texture: BASE_TEX + 'sun.jpg',
        description: "The Sun is the star at the center of the Solar System. It is a nearly perfect sphere of hot plasma, heated to incandescence by nuclear fusion reactions in its core."
    },
    Mercury: {
        radius: 0.38,
        distance: 0.39,
        period: 88,
        color: 0x888888,
        type: 'planet',
        texture: BASE_TEX + 'mercurymap.jpg',
        description: "Mercury is the smallest planet in the Solar System and the closest to the Sun. It has no moons and a very thin atmosphere."
    },
    Venus: {
        radius: 0.95,
        distance: 0.72,
        period: 225,
        color: 0xe3bb76,
        type: 'planet',
        texture: BASE_TEX + 'venusmap.jpg',
        description: "Venus is the second planet from the Sun. It is the hottest planet in our solar system, with a thick, toxic atmosphere filled with sulfuric acid clouds."
    },
    Earth: {
        radius: 1,
        distance: 1.0,
        period: 365.25,
        color: 0x00aaff,
        type: 'planet',
        texture: BASE_TEX + 'earth_atmos_2048.jpg',
        bumpMap: BASE_TEX + 'earth_normal_2048.jpg',
        description: "Earth is our home planet and the only world known to harbor life. It is the third planet from the Sun and the largest of the terrestrial planets."
    },
    Moon: { 
        radius: 0.27,
        distance: 0.03, 
        period: 27.3,
        color: 0xcccccc,
        type: 'moon',
        parent: 'Earth',
        texture: BASE_TEX + 'moon_1024.jpg',
        description: "The Moon is Earth's only natural satellite. It is the fifth largest moon in the Solar System and is tidal locked to Earth."
    },
    ISS: {
        radius: 0.05,
        distance: 0.005,
        period: 0.063,
        color: 0xffffff,
        type: 'station',
        parent: 'Earth',
        description: "The International Space Station (ISS) is a modular space station in low Earth orbit. it serves as a microgravity and space environment research laboratory."
    },
    Mars: {
        radius: 0.53,
        distance: 1.52,
        period: 687,
        color: 0xff5500,
        type: 'planet',
        texture: BASE_TEX + 'marsmap1k.jpg',
        description: "Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System. It is often called the 'Red Planet' due to its reddish appearance."
    },
    Phobos: { radius: 0.02, distance: 0.01, period: 0.3, color: 0xaaaaaa, type: 'moon', parent: 'Mars', description: "Phobos is the larger and closer of the two natural satellites of Mars." },
    Deimos: { radius: 0.01, distance: 0.025, period: 1.2, color: 0x999999, type: 'moon', parent: 'Mars', description: "Deimos is the smaller and outermost of the two natural satellites of Mars." },
    
    Jupiter: {
        radius: 11,
        distance: 5.20,
        period: 4333,
        color: 0xd39c7e,
        type: 'planet',
        texture: BASE_TEX + 'jupitermap.jpg',
        description: "Jupiter is the fifth planet from the Sun and the largest in the Solar System. It is a gas giant with a mass more than two and a half times that of all the other planets combined."
    },
    Io: { radius: 0.28, distance: 0.5, period: 1.76, color: 0xffff00, type: 'moon', parent: 'Jupiter', description: "Io is the innermost of the four Galilean moons of Jupiter. It is the most geologically active object in the Solar System." },
    Europa: { radius: 0.24, distance: 0.8, period: 3.55, color: 0xffffff, type: 'moon', parent: 'Jupiter', description: "Europa is the smallest of the four Galilean moons of Jupiter. It is thought to have a liquid water ocean beneath its icy surface." },
    Ganymede: { radius: 0.41, distance: 1.2, period: 7.15, color: 0xaaaaaa, type: 'moon', parent: 'Jupiter', description: "Ganymede is the largest and most massive moon of Jupiter and in the Solar System. It is the only moon known to have its own magnetic field." },
    Callisto: { radius: 0.37, distance: 1.8, period: 16.68, color: 0x888888, type: 'moon', parent: 'Jupiter', description: "Callisto is the second-largest moon of Jupiter and the third-largest moon in the Solar System." },
    
    Saturn: {
        radius: 9.5,
        distance: 9.58,
        period: 10759,
        color: 0xc5ab6e,
        hasRings: true,
        ringInner: 12,
        ringOuter: 20,
        type: 'planet',
        texture: BASE_TEX + 'saturnmap.jpg',
        description: "Saturn is the sixth planet from the Sun and the second-largest in the Solar System. It is a gas giant famous for its large and bright ring system."
    },
    Titan: { radius: 0.4, distance: 1.5, period: 15.9, color: 0xffa500, type: 'moon', parent: 'Saturn', description: "Titan is the largest moon of Saturn and the second-largest natural satellite in the Solar System. It is the only moon known to have a dense atmosphere." },
    Enceladus: { radius: 0.04, distance: 0.8, period: 1.37, color: 0xffffff, type: 'moon', parent: 'Saturn', description: "Enceladus is the sixth-largest moon of Saturn. It is known for its active geysers that spray water ice into space." },
    
    Uranus: {
        radius: 4,
        distance: 19.22,
        period: 30687,
        color: 0x66ccff,
        type: 'planet',
        texture: BASE_TEX + 'uranusmap.jpg',
        description: "Uranus is the seventh planet from the Sun. It has the third-largest planetary radius and fourth-largest planetary mass in the Solar System."
    },
    Neptune: {
        radius: 3.8,
        distance: 30.05,
        period: 60190,
        color: 0x3366ff,
        type: 'planet',
        texture: BASE_TEX + 'neptunemap.jpg',
        description: "Neptune is the eighth and farthest known solar planet from the Sun. It is the fourth-largest planet by diameter and the third-most-massive planet."
    }
};
