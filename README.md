# Roblox Math Lab

Interactive 3D lessons on the maths Roblox developers use every day. Each topic has a 3D preview
with sliders, live Luau code, real game uses and common mistakes.

## Subjects

| Subject | Topics |
| --- | --- |
| Vector3 basics | Vector3.new, subtraction, scaling and flattening, Magnitude, Unit, Lerp, move toward, bounding boxes, averages, velocity and gravity, Fibonacci sphere |
| Vector maths | Dot, Cross, projection, signed angles, rotating vectors, closest point on a line, which side of a plane, building axes, reflection, leading targets, steering, rotation between vectors |
| CFrame | What a CFrame is, Angles, lookAt, local vs world offsets, multiplication order, ToObjectSpace, Lerp, pivots, shoulder camera, weld C0/C1, local velocity, reading angles back, slerp vs angle lerp |
| math library | sin/cos, atan2, clamp, grid snapping, noise, smoothing, easing curves, wrapping with %, remapping ranges, springs, level curves, angle wrapping |
| Bézier curves | Quadratic, cubic, moving along a curve at even speed, throw and homing arcs, Catmull-Rom, chaining curves, closest point, offsetting into roads, rotation-minimising frames |
| Probability | Weighted loot tables, chance over many tries, dice sums, gaussian spread, shuffle bags, expected value, random spawns, rising-chance crits, events per second, Monte Carlo |
| Raycasting | workspace:Raycast, RaycastParams filters, line of sight, mouse picking, placing on slopes, wall-banging, Spherecast, ricochets, area queries, hover vehicles, fast-bullet tunnelling |
| Bitwise operations | Binary, flags, AND/OR/XOR/NOT, shifts, packing, free-slot search, autotiling, layer masks, negative numbers, Morton codes |
| Trigonometry | Unit circle, radians, SOH CAH TOA, slopes, sine waves, polar spirals, Lissajous paths, 2D rotation, heights from angles |
| Animation & timing | Durations, ping-pong loops, TweenInfo, sequences, staggering, keyframes, squash and stretch, idle motion, counters |
| Colors | RGB, Color3:Lerp, HSV, rainbows, gradients, readable text, hex, flashes, distinct team colours |
| Grids & tiles | Grid coordinates, neighbours, distances, 1D storage, flood fill, Bresenham lines, rotating pieces, hex grids, chunks |
| UI & screen maths | UDim2, AnchorPoint, aspect ratios, world-to-screen, off-screen arrows, health bars, radial cooldowns, layouts, dragging |
| Numbers & formatting | Rounding, 1.2K abbreviations, timers, percentages, floating point, huge numbers, commas, stacks, averages |
| Geometry & intersections (advanced) | Ray vs sphere, ray vs plane, point in polygon, segment crossings |
| Kinematics & IK (advanced) | Law of cosines, two-bone IK, FABRIK chains |
| Physics simulation (advanced) | Euler vs Verlet integrators, bounces with friction, collisions and momentum, Verlet ropes |
| Procedural generation (advanced) | fBm, ridges and terraces, domain warping, Voronoi, Poisson discs, cave automata, random walks, islands, L-systems |
| Graphs & pathfinding (advanced) | BFS, Dijkstra, A*, heuristics, flow fields, path smoothing, waypoint graphs, following paths |
| Matrices & transforms (advanced) | CFrame matrices, matrix × vector, forward kinematics, inverses, drift, basis changes, scaling, mirroring |
| Calculus for games (advanced) | Derivatives, velocity from samples, integrals, Newton, bisection, gradient descent, arc length, smooth joins |
| Spatial partitioning (advanced) | Brute force vs spatial hash, quadtrees, octrees, nearest neighbour, sweep and prune, level of detail |
| Signals & networking (advanced) | Moving averages, exponential smoothing, dead zones, camera shake, aliasing, interpolation, prediction, hysteresis, rate limiting |

## Layout

```
index.html              page shell (home, subject and cheat sheet views)
assets/style.css        all styles, light and dark themes
assets/lab.js           3D engine (three.js), drawing kit, topic registry
assets/kit2.js          shared helpers: graphs, instanced cubes, label pools, heap
assets/topics/*.js      one file per subject; each topic is a Lab demo
assets/studio.js        one ready-to-run Roblox Studio script per subject
assets/reference.js     "I want to…" finder and cheat sheet tables
assets/app.js           routing and lesson UI
```

Every subject page also has a "Try it in Studio" panel: a complete Script or LocalScript that builds its own parts, so it runs when pasted into an empty Baseplate.

Each topic has its own link, for example `#vec-dot` or `#rc-filter`. A subject link such as `#raycast` opens its first topic.

Run it locally with any static server, for example `python -m http.server`, then open http://localhost:8000.
