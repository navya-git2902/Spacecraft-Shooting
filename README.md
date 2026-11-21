# Spacecraft Shooting

A playable **3D isometric space-shooter arena** powered by **Three.js** and **procedural Web Audio synthesis**, featuring a stylized cosmic backdrop, smart AI pilots, combo multipliers, and persistent hangar upgrades.

## Key Features

- **3D Isometric Space Arena:** Purple/blue/pink/cyan galaxy backdrop with exponential depth fog, instanced starfield, ringed pastel planet with an orbiting moon, rotating orbital space station with solar wings, isometric arena grid & energy perimeter rings, and faceted crystal asteroids for cover.
- **Composite Procedural Spacecraft:** Three playable hull classes (**StarPuff-01**, **Nebula-X**, **Aegis-V**) built from beveled extruded fuselages, swept wings, clearcoat canopies, animated dual thruster plumes, wingtip laser emitters, and active shield bubbles.
- **Arena Modes & Smart AI Pilots:** Play **Duo Duel (1v1)**, **Squad Battle (2v2)**, **Fleet Clash (3v3)**, or **Solo Blitz (1v3)** with AI squadmates and rivals that strafe, avoid asteroids, lead shots, and grab power-ups.
- **Weapons, Abilities & Power-Ups:**
  - **Move:** `WASD` or `Arrow Keys`
  - **Aim & Fire Laser:** Mouse cursor + `Space` or `Left-Click`
  - **Homing Plasma Missile:** `E` or `Right-Click`
  - **Hyper Dash:** `Shift`
  - **Power-Up Orbs:** Health Boost (`+35 HP`), Rapid Fire, Double Shot, and Shield Bubble
- **Combos, HUD & Hangar Upgrades:** Consecutive hits build combo streaks (`3x`, `5x MEGA COMBO!`, `8x UNSTOPPABLE!`) with floating damage numbers, overhead HP bars, a live mini-radar, a collapsible weapon dock (`H`), and persistent **Starlight Credit** upgrades (**Hull Plating**, **Laser Overclock**, **Ion Thrusters**, **Plasma Bay**).
- **Procedural Web Audio Synth:** Real-time synthesized sound effects (lasers, homing plasma missiles, shield deflections, explosions, power-ups, dash) plus a toggleable ambient synth arpeggiator soundtrack.

## Verification

- `npm run build` (`vite build`) — passed with zero errors
- `npx tsc --noEmit` — passed with zero errors
