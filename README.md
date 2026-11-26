# Roblox Math Lab

Interactive 3D lessons on the maths Roblox developers use every day. Each topic has a 3D preview
with sliders, live Luau code, real game uses and common mistakes.

## Subjects

| Subject | Topics |
| --- | --- |
| Vector3 basics | Vector3.new, subtraction, Magnitude, Unit, Lerp |
| Vector maths | Dot, Cross, projection, signed angles, rotating vectors, closest point on a line, reflection |
| CFrame | What a CFrame is, Angles, lookAt, local vs world offsets, multiplication order, ToObjectSpace, Lerp |
| math library | sin/cos, atan2, clamp, grid snapping, noise, frame-rate independent smoothing |
| Bézier curves | Quadratic, cubic, moving along a curve at even speed, throw and homing arcs |
| Probability | Weighted loot tables, chance over many tries, dice sums, gaussian spread, random spawns |
| Raycasting | workspace:Raycast, RaycastParams filters, placing on slopes, wall-banging, Spherecast, ricochets |
| Bitwise operations | Binary, flags, AND/OR/XOR/NOT, shifts, packing with extract/replace |

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
