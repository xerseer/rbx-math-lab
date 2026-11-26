# Roblox Math Lab

Interactive 3D lessons on the maths Roblox developers use every day. Each topic has a 3D preview
with sliders, live Luau code, real game uses and common mistakes.

## Subjects

| Subject | Topics |
| --- | --- |
| Vector3 basics | Vector3.new, subtraction, scaling and flattening, Magnitude, Unit, Lerp, move toward, bounding boxes, averages, velocity and gravity |
| Vector maths | Dot, Cross, projection, signed angles, rotating vectors, closest point on a line, which side of a plane, building axes, reflection, leading targets, steering |
| CFrame | What a CFrame is, Angles, lookAt, local vs world offsets, multiplication order, ToObjectSpace, Lerp, pivots, shoulder camera, weld C0/C1, local velocity, reading angles back |
| math library | sin/cos, atan2, clamp, grid snapping, noise, smoothing, easing curves, wrapping with %, remapping ranges, springs, level curves |
| Bézier curves | Quadratic, cubic, moving along a curve at even speed, throw and homing arcs, Catmull-Rom, chaining curves, closest point, offsetting into roads |
| Probability | Weighted loot tables, chance over many tries, dice sums, gaussian spread, shuffle bags, expected value, random spawns, rising-chance crits, events per second |
| Raycasting | workspace:Raycast, RaycastParams filters, line of sight, mouse picking, placing on slopes, wall-banging, Spherecast, ricochets, area queries, hover vehicles |
| Bitwise operations | Binary, flags, AND/OR/XOR/NOT, shifts, packing, free-slot search, autotiling, layer masks, negative numbers |

## Layout

```
index.html              page shell (home, subject and cheat sheet views)
assets/style.css        all styles, light and dark themes
assets/lab.js           3D engine (three.js), drawing kit, topic registry
assets/topics/*.js      one file per subject; each topic is a Lab demo
assets/reference.js     "I want to…" finder and cheat sheet tables
assets/app.js           routing and lesson UI
```

Each topic has its own link, for example `#vec-dot` or `#rc-filter`. A subject link such as `#raycast` opens its first topic.

Run it locally with any static server, for example `python -m http.server`, then open http://localhost:8000.
