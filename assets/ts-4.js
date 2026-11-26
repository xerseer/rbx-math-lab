(function(){
"use strict";
const NOISEGRID = `local SIZE, CELL = 32, 2
local folder = Instance.new("Folder")
folder.Parent = demo
local function heightColor(h)
	if h < 0.32 then return Color3.fromRGB(47, 111, 214) elseif h < 0.37 then return Color3.fromRGB(228, 209, 154)
	elseif h < 0.62 then return Color3.fromRGB(95, 174, 79) elseif h < 0.8 then return Color3.fromRGB(130, 130, 130) end
	return Color3.fromRGB(242, 242, 242)
end
local function buildTerrain(heightAt)                     -- heightAt(x, z) returns 0..1
	for x = 1, SIZE do
		for z = 1, SIZE do
			local h = math.clamp(heightAt(x, z), 0, 1)
			local y = math.max(0.4, h * 20)
			makePart(Vector3.new(CELL, y, CELL), ORIGIN + Vector3.new((x - SIZE / 2) * CELL, y / 2, (z - SIZE / 2) * CELL), heightColor(h), { Parent = folder })
		end
		task.wait()
	end
end
local function fbm(x, z, octaves, seed)
	local amplitude, frequency, total, norm = 1, 1, 0, 0
	for i = 1, octaves do
		total += amplitude * math.noise(x * frequency, z * frequency, seed + i * 17.3)
		norm += amplitude
		amplitude *= 0.5
		frequency *= 2
	end
	return total / norm
end
`;
const MAZE = `local W, H, CELL = 18, 14, 3
local walls = {}
local function key(x, z) return x * 1000 + z end
local function cellPos(x, z) return ORIGIN + Vector3.new((x - W / 2) * CELL, 0, (z - H / 2) * CELL) end
local rng = Random.new(7)
for x = 1, W do
	for z = 1, H do
		makePart(Vector3.new(CELL - 0.2, 0.2, CELL - 0.2), cellPos(x, z) + Vector3.new(0, 0.1, 0), Color3.fromRGB(200, 200, 205))
		if rng:NextNumber() < 0.22 and not (x <= 2 and z <= 2) and not (x >= W - 1 and z >= H - 1) then
			walls[key(x, z)] = true
			makePart(Vector3.new(CELL, 3, CELL), cellPos(x, z) + Vector3.new(0, 1.5, 0), Color3.fromRGB(50, 50, 60))
		end
	end
end
local function open(x, z) return x >= 1 and x <= W and z >= 1 and z <= H and not walls[key(x, z)] end
local function neighbours(x, z)
	local list = {}
	for _, d in { {1,0}, {-1,0}, {0,1}, {0,-1} } do
		if open(x + d[1], z + d[2]) then table.insert(list, { x + d[1], z + d[2] }) end
	end
	return list
end
local function showPath(path, color)
	for _, c in path do
		makePart(Vector3.new(1, 0.4, 1), cellPos(c[1], c[2]) + Vector3.new(0, 0.4, 0), color or Color3.fromRGB(226, 133, 26), { CanCollide = false })
	end
end
`;
const SCATTER = `local rng = Random.new()
local function scatter(n, area)
	local parts = {}
	for i = 1, n do
		parts[i] = makePart(Vector3.new(0.8, 0.8, 0.8), ORIGIN + Vector3.new(rng:NextNumber(-area, area), 1, rng:NextNumber(-area, area)),
			Color3.fromRGB(120, 120, 130), { Shape = Enum.PartType.Ball, CanCollide = false })
	end
	return parts
end
`;
Lab.ts({
/* ===== Geometry ===== */
'geo-raysphere':['S','A bubble shield made of pure maths: a scanner\'s ray is tested against the sphere with the quadratic formula (no part needed for the hit test).',`
local center, radius = ORIGIN + Vector3.new(0, 5, -6), 5
makePart(Vector3.new(radius * 2, radius * 2, radius * 2), center, Color3.fromRGB(90, 160, 255),
	{ Shape = Enum.PartType.Ball, Transparency = 0.75, CanCollide = false, CanQuery = false, Material = Enum.Material.ForceField })
local scanner = makePart(Vector3.new(1, 1, 2), ORIGIN + Vector3.new(0, 5, 14), Color3.fromRGB(60, 60, 70))
local beam = makeBeam(Color3.fromRGB(255, 60, 60))
local hitDot = makePart(Vector3.new(0.8, 0.8, 0.8), center, Color3.fromRGB(250, 200, 40), { Shape = Enum.PartType.Ball, CanCollide = false, CanQuery = false })
local function raySphere(origin, dir, c, r)
	local oc = origin - c
	local b = oc:Dot(dir)
	local disc = b * b - (oc:Dot(oc) - r * r)
	if disc < 0 then return nil end
	local t = -b - math.sqrt(disc)
	return t > 0 and t or nil
end
RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local dir = (Vector3.new(math.sin(t) * 9, math.cos(t * 0.7) * 5, -20)).Unit
	local hit = raySphere(scanner.Position, dir, center, radius)
	local endPoint = scanner.Position + dir * (hit or 40)
	drawLine(beam, scanner.Position, endPoint)
	hitDot.Transparency = hit and 0 or 1
	hitDot.Position = endPoint
end)`],

'geo-rayplane':['L','Move your mouse: a ray from the camera is intersected with an invisible floor 6 studs up (ray vs plane), and a block follows that spot.',`
local UserInputService = game:GetService("UserInputService")
local PLANE_POINT, NORMAL = Vector3.new(0, 6, 0), Vector3.yAxis
local block = makePart(Vector3.new(2, 2, 2), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false, CanQuery = false, Transparency = 0.3 })
local function rayPlane(origin, dir, point, normal)
	local denom = dir:Dot(normal)
	if math.abs(denom) < 1e-6 then return nil end
	local t = (point - origin):Dot(normal) / denom
	if t < 0 then return nil end
	return origin + dir * t
end
RunService.RenderStepped:Connect(function()
	local mouse = UserInputService:GetMouseLocation()
	local ray = camera:ViewportPointToRay(mouse.X, mouse.Y)
	local hit = rayPlane(ray.Origin, ray.Direction, PLANE_POINT, NORMAL)
	block.Transparency = hit and 0.3 or 1
	if hit then block.Position = Vector3.new(math.round(hit.X / 2) * 2, hit.Y + 1, math.round(hit.Z / 2) * 2) end
end)`],

'geo-polygon':['S','An irregular zone marked by neon edges. They turn green while any player stands inside (even-odd crossing test).',`
local ZONE = { Vector2.new(-14, -10), Vector2.new(-2, -12), Vector2.new(4, -4), Vector2.new(14, -10), Vector2.new(12, 8), Vector2.new(0, 2), Vector2.new(-10, 10) }
local edges = {}
for i, a in ZONE do
	local b = ZONE[i % #ZONE + 1]
	local edge = makeBeam(Color3.fromRGB(230, 80, 80))
	drawLine(edge, ORIGIN + Vector3.new(a.X, 0.3, a.Y), ORIGIN + Vector3.new(b.X, 0.3, b.Y))
	edges[i] = edge
end
local function isInside(p, polygon)
	local inside, j = false, #polygon
	for i = 1, #polygon do
		local a, b = polygon[i], polygon[j]
		if (a.Y > p.Y) ~= (b.Y > p.Y) and p.X < a.X + (p.Y - a.Y) * (b.X - a.X) / (b.Y - a.Y) then inside = not inside end
		j = i
	end
	return inside
end
RunService.Heartbeat:Connect(function()
	local anyone = false
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local rel = root.Position - ORIGIN
			anyone = anyone or isInside(Vector2.new(rel.X, rel.Z), ZONE)
		end
	end
	for _, e in edges do e.Color = anyone and Color3.fromRGB(60, 220, 100) or Color3.fromRGB(230, 80, 80) end
end)`],

'geo-segments':['S','A laser fence between two posts. If a player\'s movement between two frames crosses it (2D segment intersection), the fence flashes and prints who crossed.',`
local P, Q = Vector2.new(-12, -4), Vector2.new(12, 4)
makePart(Vector3.new(1, 5, 1), ORIGIN + Vector3.new(P.X, 2.5, P.Y), Color3.fromRGB(60, 60, 70))
makePart(Vector3.new(1, 5, 1), ORIGIN + Vector3.new(Q.X, 2.5, Q.Y), Color3.fromRGB(60, 60, 70))
local laser = makeBeam(Color3.fromRGB(255, 60, 60))
drawLine(laser, ORIGIN + Vector3.new(P.X, 3, P.Y), ORIGIN + Vector3.new(Q.X, 3, Q.Y))
local function cross2(a, b) return a.X * b.Y - a.Y * b.X end
local function segmentsCross(p, r, q, s)
	local denom = cross2(r, s)
	if math.abs(denom) < 1e-9 then return false end
	local t, u = cross2(q - p, s) / denom, cross2(q - p, r) / denom
	return t >= 0 and t <= 1 and u >= 0 and u <= 1
end
local last = {}
RunService.Heartbeat:Connect(function()
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local now = Vector2.new(root.Position.X - ORIGIN.X, root.Position.Z - ORIGIN.Z)
			if last[player] and segmentsCross(P, Q - P, last[player], now - last[player]) then
				print(player.Name .. " crossed the laser!")
				laser.Color = Color3.fromRGB(255, 255, 255)
				task.delay(0.2, function() laser.Color = Color3.fromRGB(255, 60, 60) end)
			end
			last[player] = now
		end
	end
end)`],

/* ===== Kinematics & IK ===== */
'ik-cosines':['S','Three posts form a triangle that changes shape; the angle at each corner is worked out from the three side lengths (law of cosines).',`
local A = makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(217, 54, 62), { Shape = Enum.PartType.Ball })
local B = makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(46, 158, 82), { Shape = Enum.PartType.Ball })
local Cp = makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(47, 111, 214), { Shape = Enum.PartType.Ball })
local ab, bc, ca = makeBeam(), makeBeam(), makeBeam()
local la, lb, lc = makeLabel(A), makeLabel(B), makeLabel(Cp)
local function angleOpposite(opposite, s1, s2) return math.acos(math.clamp((s1 ^ 2 + s2 ^ 2 - opposite ^ 2) / (2 * s1 * s2), -1, 1)) end
RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local pa, pb = ORIGIN + Vector3.new(-8, 2, 0), ORIGIN + Vector3.new(8, 2, 0)
	local pc = ORIGIN + Vector3.new(math.sin(t * 0.5) * 6, 2 + 6 + math.sin(t) * 3, 0)
	A.Position, B.Position, Cp.Position = pa, pb, pc
	drawLine(ab, pa, pb) drawLine(bc, pb, pc) drawLine(ca, pc, pa)
	local a, b, c = (pb - pc).Magnitude, (pa - pc).Magnitude, (pa - pb).Magnitude
	la.Text = string.format("A %.0f", math.deg(angleOpposite(a, b, c)))
	lb.Text = string.format("B %.0f", math.deg(angleOpposite(b, a, c)))
	lc.Text = string.format("C %.0f", math.deg(angleOpposite(c, a, b)))
end)`],

'ik-twobone':['S','A two-bone arm on a pedestal reaches toward the nearest player (or an orbiting point), with the elbow bending upward toward a pole.',`
local L1, L2 = 6, 5
local SHOULDER = ORIGIN + Vector3.new(0, 8, 0)
makePart(Vector3.new(3, 8, 3), SHOULDER - Vector3.new(0, 4, 0), Color3.fromRGB(80, 80, 90))
local upper = makePart(Vector3.new(0.8, 0.8, L1), SHOULDER, Color3.fromRGB(70, 130, 240), { CanCollide = false })
local lower = makePart(Vector3.new(0.7, 0.7, L2), SHOULDER, Color3.fromRGB(230, 100, 160), { CanCollide = false })
local function solve(shoulder, target, pole)
	local toTarget = target - shoulder
	local d = math.clamp(toTarget.Magnitude, math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01)
	local dir = toTarget.Unit
	local a = math.acos(math.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1))
	local toPole = pole - shoulder
	local bend = toPole - dir * toPole:Dot(dir)
	bend = bend.Magnitude > 1e-3 and bend.Unit or Vector3.yAxis
	return shoulder + dir * (math.cos(a) * L1) + bend * (math.sin(a) * L1), shoulder + dir * d
end
RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local root = nearestRoot(SHOULDER, 25)
	local target = root and root.Position or SHOULDER + Vector3.new(math.cos(t) * 7, math.sin(t * 1.3) * 3, math.sin(t) * 7)
	local elbow, hand = solve(SHOULDER, target, SHOULDER + Vector3.new(0, 10, 0))
	upper.CFrame = CFrame.lookAt((SHOULDER + elbow) / 2, elbow)
	lower.CFrame = CFrame.lookAt((elbow + hand) / 2, hand)
end)`],

'ik-fabrik':['S','A 10-segment tentacle reaches for the nearest player (or a wandering point) using FABRIK: drag the tip to the target, then drag the base back, a few times per frame.',`
local N, LENGTH, PASSES = 10, 1.3, 3
local BASE = ORIGIN + Vector3.new(0, 0.5, 0)
local points, segments = {}, {}
for i = 0, N do points[i] = BASE + Vector3.new(0, i * LENGTH, 0) end
for i = 1, N do segments[i] = makePart(Vector3.new(0.8 - i * 0.05, 0.8 - i * 0.05, LENGTH), BASE, Color3.fromHSV(0.8 + i * 0.01, 0.6, 0.9), { CanCollide = false }) end
RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local root = nearestRoot(BASE, 20)
	local target = root and root.Position or BASE + Vector3.new(math.sin(t * 0.7) * 8, 6 + math.sin(t * 1.3) * 3, math.cos(t * 0.7) * 6)
	for _ = 1, PASSES do
		points[N] = target
		for i = N - 1, 0, -1 do points[i] = points[i + 1] + (points[i] - points[i + 1]).Unit * LENGTH end
		points[0] = BASE
		for i = 0, N - 1 do points[i + 1] = points[i] + (points[i + 1] - points[i]).Unit * LENGTH end
	end
	for i = 1, N do segments[i].CFrame = CFrame.lookAt((points[i - 1] + points[i]) / 2, points[i]) end
end)`],

/* ===== Physics ===== */
'ph-integrators':['S','Three balls orbit a sun with the same start but different update rules. Explicit Euler spirals outward; semi-implicit Euler and Verlet stay on orbit.',`
local GM, DT = 400, 1 / 20                         -- a big time step makes the difference obvious
local SUN = ORIGIN + Vector3.new(0, 8, 0)
makePart(Vector3.new(3, 3, 3), SUN, Color3.fromRGB(255, 200, 60), { Shape = Enum.PartType.Ball, Material = Enum.Material.Neon })
local function accel(p) local d = SUN - p return d * (GM / d.Magnitude ^ 3) end
local kinds = { "explicit Euler", "semi-implicit Euler", "velocity Verlet" }
local bodies = {}
local function reset()
	for i, name in kinds do
		local p0, v0 = SUN + Vector3.new(10, 0, 0), Vector3.new(0, 0, -math.sqrt(GM / 10))
		if not bodies[i] then
			bodies[i] = { part = makePart(Vector3.new(1, 1, 1), p0, Color3.fromHSV(i / 4, 0.7, 1), { Shape = Enum.PartType.Ball, CanCollide = false }) }
			makeLabel(bodies[i].part, name)
		end
		bodies[i].p, bodies[i].v = p0, v0
	end
end
reset()
local acc, t = 0, 0
RunService.Heartbeat:Connect(function(dt)
	acc += dt
	while acc >= DT do
		acc -= DT
		t += DT
		local e, s, v = bodies[1], bodies[2], bodies[3]
		local a = accel(e.p); e.p += e.v * DT; e.v += a * DT                               -- explicit
		s.v += accel(s.p) * DT; s.p += s.v * DT                                           -- semi-implicit
		local a1 = accel(v.p); v.p += v.v * DT + a1 * (0.5 * DT * DT); v.v += (a1 + accel(v.p)) * (0.5 * DT)   -- Verlet
		if t > 25 or (e.p - SUN).Magnitude > 40 then reset(); t = 0 end
	end
	for _, b in bodies do b.part.Position = b.p end
end)`],

'ph-bounce':['S','Balls drop onto a tilted ramp and bounce with your own physics: split velocity along the normal, flip it × restitution, reduce the sliding part with friction.',`
local RESTITUTION, FRICTION, G = 0.7, 0.2, Vector3.new(0, -60, 0)
local tilt = math.rad(20)
local normal = Vector3.new(math.sin(tilt), math.cos(tilt), 0)
local planePoint = ORIGIN + Vector3.new(0, 2, 0)
local ramp = makePart(Vector3.new(30, 0.6, 8), planePoint, Color3.fromRGB(90, 90, 100))
ramp.CFrame = CFrame.new(planePoint - normal * 0.3) * CFrame.Angles(0, 0, -tilt)
while true do
	local ball = makePart(Vector3.new(1.6, 1.6, 1.6), ORIGIN + Vector3.new(-8, 16, math.random(-2, 2)), Color3.fromHSV(math.random(), 0.7, 1),
		{ Shape = Enum.PartType.Ball, CanCollide = false })
	task.spawn(function()
		local pos, vel = ball.Position, Vector3.new(3, 0, 0)
		local start = os.clock()
		while os.clock() - start < 6 do
			local dt = RunService.Heartbeat:Wait()
			vel += G * dt
			pos += vel * dt
			local d = (pos - planePoint):Dot(normal) - 0.8
			if d < 0 then
				pos -= normal * d
				local vn = vel:Dot(normal)
				if vn < 0 then
					local vN = normal * vn
					local vT = vel - vN
					local slide = vT.Magnitude
					if slide > 0 then vT *= math.max(0, 1 - FRICTION * (1 + RESTITUTION) * math.abs(vn) / slide) end
					vel = vT - vN * RESTITUTION
				end
			end
			ball.Position = pos
		end
		ball:Destroy()
	end)
	task.wait(1.5)
end`],

'ph-collide':['S','A light ball hits a heavy one. The impulse along the line between them changes each velocity by its mass, and momentum is kept.',`
local E = 0.9
local function newBall(mass, pos, vel, color)
	local r = 0.8 * mass ^ (1 / 3)
	return { m = mass, r = r, p = pos, v = vel, part = makePart(Vector3.new(r * 2, r * 2, r * 2), pos, color, { Shape = Enum.PartType.Ball, CanCollide = false }) }
end
while true do
	local a = newBall(1, ORIGIN + Vector3.new(-14, 1, 0.6), Vector3.new(10, 0, 0), Color3.fromRGB(18, 147, 154))
	local b = newBall(4, ORIGIN + Vector3.new(0, 1.6, 0), Vector3.zero, Color3.fromRGB(194, 65, 142))
	local label = makeLabel(b.part)
	local start = os.clock()
	while os.clock() - start < 4 do
		local dt = RunService.Heartbeat:Wait()
		a.p += a.v * dt
		b.p += b.v * dt
		local offset = (b.p - a.p) * Vector3.new(1, 0, 1)
		local dist = offset.Magnitude
		if dist < a.r + b.r and dist > 0 then
			local n = offset / dist
			local approaching = (a.v - b.v):Dot(n)
			if approaching > 0 then
				local j = (1 + E) * approaching / (1 / a.m + 1 / b.m)
				a.v -= n * (j / a.m)
				b.v += n * (j / b.m)
			end
		end
		a.part.Position, b.part.Position = a.p, b.p
		local momentum = a.v * a.m + b.v * b.m
		label.Text = string.format("momentum (%.1f, %.1f)", momentum.X, momentum.Z)
	end
	a.part:Destroy()
	b.part:Destroy()
end`],

'ph-rope':['S','A rope bridge between two posts simulated with Verlet points and distance constraints; it sags and sways in the wind.',`
local N, PASSES = 20, 10
local A, B = ORIGIN + Vector3.new(-12, 10, 0), ORIGIN + Vector3.new(12, 10, 0)
makePart(Vector3.new(1, 10, 1), A - Vector3.new(0, 5, 0), Color3.fromRGB(80, 60, 40))
makePart(Vector3.new(1, 10, 1), B - Vector3.new(0, 5, 0), Color3.fromRGB(80, 60, 40))
local SEG = (B - A).Magnitude * 1.15 / N
local points, prev, planks = {}, {}, {}
for i = 0, N do points[i] = A:Lerp(B, i / N); prev[i] = points[i] end
for i = 1, N do planks[i] = makePart(Vector3.new(2.5, 0.3, SEG), A, Color3.fromRGB(150, 110, 70), { CanCollide = false }) end
local STEP, acc = 1 / 60, 0
RunService.Heartbeat:Connect(function(dt)
	acc += math.min(dt, 0.1)
	while acc >= STEP do
		acc -= STEP
		local t = os.clock()
		local wind = Vector3.new(0, 0, math.sin(t * 0.8) * 15)
		for i = 1, N - 1 do
			local v = (points[i] - prev[i]) * 0.99
			prev[i] = points[i]
			points[i] += v + (Vector3.new(0, -60, 0) + wind) * STEP * STEP
		end
		for _ = 1, PASSES do
			points[0], points[N] = A, B
			for i = 0, N - 1 do
				local delta = points[i + 1] - points[i]
				local fix = delta * ((delta.Magnitude - SEG) / math.max(delta.Magnitude, 1e-4)) * 0.5
				if i > 0 then points[i] += fix end
				if i + 1 < N then points[i + 1] -= fix end
			end
		end
	end
	for i = 1, N do planks[i].CFrame = CFrame.lookAt((points[i - 1] + points[i]) / 2, points[i]) end
end)`],

/* ===== Procedural generation ===== */
'pg-fbm':['S','Generates terrain from 5 octaves of layered noise (fBm) and colours it by height.',NOISEGRID+`
buildTerrain(function(x, z) return 0.5 + 1.2 * fbm(x * 0.06 + 0.31, z * 0.06 + 0.47, 5, 4) end)`],
'pg-ridged':['S','Generates ridged mountains (1 − |noise|, squared) cut into flat terraces.',NOISEGRID+`
local STEPS = 6
buildTerrain(function(x, z)
	local total, amplitude, frequency, norm = 0, 1, 1, 0
	for i = 1, 4 do
		local n = math.clamp(math.noise(x * 0.06 * frequency + 0.3, z * 0.06 * frequency + 0.7, 5 + i * 11) * 1.6, -1, 1)
		total += amplitude * (1 - math.abs(n)) ^ 2
		norm += amplitude
		amplitude *= 0.5
		frequency *= 2
	end
	return math.floor(total / norm * STEPS) / STEPS          -- terraces
end)`],
'pg-warp':['S','Generates swirly, eroded-looking terrain by nudging each sample point with another noise first (domain warping).',NOISEGRID+`
local K = 2.5
buildTerrain(function(x, z)
	local wx = math.noise(x * 0.05 + 0.1, z * 0.05 + 0.2, 1) * K
	local wz = math.noise(x * 0.05 + 0.5, z * 0.05 + 0.9, 2) * K
	return 0.5 + 1.2 * fbm(x * 0.06 + wx + 0.31, z * 0.06 + wz + 0.47, 4, 2)
end)`],
'pg-voronoi':['S','A 40 × 40 floor split into 12 Voronoi regions: each tile takes the colour of its nearest seed.',`
local rng = Random.new(8)
local SIZE, CELL = 40, 1
local seeds = {}
for i = 1, 12 do seeds[i] = { pos = Vector2.new(rng:NextNumber(0, SIZE), rng:NextNumber(0, SIZE)), color = Color3.fromHSV(i * 0.618 % 1, 0.55, 0.9) } end
for x = 1, SIZE do
	for z = 1, SIZE do
		local p = Vector2.new(x, z)
		local best, d1, d2 = seeds[1], math.huge, math.huge
		for _, s in seeds do
			local d = (p - s.pos).Magnitude
			if d < d1 then d2, d1, best = d1, d, s elseif d < d2 then d2 = d end
		end
		makePart(Vector3.new(CELL, 0.4, CELL), ORIGIN + Vector3.new(x - SIZE / 2, 0.2, z - SIZE / 2),
			d2 - d1 < 1 and Color3.fromRGB(40, 40, 45) or best.color)       -- dark tiles on the borders
	end
	task.wait()
end`],
'pg-poisson':['S','Plants up to 150 trees that are never closer than 4 studs to each other (Poisson disc by rejection).',`
local R, TARGET = 4, 150
local rng = Random.new()
local trees = {}
for _ = 1, TARGET * 40 do
	if #trees >= TARGET then break end
	local c = Vector2.new(rng:NextNumber(-30, 30), rng:NextNumber(-30, 30))
	local ok = true
	for _, t in trees do if (t - c).Magnitude < R then ok = false break end end
	if ok then
		table.insert(trees, c)
		makePart(Vector3.new(0.8, 3, 0.8), ORIGIN + Vector3.new(c.X, 1.5, c.Y), Color3.fromRGB(110, 80, 50))
		makePart(Vector3.new(3, 3, 3), ORIGIN + Vector3.new(c.X, 4, c.Y), Color3.fromRGB(60, 150, 70), { Shape = Enum.PartType.Ball })
	end
end
print(#trees, "trees placed")`],
'pg-caves':['S','Generates a cave map: random walls, then 4 smoothing passes where a cell becomes wall if 5+ neighbours are walls.',`
local W, H, FILL = 48, 36, 0.46
local rng = Random.new()
local grid = {}
for x = 1, W do grid[x] = {} for z = 1, H do grid[x][z] = x == 1 or z == 1 or x == W or z == H or rng:NextNumber() < FILL end end
for _ = 1, 4 do
	local nextGrid = {}
	for x = 1, W do
		nextGrid[x] = {}
		for z = 1, H do
			local walls = 0
			for dx = -1, 1 do for dz = -1, 1 do
				if (dx ~= 0 or dz ~= 0) and (not grid[x + dx] or grid[x + dx][z + dz] ~= false) then walls += 1 end
			end end
			nextGrid[x][z] = walls >= 5 or (walls >= 4 and grid[x][z])
		end
	end
	grid = nextGrid
end
for x = 1, W do
	for z = 1, H do
		if grid[x][z] then makePart(Vector3.new(1, 4, 1), ORIGIN + Vector3.new(x - W / 2, 2, z - H / 2), Color3.fromRGB(90, 85, 80)) end
	end
	task.wait()
end`],
'pg-walk':['S','Carves a cave with a random walk: 1500 random steps from the centre, building a floor tile wherever the digger has been.',`
local STEPS = 1500
local rng = Random.new()
local visited = {}
local x, z = 0, 0
local DIRS = { {1,0}, {-1,0}, {0,1}, {0,-1} }
for _ = 1, STEPS do
	local key = x .. "," .. z
	if not visited[key] then
		visited[key] = true
		makePart(Vector3.new(1, 0.4, 1), ORIGIN + Vector3.new(x, 0.2, z), Color3.fromRGB(226, 133, 26))
	end
	local d = DIRS[rng:NextInteger(1, 4)]
	x = math.clamp(x + d[1], -25, 25)
	z = math.clamp(z + d[2], -25, 25)
end`],
'pg-island':['S','Generates an island: layered noise multiplied by a round falloff mask, so the land always ends in a beach.',NOISEGRID+`
buildTerrain(function(x, z)
	local nx, nz = (x - SIZE / 2) / (SIZE / 2), (z - SIZE / 2) / (SIZE / 2)
	local mask = math.clamp(1 - math.sqrt(nx * nx + nz * nz) ^ 2, 0, 1)
	return (0.5 + 1.2 * fbm(x * 0.08 + 0.31, z * 0.08 + 0.47, 4, 11)) * mask
end)`],
'pg-lsystem':['S','Grows a bush from the L-system rule F → F[+F]F[−F]F, drawn with parts by a turtle that turns and branches.',`
local RULE, ITERATIONS, ANGLE, LENGTH = "F[+F]F[-F]F", 3, math.rad(25.7), 1.2
local s = "F"
for _ = 1, ITERATIONS do s = s:gsub("F", RULE) end
local pos, angle, stack = ORIGIN, math.rad(90), {}
for ch in s:gmatch(".") do
	if ch == "F" then
		local nextPos = pos + Vector3.new(math.cos(angle), math.sin(angle), 0) * LENGTH
		local branch = makePart(Vector3.new(0.25, 0.25, LENGTH), pos, Color3.fromRGB(90, 140, 60))
		branch.CFrame = CFrame.lookAt((pos + nextPos) / 2, nextPos)
		pos = nextPos
	elseif ch == "+" then angle += ANGLE
	elseif ch == "-" then angle -= ANGLE
	elseif ch == "[" then table.insert(stack, { pos, angle })
	elseif ch == "]" then pos, angle = table.unpack(table.remove(stack)) end
end`],

/* ===== Graphs & pathfinding ===== */
'pf-bfs':['S','Builds a small maze and runs breadth-first search from one corner to the other, colouring cells as they are explored, then shows the path.',MAZE+`
local start, goal = { 1, 1 }, { W, H }
local came = { [key(1, 1)] = false }
local queue, head = { start }, 1
while head <= #queue do
	local c = queue[head]; head += 1
	if c[1] == goal[1] and c[2] == goal[2] then break end
	makePart(Vector3.new(CELL - 0.6, 0.3, CELL - 0.6), cellPos(c[1], c[2]) + Vector3.new(0, 0.25, 0), Color3.fromHSV(0.5 + head / 600, 0.5, 0.9), { CanCollide = false })
	for _, n in neighbours(c[1], c[2]) do
		if came[key(n[1], n[2])] == nil then came[key(n[1], n[2])] = c; table.insert(queue, n) end
	end
	task.wait(0.01)
end
local path, c = {}, came[key(goal[1], goal[2])] ~= nil and goal or nil
while c do table.insert(path, 1, c); c = came[key(c[1], c[2])] end
showPath(path)
print(#path > 0 and (#path - 1 .. " steps") or "no path")`],

'pf-dijkstra':['S','Dijkstra with costs: mud cells (brown) cost 5. The path detours around mud instead of taking the fewest steps.',MAZE+`
local mud = {}
for x = 1, W do for z = 1, H do
	if open(x, z) and math.noise(x * 0.25, z * 0.25, 3) > 0.1 then
		mud[key(x, z)] = true
		makePart(Vector3.new(CELL - 0.2, 0.25, CELL - 0.2), cellPos(x, z) + Vector3.new(0, 0.15, 0), Color3.fromRGB(110, 80, 50))
	end
end end
local cost, came, open_ = { [key(1, 1)] = 0 }, {}, { {1, 1} }
while #open_ > 0 do
	local bi = 1
	for i = 2, #open_ do if cost[key(open_[i][1], open_[i][2])] < cost[key(open_[bi][1], open_[bi][2])] then bi = i end end
	local c = table.remove(open_, bi)
	if c[1] == W and c[2] == H then break end
	for _, n in neighbours(c[1], c[2]) do
		local k = key(n[1], n[2])
		local newCost = cost[key(c[1], c[2])] + (mud[k] and 5 or 1)
		if cost[k] == nil or newCost < cost[k] then cost[k] = newCost; came[k] = c; table.insert(open_, n) end
	end
end
local path, c = {}, { W, H }
while c do table.insert(path, 1, c); c = came[key(c[1], c[2])] end
showPath(path)
print("total cost", cost[key(W, H)])`],

'pf-astar':['S','A* through a maze: the priority is cost so far plus a Manhattan estimate to the goal, so it explores far fewer cells than Dijkstra.',MAZE+`
local function h(x, z) return math.abs(x - W) + math.abs(z - H) end
local cost, came, openList, explored = { [key(1, 1)] = 0 }, {}, { {1, 1} }, 0
while #openList > 0 do
	local bi = 1
	for i = 2, #openList do
		local a, b = openList[i], openList[bi]
		if cost[key(a[1], a[2])] + h(a[1], a[2]) < cost[key(b[1], b[2])] + h(b[1], b[2]) then bi = i end
	end
	local c = table.remove(openList, bi)
	explored += 1
	makePart(Vector3.new(CELL - 0.8, 0.3, CELL - 0.8), cellPos(c[1], c[2]) + Vector3.new(0, 0.25, 0), Color3.fromRGB(18, 147, 154), { CanCollide = false })
	if c[1] == W and c[2] == H then break end
	for _, n in neighbours(c[1], c[2]) do
		local k = key(n[1], n[2])
		local newCost = cost[key(c[1], c[2])] + 1
		if cost[k] == nil or newCost < cost[k] then cost[k] = newCost; came[k] = c; table.insert(openList, n) end
	end
	task.wait(0.02)
end
local path, c = {}, came[key(W, H)] and { W, H } or nil
while c do table.insert(path, 1, c); c = came[key(c[1], c[2])] end
showPath(path)
print("explored", explored, "cells")`],

'pf-heuristics':['S','Runs A* twice on the same maze with 8-way moves: with the octile heuristic (exact) and with none (Dijkstra), and prints how many cells each explored.',MAZE+`
local SQRT2 = math.sqrt(2)
local function run(useHeuristic)
	local function h(x, z)
		if not useHeuristic then return 0 end
		local dx, dz = math.abs(x - W), math.abs(z - H)
		return dx + dz + (SQRT2 - 2) * math.min(dx, dz)
	end
	local cost, openList, closed, explored = { [key(1, 1)] = 0 }, { {1, 1} }, {}, 0
	while #openList > 0 do
		local bi = 1
		for i = 2, #openList do
			local a, b = openList[i], openList[bi]
			if cost[key(a[1], a[2])] + h(a[1], a[2]) < cost[key(b[1], b[2])] + h(b[1], b[2]) then bi = i end
		end
		local c = table.remove(openList, bi)
		if not closed[key(c[1], c[2])] then
			closed[key(c[1], c[2])] = true
			explored += 1
			if c[1] == W and c[2] == H then return explored, cost[key(W, H)] end
			for dx = -1, 1 do for dz = -1, 1 do
				local nx, nz = c[1] + dx, c[2] + dz
				if (dx ~= 0 or dz ~= 0) and open(nx, nz) and (dx == 0 or dz == 0 or (open(nx, c[2]) and open(c[1], nz))) then
					local k = key(nx, nz)
					local newCost = cost[key(c[1], c[2])] + ((dx ~= 0 and dz ~= 0) and SQRT2 or 1)
					if cost[k] == nil or newCost < cost[k] then cost[k] = newCost; table.insert(openList, {nx, nz}) end
				end
			end end
		end
	end
	return explored, nil
end
local e1, c1 = run(true)
local e2, c2 = run(false)
print(string.format("A* with octile: explored %d cells, length %.2f", e1, c1 or -1))
print(string.format("Dijkstra:       explored %d cells, length %.2f", e2, c2 or -1))`],

'pf-flow':['S','A flow field: one BFS from the goal gives every cell a distance; 30 balls just step to their lowest neighbour each tick and all reach the goal.',MAZE+`
local goal = { W, H }
local dist = { [key(W, H)] = 0 }
local queue, head = { goal }, 1
while head <= #queue do
	local c = queue[head]; head += 1
	for _, n in neighbours(c[1], c[2]) do
		if dist[key(n[1], n[2])] == nil then dist[key(n[1], n[2])] = dist[key(c[1], c[2])] + 1; table.insert(queue, n) end
	end
end
makePart(Vector3.new(2, 2, 2), cellPos(W, H) + Vector3.new(0, 1, 0), Color3.fromRGB(230, 60, 60), { Material = Enum.Material.Neon })
local units = {}
local rng = Random.new()
while #units < 30 do
	local x, z = rng:NextInteger(1, W), rng:NextInteger(1, H)
	if dist[key(x, z)] then
		table.insert(units, { x = x, z = z, part = makePart(Vector3.new(1, 1, 1), cellPos(x, z) + Vector3.new(0, 1, 0), Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false }) })
	end
end
while true do
	for _, u in units do
		local best, bestD = nil, dist[key(u.x, u.z)]
		for _, n in neighbours(u.x, u.z) do
			local d = dist[key(n[1], n[2])]
			if d and d < bestD then best, bestD = n, d end
		end
		if best then u.x, u.z = best[1], best[2] end
		TweenService:Create(u.part, TweenInfo.new(0.25, Enum.EasingStyle.Linear), { Position = cellPos(u.x, u.z) + Vector3.new(0, 1, 0) }):Play()
	end
	task.wait(0.25)
end`],

'pf-smooth':['S','Finds a grid path with BFS, then string-pulls it: from each kept point, skip to the furthest point with clear line of sight. Grey = raw, orange = smoothed.',MAZE+`
local came = { [key(1, 1)] = false }
local queue, head = { {1, 1} }, 1
while head <= #queue do
	local c = queue[head]; head += 1
	for _, n in neighbours(c[1], c[2]) do
		if came[key(n[1], n[2])] == nil then came[key(n[1], n[2])] = c; table.insert(queue, n) end
	end
end
local path, c = {}, came[key(W, H)] ~= nil and { W, H } or nil
while c do table.insert(path, 1, c); c = came[key(c[1], c[2])] end
showPath(path, Color3.fromRGB(140, 140, 150))
local function lineOfSight(a, b)
	local x0, z0, x1, z1 = a[1], a[2], b[1], b[2]
	local dx, dz = math.abs(x1 - x0), -math.abs(z1 - z0)
	local sx, sz = x0 < x1 and 1 or -1, z0 < z1 and 1 or -1
	local err = dx + dz
	while true do
		if not open(x0, z0) then return false end
		if x0 == x1 and z0 == z1 then return true end
		local e2 = 2 * err
		if e2 >= dz then err += dz; x0 += sx end
		if e2 <= dx then err += dx; z0 += sz end
	end
end
local kept, i = { path[1] }, 1
while path[i] and i < #path do
	local j = #path
	while j > i + 1 and not lineOfSight(path[i], path[j]) do j -= 1 end
	table.insert(kept, path[j])
	i = j
end
for k = 1, #kept - 1 do
	drawLine(makeBeam(), cellPos(kept[k][1], kept[k][2]) + Vector3.new(0, 1, 0), cellPos(kept[k + 1][1], kept[k + 1][2]) + Vector3.new(0, 1, 0))
end
print(#path, "waypoints ->", #kept)`],

'pf-waypoints':['S','A small graph of waypoint pads joined by edges. Dijkstra finds the shortest route from pad 1 to pad 8 and a ball walks it.',`
local NODES = { Vector3.new(-14, 0, -8), Vector3.new(-6, 0, -12), Vector3.new(2, 0, -8), Vector3.new(12, 0, -10),
	Vector3.new(-12, 0, 4), Vector3.new(-2, 0, 2), Vector3.new(6, 0, 6), Vector3.new(14, 0, 8) }
local EDGES = { {1,2}, {2,3}, {3,4}, {1,5}, {2,6}, {3,6}, {3,7}, {4,8}, {5,6}, {6,7}, {7,8} }
local graph = {}
for i, p in NODES do
	graph[i] = {}
	makeLabel(makePart(Vector3.new(2, 0.4, 2), ORIGIN + p, Color3.fromRGB(18, 147, 154)), tostring(i))
end
for _, e in EDGES do
	local d = (NODES[e[1]] - NODES[e[2]]).Magnitude
	table.insert(graph[e[1]], { e[2], d })
	table.insert(graph[e[2]], { e[1], d })
	drawLine(makeBeam(Color3.fromRGB(120, 120, 130)), ORIGIN + NODES[e[1]] + Vector3.new(0, 0.3, 0), ORIGIN + NODES[e[2]] + Vector3.new(0, 0.3, 0))
end
local dist, prev, done = {}, {}, {}
for i = 1, #NODES do dist[i] = math.huge end
dist[1] = 0
for _ = 1, #NODES do
	local u
	for i = 1, #NODES do if not done[i] and (not u or dist[i] < dist[u]) then u = i end end
	done[u] = true
	for _, edge in graph[u] do
		local v, w = edge[1], edge[2]
		if dist[u] + w < dist[v] then dist[v] = dist[u] + w; prev[v] = u end
	end
end
local route, n = {}, 8
while n do table.insert(route, 1, n); n = prev[n] end
print("route:", table.concat(route, " -> "), string.format("(%.1f studs)", dist[8]))
local walker = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN + NODES[1] + Vector3.new(0, 1, 0), Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball })
while true do
	for _, i in route do
		local tween = TweenService:Create(walker, TweenInfo.new(0.8, Enum.EasingStyle.Linear), { Position = ORIGIN + NODES[i] + Vector3.new(0, 1, 0) })
		tween:Play()
		tween.Completed:Wait()
	end
	walker.Position = ORIGIN + NODES[1] + Vector3.new(0, 1, 0)
end`],

'pf-follow':['S','A ball follows a list of waypoints, moving on to the next one when it gets within an arrive radius instead of touching it exactly.',`
local WAYPOINTS = { Vector3.new(-12, 1, -8), Vector3.new(-12, 1, 6), Vector3.new(-2, 1, 6), Vector3.new(-2, 1, -4), Vector3.new(8, 1, -4), Vector3.new(8, 1, 8), Vector3.new(14, 1, 8) }
local RADIUS, SPEED = 1.5, 10
for _, w in WAYPOINTS do makePart(Vector3.new(RADIUS * 2, 0.2, RADIUS * 2), ORIGIN + w - Vector3.new(0, 0.9, 0), Color3.fromRGB(18, 147, 154),
	{ Shape = Enum.PartType.Cylinder, Orientation = Vector3.new(0, 0, 90), Transparency = 0.5, CanCollide = false }) end
local walker = makePart(Vector3.new(1.4, 1.4, 1.4), ORIGIN + WAYPOINTS[1], Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false })
local index = 2
RunService.Heartbeat:Connect(function(dt)
	local goal = ORIGIN + WAYPOINTS[index]
	local offset = goal - walker.Position
	if offset.Magnitude < RADIUS then
		index += 1
		if index > #WAYPOINTS then index = 2; walker.Position = ORIGIN + WAYPOINTS[1] end
		return
	end
	walker.Position += offset.Unit * math.min(SPEED * dt, offset.Magnitude)
end)`],

/* ===== Matrices ===== */
'mx-columns':['S','Prints a turning part\'s 12 CFrame components and shows that the rotation columns are its Right, Up and Back vectors.',`
local part = makePart(Vector3.new(2, 1, 4), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(226, 133, 26))
local label = makeLabel(part)
RunService.Heartbeat:Connect(function()
	part.CFrame = CFrame.new(part.Position) * CFrame.fromEulerAnglesYXZ(math.sin(os.clock()) * 0.4, os.clock() * 0.5, 0)
	local x, y, z, R00, R01, R02, R10, R11, R12, R20, R21, R22 = part.CFrame:GetComponents()
	label.Text = string.format("Right (%.2f, %.2f, %.2f)  Look (%.2f, %.2f, %.2f)", R00, R10, R20, -R02, -R12, -R22)
end)`],
'mx-mulvec':['S','A marker sits at a fixed local offset from a spinning part, worked out as Position + Right·x + Up·y − Look·z (the same as cf * v).',`
local part = makePart(Vector3.new(2, 1, 4), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(163, 162, 165))
local marker = makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false })
local v = Vector3.new(3, 2, -2)
RunService.Heartbeat:Connect(function()
	part.CFrame = CFrame.new(part.Position) * CFrame.Angles(0, os.clock(), 0)
	local cf = part.CFrame
	marker.Position = cf.Position + cf.RightVector * v.X + cf.UpVector * v.Y - cf.LookVector * v.Z   -- = cf * v
end)`],
'mx-fk':['S','A three-joint robot arm animated with forward kinematics: each joint is parent × rotation × offset along the bone.',`
local LENGTHS = { 4, 3.5, 2.5 }
local BASE = CFrame.new(ORIGIN + Vector3.new(0, 1, 0))
local bones = {}
for i, len in LENGTHS do bones[i] = makePart(Vector3.new(0.9, len, 0.9), ORIGIN, Color3.fromHSV(i / 4, 0.6, 0.9), { CanCollide = false }) end
RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local angles = { math.sin(t * 0.8) * 0.8, math.sin(t * 1.1) * 1.2 - 0.6, math.sin(t * 1.7) * 0.9 }
	local cf = BASE * CFrame.Angles(0, t * 0.3, 0)
	for i, len in LENGTHS do
		cf = cf * CFrame.Angles(0, 0, angles[i])
		bones[i].CFrame = cf * CFrame.new(0, len / 2, 0)
		cf = cf * CFrame.new(0, len, 0)
	end
end)`],
'mx-inverse':['S','Shows that cf:Inverse() undoes cf: a point turned into local space and back lands exactly where it started.',`
local part = makePart(Vector3.new(2, 1, 4), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(226, 133, 26))
part.CFrame = CFrame.new(part.Position) * CFrame.fromEulerAnglesYXZ(0.3, 0.8, 0.1)
local world = ORIGIN + Vector3.new(5, 4, -3)
local localPoint = part.CFrame:Inverse() * world
local back = part.CFrame * localPoint
print("local:", localPoint, " back to world:", back, " error:", (back - world).Magnitude)
print("cf:Inverse() * cf is identity:", (part.CFrame:Inverse() * part.CFrame).Position.Magnitude < 1e-6)
makeLabel(part, string.format("local point (%.1f, %.1f, %.1f)", localPoint.X, localPoint.Y, localPoint.Z))`],
'mx-orthonormal':['S','Spins a part by multiplying its CFrame onto itself every frame (which slowly drifts), and calls :Orthonormalize() every 100 frames to keep it square.',`
local part = makePart(Vector3.new(2, 1, 4), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(226, 133, 26))
local label = makeLabel(part)
local frames = 0
RunService.Heartbeat:Connect(function(dt)
	part.CFrame = part.CFrame * CFrame.Angles(dt * 0.7, dt * 1.1, dt * 0.3)
	frames += 1
	if frames % 100 == 0 then part.CFrame = part.CFrame:Orthonormalize() end
	local cf = part.CFrame
	local skew = math.abs(cf.RightVector:Dot(cf.UpVector)) + math.abs(cf.UpVector:Dot(cf.LookVector))
	label.Text = string.format("frames %d  skew %.1e", frames, skew)
end)`],
'mx-basis':['L','A marker moves in front of you in camera-relative directions as you hold WASD: the input is turned into world space with the camera\'s flattened axes.',`
local marker = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false, CanQuery = false })
local UserInputService = game:GetService("UserInputService")
local offset = Vector3.zero
RunService.RenderStepped:Connect(function(dt)
	local root = myRoot()
	if not root then return end
	local input = Vector2.new(
		(UserInputService:IsKeyDown(Enum.KeyCode.D) and 1 or 0) - (UserInputService:IsKeyDown(Enum.KeyCode.A) and 1 or 0),
		(UserInputService:IsKeyDown(Enum.KeyCode.W) and 1 or 0) - (UserInputService:IsKeyDown(Enum.KeyCode.S) and 1 or 0))
	local look = camera.CFrame.LookVector
	local forward = Vector3.new(look.X, 0, look.Z).Unit
	local right = Vector3.new(-forward.Z, 0, forward.X)
	local move = right * input.X + forward * input.Y
	offset = offset:Lerp(move * 6, 1 - math.exp(-6 * dt))
	marker.Position = root.Position + Vector3.new(0, 3, 0) + offset
end)`],
'mx-scale':['S','A small house model grows and shrinks around its base: each part\'s size and its offset from the pivot are scaled by the same factor.',`
local pivot = ORIGIN
local layout = { { Vector3.new(0, 2, 0), Vector3.new(6, 4, 6), Color3.fromRGB(220, 200, 170) }, { Vector3.new(0, 5, 0), Vector3.new(7, 2, 7), Color3.fromRGB(170, 60, 50) }, { Vector3.new(0, 1.2, -3.05), Vector3.new(1.5, 2.4, 0.2), Color3.fromRGB(100, 70, 40) } }
local parts = {}
for i, l in layout do parts[i] = makePart(l[2], pivot + l[1], l[3]) end
RunService.Heartbeat:Connect(function()
	local s = 1 + 0.5 * math.sin(os.clock())
	for i, l in layout do
		parts[i].Size = l[2] * s
		parts[i].Position = pivot + l[1] * s               -- offset from the pivot grows too
	end
end)`],
'mx-mirror':['S','A spinning arrow and its mirror twin across a glass plane. Positions and axes are reflected, then the frame is rebuilt with CFrame.lookAt.',`
local MIRROR_X = ORIGIN.X
makePart(Vector3.new(0.2, 10, 16), ORIGIN + Vector3.new(0, 5, 0), Color3.fromRGB(150, 200, 255), { Transparency = 0.7, CanCollide = false })
local original = makePart(Vector3.new(1, 1, 4), ORIGIN, Color3.fromRGB(226, 133, 26))
local twin = makePart(Vector3.new(1, 1, 4), ORIGIN, Color3.fromRGB(226, 133, 26), { Transparency = 0.4 })
local function reflect(v) return Vector3.new(-v.X, v.Y, v.Z) end
RunService.Heartbeat:Connect(function()
	local t = os.clock()
	original.CFrame = CFrame.new(ORIGIN + Vector3.new(5 + math.sin(t) * 2, 4, math.cos(t) * 4)) * CFrame.fromEulerAnglesYXZ(math.sin(t) * 0.5, t, 0)
	local p = original.Position
	local pos = Vector3.new(2 * MIRROR_X - p.X, p.Y, p.Z)
	twin.CFrame = CFrame.lookAt(pos, pos + reflect(original.CFrame.LookVector), reflect(original.CFrame.UpVector))
end)`],

/* ===== Calculus ===== */
'cl-derivative':['S','A ball moves up and down; its speed is measured with a numeric derivative of the position function and shown as an arrow.',`
local function height(t) return 6 + 3 * math.sin(t * 1.5) end
local ball = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false })
local arrow = makeBeam(Color3.fromRGB(18, 147, 154))
local label = makeLabel(ball)
RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local h = 0.001
	local velocity = (height(t + h) - height(t - h)) / (2 * h)       -- slope of the height curve
	ball.Position = ORIGIN + Vector3.new(0, height(t), 0)
	drawLine(arrow, ball.Position, ball.Position + Vector3.new(0, velocity * 0.5, 0))
	label.Text = string.format("speed %.2f", velocity)
end)`],
'cl-velocity':['S','A label over each player shows their speed measured from position samples over the last 8 frames (Δposition ÷ Δtime).',`
local history, labels = {}, {}
RunService.Heartbeat:Connect(function()
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local h = history[player] or {}
			history[player] = h
			table.insert(h, { os.clock(), root.Position })
			if #h > 9 then table.remove(h, 1) end
			if not labels[player] or not labels[player].Parent or labels[player].Parent.Parent ~= root then labels[player] = makeLabel(root) end
			if #h >= 2 then
				local old, new = h[1], h[#h]
				local velocity = (new[2] - old[2]) / (new[1] - old[1])
				labels[player].Text = string.format("%.1f studs/s", velocity.Magnitude)
			end
		end
	end
end)`],
'cl-integral':['S','A car accelerates, cruises and brakes. Distance is the running sum of speed × dt (an integral), and the odometer shows it.',`
local car = makePart(Vector3.new(4, 2, 2), ORIGIN + Vector3.new(-25, 1, 0), Color3.fromRGB(230, 60, 60))
local label = makeLabel(car)
local function speedAt(t) if t < 3 then return 4 * t elseif t < 7 then return 12 else return math.max(0, 12 - 4 * (t - 7)) end end
while true do
	local t, distance = 0, 0
	while t < 10 do
		local dt = RunService.Heartbeat:Wait()
		t += dt
		distance += speedAt(t) * dt                         -- add up speed × time
		car.Position = ORIGIN + Vector3.new(-25 + distance * 0.6, 1, 0)
		label.Text = string.format("speed %.1f   travelled %.1f", speedAt(t), distance)
	end
	task.wait(1)
end`],
'cl-newton':['S','Solves "when does a ball thrown up at 18 studs/s reach height 6?" with Newton\'s method and prints each guess.',`
local G = 20
local function f(t) return 18 * t - 0.5 * G * t * t - 6 end
local function df(t) return 18 - G * t end
local t = 0.1
for i = 1, 6 do
	t = t - f(t) / df(t)
	print(string.format("guess %d: t = %.6f  (f = %.2e)", i, t, f(t)))
end
local ball = makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false })
local mark = makePart(Vector3.new(4, 0.2, 4), ORIGIN + Vector3.new(0, 6, 0), Color3.fromRGB(18, 147, 154), { Transparency = 0.5, CanCollide = false })
makeLabel(mark, string.format("height 6 at t = %.3f s", t))
while true do
	local start = os.clock()
	while os.clock() - start < 1.8 do
		local s = os.clock() - start
		ball.Position = ORIGIN + Vector3.new(0, math.max(0, 18 * s - 0.5 * G * s * s), 0)
		RunService.Heartbeat:Wait()
	end
end`],
'cl-bisection':['S','Uses bisection to find the distance where a falling-off light reaches exactly 25% brightness, and places a marker there.',`
local function brightness(d) return 1 / (1 + 0.02 * d * d) end
local function f(d) return brightness(d) - 0.25 end
local a, b = 0, 40
for i = 1, 25 do
	local mid = (a + b) / 2
	if math.sign(f(a)) ~= math.sign(f(mid)) then b = mid else a = mid end
end
local d = (a + b) / 2
print(string.format("25%% brightness at %.4f studs", d))
local lamp = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN + Vector3.new(0, 2, 0), Color3.fromRGB(255, 220, 120), { Material = Enum.Material.Neon })
local light = Instance.new("PointLight")
light.Range = 40
light.Parent = lamp
local mark = makePart(Vector3.new(1, 4, 1), ORIGIN + Vector3.new(d, 2, 0), Color3.fromRGB(226, 133, 26))
makeLabel(mark, string.format("25%% here (%.2f studs)", d))`],
'cl-gradient':['S','Balls roll downhill on noise terrain using gradient descent: measure the slope numerically, step against it, repeat.',`
local SIZE, CELL, RATE = 24, 2, 3
local function height(x, z) return 4 + 3 * math.noise(x * 0.06 + 0.3, z * 0.06 + 0.7, 3) + 0.01 * ((x - 24) ^ 2 + (z - 24) ^ 2) end
for i = 1, SIZE do for j = 1, SIZE do
	local x, z = i * CELL, j * CELL
	local h = height(x, z)
	makePart(Vector3.new(CELL, h, CELL), ORIGIN + Vector3.new(x - SIZE, h / 2, z - SIZE), Color3.fromRGB(70, 150, 90):Lerp(Color3.fromRGB(240, 230, 200), math.clamp((h - 2) / 8, 0, 1)))
end task.wait() end
local function gradient(x, z) local e = 0.05 return (height(x + e, z) - height(x - e, z)) / (2 * e), (height(x, z + e) - height(x, z - e)) / (2 * e) end
local rng = Random.new()
for _ = 1, 5 do
	task.spawn(function()
		local ball = makePart(Vector3.new(1.4, 1.4, 1.4), ORIGIN, Color3.fromHSV(rng:NextNumber(), 0.7, 1), { Shape = Enum.PartType.Ball, CanCollide = false, Material = Enum.Material.Neon })
		while true do
			local x, z = rng:NextNumber(CELL, SIZE * CELL), rng:NextNumber(CELL, SIZE * CELL)
			for _ = 1, 100 do
				local gx, gz = gradient(x, z)
				x = math.clamp(x - RATE * gx, CELL, SIZE * CELL)
				z = math.clamp(z - RATE * gz, CELL, SIZE * CELL)
				ball.Position = ORIGIN + Vector3.new(x - SIZE, height(x, z) + 1, z - SIZE)
				task.wait(0.05)
			end
		end
	end)
end`],
'cl-arclength':['S','Measures the length of a curved path by adding up straight pieces, printing the estimate for 2, 8, 32 and 128 pieces.',`
local function pointAt(t) return ORIGIN + Vector3.new(-12 + 24 * t, 3 + 3 * math.sin(t * math.pi * 3), 0) end
local function arcLength(n)
	local total, prev = 0, pointAt(0)
	for i = 1, n do
		local p = pointAt(i / n)
		total += (p - prev).Magnitude
		prev = p
	end
	return total
end
for _, n in { 2, 8, 32, 128 } do print(n, "pieces:", string.format("%.3f", arcLength(n))) end
for i = 0, 128 do makePart(Vector3.new(0.3, 0.3, 0.3), pointAt(i / 128), Color3.fromRGB(226, 133, 26), { CanCollide = false }) end
local sign = makePart(Vector3.new(1, 1, 1), ORIGIN + Vector3.new(0, 9, 0), Color3.new(1, 1, 1))
makeLabel(sign, string.format("length about %.2f studs", arcLength(256)))`],
'cl-continuity':['S','Two blocks go through the same waypoints: linear legs (speed jumps at each point) vs a Catmull-Rom spline (smooth speed).',`
local KEYS = { Vector3.new(-14, 2, 0), Vector3.new(-5, 6, -6), Vector3.new(4, 2, 6), Vector3.new(14, 6, 0) }
for _, k in KEYS do makePart(Vector3.new(0.8, 0.8, 0.8), ORIGIN + k, Color3.fromRGB(194, 65, 142), { CanCollide = false }) end
local linear = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(230, 60, 60), { CanCollide = false })
local smooth = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false })
makeLabel(linear, "linear")
makeLabel(smooth, "spline")
local function key(i) return ORIGIN + KEYS[math.clamp(i, 1, #KEYS)] end
local function catmullRom(p0, p1, p2, p3, t) return 0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ^ 2 + (3 * p1 - p0 - 3 * p2 + p3) * t ^ 3) end
RunService.Heartbeat:Connect(function()
	local u = (os.clock() * 0.6) % 3
	local i, t = math.floor(u) + 1, u % 1
	linear.Position = key(i):Lerp(key(i + 1), t)
	smooth.Position = catmullRom(key(i - 1), key(i), key(i + 1), key(i + 2), t) + Vector3.new(0, 0, 2)
end)`],

/* ===== Spatial partitioning ===== */
'sp-brute':['S','Counts how many pair checks "everyone vs everyone" needs as the object count grows, and prints the table.',`
for _, n in { 10, 50, 100, 400, 1000 } do
	print(string.format("%5d objects -> %7d pair checks", n, n * (n - 1) / 2))
end
local parts = {}
for i = 1, 20 do parts[i] = makePart(Vector3.new(1, 1, 1), ORIGIN + Vector3.new(math.random(-10, 10), 1, math.random(-10, 10)), Color3.fromRGB(18, 147, 154), { Shape = Enum.PartType.Ball }) end
local checks = 0
for i = 1, #parts do for j = i + 1, #parts do
	checks += 1
	if (parts[i].Position - parts[j].Position).Magnitude < 4 then
		drawLine(makeBeam(Color3.fromRGB(230, 60, 60)), parts[i].Position, parts[j].Position)
	end
end end
print("20 objects took", checks, "checks")`],
'sp-hash':['S','300 dots in a spatial hash. Every frame the dots within 10 studs of you are found by checking only the nearby grid cells, and turn orange.',SCATTER+`
local dots = scatter(300, 40)
local CELL, RADIUS = 8, 10
local function cellKey(p) return math.floor(p.X / CELL) .. "," .. math.floor(p.Z / CELL) end
local buckets = {}
for _, d in dots do local k = cellKey(d.Position); buckets[k] = buckets[k] or {}; table.insert(buckets[k], d) end
local lit = {}
RunService.Heartbeat:Connect(function()
	for _, d in lit do d.Color = Color3.fromRGB(120, 120, 130) end
	table.clear(lit)
	local root = nearestRoot(ORIGIN)
	if not root then return end
	local c = root.Position
	for cx = math.floor((c.X - RADIUS) / CELL), math.floor((c.X + RADIUS) / CELL) do
		for cz = math.floor((c.Z - RADIUS) / CELL), math.floor((c.Z + RADIUS) / CELL) do
			for _, d in buckets[cx .. "," .. cz] or {} do
				if (d.Position - c).Magnitude <= RADIUS then d.Color = Color3.fromRGB(226, 133, 26); table.insert(lit, d) end
			end
		end
	end
end)`],
'sp-quadtree':['S','Builds a quadtree over 200 clumped points (splitting any square with more than 4 points) and draws the squares as outlines.',`
local rng = Random.new(5)
local points = {}
local centers = { Vector2.new(-15, -10), Vector2.new(12, 10), Vector2.new(15, -14) }
for i = 1, 200 do
	local c = centers[i % 3 + 1]
	local a, d = rng:NextNumber(0, 2 * math.pi), rng:NextNumber() ^ 2 * 8
	points[i] = Vector2.new(math.clamp(c.X + math.cos(a) * d, -24.9, 24.9), math.clamp(c.Y + math.sin(a) * d, -24.9, 24.9))
	makePart(Vector3.new(0.4, 0.4, 0.4), ORIGIN + Vector3.new(points[i].X, 0.4, points[i].Y), Color3.fromRGB(18, 147, 154), { CanCollide = false })
end
local function outline(x, z, size)
	for _, e in { { Vector3.new(size, 0.2, 0.2), Vector3.new(size / 2, 0, 0) }, { Vector3.new(size, 0.2, 0.2), Vector3.new(size / 2, 0, size) },
	              { Vector3.new(0.2, 0.2, size), Vector3.new(0, 0, size / 2) }, { Vector3.new(0.2, 0.2, size), Vector3.new(size, 0, size / 2) } } do
		makePart(e[1], ORIGIN + Vector3.new(x, 0.1, z) + e[2], Color3.fromRGB(226, 133, 26), { CanCollide = false })
	end
end
local function build(pts, x, z, size, depth)
	outline(x, z, size)
	if #pts <= 4 or depth >= 6 then return end
	local half = size / 2
	for _, q in { { 0, 0 }, { half, 0 }, { 0, half }, { half, half } } do
		local inside = {}
		for _, p in pts do
			if p.X >= x + q[1] and p.X < x + q[1] + half and p.Y >= z + q[2] and p.Y < z + q[2] + half then table.insert(inside, p) end
		end
		build(inside, x + q[1], z + q[2], half, depth + 1)
	end
end
build(points, -25, -25, 50, 0)`],
'sp-octree':['S','Builds an octree over 150 points in a 3D shell and draws each cube that holds more than 4 points as see-through boxes.',`
local rng = Random.new(19)
local points = {}
for i = 1, 150 do
	local dir = Vector3.new(rng:NextNumber(-1, 1), rng:NextNumber(-1, 1), rng:NextNumber(-1, 1)).Unit
	points[i] = Vector3.new(0, 10, 0) + dir * rng:NextNumber(6, 9)
	makePart(Vector3.new(0.4, 0.4, 0.4), ORIGIN + points[i], Color3.fromRGB(18, 147, 154), { CanCollide = false })
end
local function build(pts, corner, size, depth)
	if #pts <= 4 or depth >= 4 then return end
	makePart(Vector3.new(size, size, size), ORIGIN + corner + Vector3.new(size, size, size) / 2, Color3.fromRGB(226, 133, 26), { Transparency = 0.9, CanCollide = false })
	local half = size / 2
	for _, ox in { 0, half } do for _, oy in { 0, half } do for _, oz in { 0, half } do
		local c = corner + Vector3.new(ox, oy, oz)
		local inside = {}
		for _, p in pts do
			if p.X >= c.X and p.X < c.X + half and p.Y >= c.Y and p.Y < c.Y + half and p.Z >= c.Z and p.Z < c.Z + half then table.insert(inside, p) end
		end
		build(inside, c, half, depth + 1)
	end end end
end
build(points, Vector3.new(-10, 0, -10), 20, 0)`],
'sp-nearest':['S','Finds the dot nearest to you each frame by searching grid rings outward and stopping once the next ring is further than the best found. A beam points to it.',SCATTER+`
local dots = scatter(250, 40)
local CELL = 6
local buckets = {}
local function cellOf(p) return math.floor(p.X / CELL), math.floor(p.Z / CELL) end
for _, d in dots do local cx, cz = cellOf(d.Position); local k = cx .. "," .. cz; buckets[k] = buckets[k] or {}; table.insert(buckets[k], d) end
local beam = makeBeam()
RunService.Heartbeat:Connect(function()
	local root = nearestRoot(ORIGIN)
	if not root then return end
	local pos = root.Position
	local qx, qz = cellOf(pos)
	local best, bestD = nil, math.huge
	for ring = 0, 15 do
		if best and (ring - 1) * CELL > bestD then break end
		for dx = -ring, ring do for dz = -ring, ring do
			if math.max(math.abs(dx), math.abs(dz)) == ring then
				for _, d in buckets[(qx + dx) .. "," .. (qz + dz)] or {} do
					local dist = (d.Position - pos).Magnitude
					if dist < bestD then best, bestD = d, dist end
				end
			end
		end end
	end
	if best then drawLine(beam, pos, best.Position) end
end)`],
'sp-sweep':['S','Sweep and prune: 40 boxes sorted by their left edge; only boxes whose X ranges overlap are tested, and touching pairs turn red.',`
local rng = Random.new(6)
local boxes = {}
for i = 1, 40 do
	local size = Vector3.new(rng:NextNumber(1.5, 4), 1, rng:NextNumber(1.5, 4))
	local b = makePart(size, ORIGIN + Vector3.new(rng:NextNumber(-20, 20), 0.5, rng:NextNumber(-12, 12)), Color3.fromRGB(18, 147, 154), { Transparency = 0.3 })
	table.insert(boxes, { part = b, minX = b.Position.X - size.X / 2, maxX = b.Position.X + size.X / 2, minZ = b.Position.Z - size.Z / 2, maxZ = b.Position.Z + size.Z / 2 })
end
table.sort(boxes, function(a, b) return a.minX < b.minX end)
local active, tests, hits = {}, 0, 0
for _, box in boxes do
	for i = #active, 1, -1 do if active[i].maxX < box.minX then table.remove(active, i) end end
	for _, other in active do
		tests += 1
		if box.minZ <= other.maxZ and other.minZ <= box.maxZ then
			hits += 1
			box.part.Color = Color3.fromRGB(230, 60, 60)
			other.part.Color = Color3.fromRGB(230, 60, 60)
		end
	end
	table.insert(active, box)
end
print(string.format("%d tests instead of %d, %d overlapping pairs", tests, 40 * 39 / 2, hits))`],
'sp-lod':['S','150 spinning gems: ones near a player spin every frame, mid-range ones every 4th frame (staggered), far ones not at all.',SCATTER+`
local gems = scatter(150, 50)
local NEAR2, FAR2 = 15 ^ 2, 35 ^ 2
local frame = 0
RunService.Heartbeat:Connect(function(dt)
	frame += 1
	local root = nearestRoot(ORIGIN)
	if not root then return end
	for i, gem in gems do
		local offset = gem.Position - root.Position
		local d2 = offset:Dot(offset)                       -- squared distance: no square root
		if d2 < NEAR2 then
			gem.Color = Color3.fromRGB(226, 133, 26)
			gem.CFrame *= CFrame.Angles(0, dt * 3, 0)
		elseif d2 < FAR2 then
			gem.Color = Color3.fromRGB(18, 147, 154)
			if (frame + i) % 4 == 0 then gem.CFrame *= CFrame.Angles(0, dt * 12, 0) end
		else
			gem.Color = Color3.fromRGB(120, 120, 130)
		end
	end
end)`],

/* ===== Signals & networking ===== */
'sg-movingavg':['L','An FPS counter in the corner that averages the last 30 frames so it doesn\'t flicker.',`
local gui = Instance.new("ScreenGui")
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")
local label = Instance.new("TextLabel")
label.Size = UDim2.fromOffset(160, 32)
label.Position = UDim2.new(1, -170, 0, 10)
label.BackgroundColor3 = Color3.fromRGB(20, 20, 25)
label.TextColor3 = Color3.new(1, 1, 1)
label.TextScaled = true
label.Parent = gui
local WINDOW, samples, sum = 30, {}, 0
RunService.RenderStepped:Connect(function(dt)
	table.insert(samples, dt)
	sum += dt
	if #samples > WINDOW then sum -= table.remove(samples, 1) end
	label.Text = string.format("%.0f FPS (avg)", #samples / sum)
end)`],
'sg-ema':['S','A needle follows a noisy signal smoothly using exponential smoothing: smoothed += (raw − smoothed) × alpha.',`
local raw = makePart(Vector3.new(0.6, 0.6, 0.6), ORIGIN, Color3.fromRGB(120, 120, 130), { CanCollide = false })
local smooth = makePart(Vector3.new(1.2, 1.2, 1.2), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false })
makeLabel(raw, "raw")
makeLabel(smooth, "smoothed")
local value = 0
RunService.Heartbeat:Connect(function(dt)
	local t = os.clock()
	local noisy = 4 * math.sin(t * 0.8) + (math.random() - 0.5) * 3
	value += (noisy - value) * (1 - math.exp(-dt / 0.3))      -- about 0.3 s reaction time
	raw.Position = ORIGIN + Vector3.new(-3, 6 + noisy, 0)
	smooth.Position = ORIGIN + Vector3.new(3, 6 + value, 0)
end)`],
'sg-deadzone':['L','Shows your gamepad left stick (or WASD) as a dot: tiny input inside the dead zone is ignored and the rest is rescaled and curved.',`
local UserInputService = game:GetService("UserInputService")
local DEAD, POWER = 0.2, 2
local gui = Instance.new("ScreenGui")
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")
local pad = Instance.new("Frame")
pad.Size = UDim2.fromOffset(160, 160)
pad.Position = UDim2.new(0, 20, 1, -180)
pad.BackgroundColor3 = Color3.fromRGB(30, 30, 35)
pad.Parent = gui
local dot = Instance.new("Frame")
dot.AnchorPoint = Vector2.new(0.5, 0.5)
dot.Size = UDim2.fromOffset(16, 16)
dot.BackgroundColor3 = Color3.fromRGB(226, 133, 26)
dot.Parent = pad
local stick = Vector2.zero
UserInputService.InputChanged:Connect(function(input)
	if input.KeyCode == Enum.KeyCode.Thumbstick1 then stick = Vector2.new(input.Position.X, -input.Position.Y) end
end)
local function shape(v)
	local m = math.min(v.Magnitude, 1)
	if m <= DEAD then return Vector2.zero end
	return v.Unit * ((m - DEAD) / (1 - DEAD)) ^ POWER
end
RunService.RenderStepped:Connect(function()
	local keys = Vector2.new((UserInputService:IsKeyDown(Enum.KeyCode.D) and 1 or 0) - (UserInputService:IsKeyDown(Enum.KeyCode.A) and 1 or 0),
		(UserInputService:IsKeyDown(Enum.KeyCode.S) and 1 or 0) - (UserInputService:IsKeyDown(Enum.KeyCode.W) and 1 or 0))
	local out = shape(stick.Magnitude > 0.01 and stick or keys)
	dot.Position = UDim2.fromScale(0.5 + out.X * 0.45, 0.5 + out.Y * 0.45)
end)`],
'sg-shake':['L','Press E for camera shake: trauma rises on each press and drains over time; the shake is trauma² × noise.',`
local UserInputService = game:GetService("UserInputService")
local trauma = 0
UserInputService.InputBegan:Connect(function(input, processed)
	if not processed and input.KeyCode == Enum.KeyCode.E then trauma = math.min(1, trauma + 0.5) end
end)
RunService:BindToRenderStep("Shake", Enum.RenderPriority.Camera.Value + 1, function(dt)
	trauma = math.max(0, trauma - 1.2 * dt)
	if trauma <= 0 then return end
	local shake, t = trauma * trauma, os.clock() * 15
	local offset = Vector3.new(math.noise(t, 1.3), math.noise(t, 7.1), 0) * 2.4 * shake
	camera.CFrame = camera.CFrame * CFrame.new(offset) * CFrame.Angles(0, 0, math.noise(t, 3.3) * 0.14 * shake)
end)`],
'sg-alias':['S','A wheel with 8 spokes spins faster and faster. Watch it on screen: at some speeds it looks frozen or spinning backwards (aliasing).',`
local wheel = makePart(Vector3.new(0.4, 8, 8), ORIGIN + Vector3.new(0, 5, 0), Color3.fromRGB(60, 60, 70), { Shape = Enum.PartType.Cylinder, CanCollide = false })
local spokes = {}
for i = 1, 4 do spokes[i] = makePart(Vector3.new(0.5, 7.6, 0.4), wheel.Position, Color3.fromRGB(226, 133, 26), { CanCollide = false }) end
local label = makeLabel(wheel)
local angle = 0
RunService.Heartbeat:Connect(function(dt)
	local turnsPerSecond = (os.clock() % 30) * 0.5               -- slowly speeds up, then resets
	angle += turnsPerSecond * 2 * math.pi * dt
	for i, s in spokes do s.CFrame = CFrame.new(wheel.Position) * CFrame.Angles(angle + i * math.pi / 4, 0, 0) end
	label.Text = string.format("%.1f turns per second", turnsPerSecond)
end)`],
'sg-interp':['S','The server sends a moving target\'s position only 5 times a second. One copy snaps to each update; the other renders 0.3 s in the past and interpolates smoothly.',`
local real = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(163, 162, 165), { Transparency = 0.6, CanCollide = false })
local snapped = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(230, 60, 60), { CanCollide = false })
local smooth = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false })
makeLabel(snapped, "snap")
makeLabel(smooth, "interpolated")
local function truePos(t) return ORIGIN + Vector3.new(math.sin(t * 0.9) * 12, 3, math.sin(t * 1.8) * 6) end
local buffer, DELAY, RATE = {}, 0.3, 5
task.spawn(function()
	while true do
		table.insert(buffer, { time = os.clock(), pos = truePos(os.clock()) })   -- "network update"
		if #buffer > 20 then table.remove(buffer, 1) end
		snapped.Position = buffer[#buffer].pos + Vector3.new(0, 2, 0)
		task.wait(1 / RATE)
	end
end)
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	real.Position = truePos(now)
	local renderTime = now - DELAY
	for i = #buffer, 2, -1 do
		local a, b = buffer[i - 1], buffer[i]
		if a.time <= renderTime and renderTime <= b.time then
			smooth.Position = a.pos:Lerp(b.pos, (renderTime - a.time) / (b.time - a.time)) + Vector3.new(0, 4, 0)
			break
		end
	end
end)`],
'sg-extrap':['S','With only 4 updates a second, a copy predicts where the target is now from its last position and velocity (dead reckoning), blending smoothly to corrections.',`
local real = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(163, 162, 165), { Transparency = 0.6, CanCollide = false })
local predicted = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false })
makeLabel(predicted, "predicted")
local function truePos(t) return ORIGIN + Vector3.new(math.sin(t * 0.9) * 12, 3, math.sin(t * 1.8) * 6) end
local last = { time = os.clock(), pos = truePos(os.clock()), vel = Vector3.zero }
task.spawn(function()
	while true do
		local t = os.clock()
		last = { time = t, pos = truePos(t), vel = (truePos(t + 0.01) - truePos(t)) / 0.01 }
		task.wait(0.25)
	end
end)
local shown = last.pos
RunService.Heartbeat:Connect(function(dt)
	local now = os.clock()
	real.Position = truePos(now)
	local guess = last.pos + last.vel * (now - last.time)
	shown = shown:Lerp(guess, 1 - math.exp(-8 * dt))
	predicted.Position = shown
end)`],
'sg-hysteresis':['S','An NPC starts chasing when you come within 10 studs and only gives up past 16, so it doesn\'t flicker at the edge.',`
local ENTER, LEAVE = 10, 16
local npc = makePart(Vector3.new(2, 4, 2), ORIGIN + Vector3.new(0, 2, 0), Color3.fromRGB(90, 160, 230))
local label = makeLabel(npc)
local home = npc.Position
local chasing = false
RunService.Heartbeat:Connect(function(dt)
	local root = nearestRoot(npc.Position)
	local d = root and (root.Position - npc.Position).Magnitude or math.huge
	if not chasing and d < ENTER then chasing = true elseif chasing and d > LEAVE then chasing = false end
	local goal = chasing and root and root.Position * Vector3.new(1, 0, 1) + Vector3.new(0, 2, 0) or home
	local offset = goal - npc.Position
	if offset.Magnitude > 0.1 then npc.Position += offset.Unit * math.min(8 * dt, offset.Magnitude) end
	npc.Color = chasing and Color3.fromRGB(230, 60, 60) or Color3.fromRGB(90, 160, 230)
	label.Text = string.format("%s (%.0f studs)", chasing and "CHASING" or "idle", d)
end)`],
'sg-ratelimit':['S','A button anyone can click, protected by a token bucket per player: bursts of 3, then 1 per second. Spam clicks are rejected.',`
local CAPACITY, RATE = 3, 1
local buckets = {}
local button = makePart(Vector3.new(4, 1, 4), ORIGIN + Vector3.new(0, 0.5, 0), Color3.fromRGB(226, 133, 26))
local label = makeLabel(button, "click fast!")
local click = Instance.new("ClickDetector")
click.Parent = button
click.MouseClick:Connect(function(player)
	local now = os.clock()
	local b = buckets[player] or { tokens = CAPACITY, last = now }
	buckets[player] = b
	b.tokens = math.min(CAPACITY, b.tokens + (now - b.last) * RATE)
	b.last = now
	if b.tokens < 1 then
		label.Text = player.Name .. ": too fast (rejected)"
		button.Color = Color3.fromRGB(230, 60, 60)
		return
	end
	b.tokens -= 1
	label.Text = string.format("%s: accepted (%.1f tokens left)", player.Name, b.tokens)
	button.Color = Color3.fromRGB(60, 200, 90)
end)
Players.PlayerRemoving:Connect(function(player) buckets[player] = nil end)`],
});
})();
