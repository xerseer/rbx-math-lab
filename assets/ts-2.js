(function(){
"use strict";
const BEZ = `local function quadBezier(p0, p1, p2, t)
	return p0:Lerp(p1, t):Lerp(p1:Lerp(p2, t), t)
end
local function cubicBezier(p0, p1, p2, p3, t)
	local u = 1 - t
	return p0 * u ^ 3 + p1 * (3 * u ^ 2 * t) + p2 * (3 * u * t ^ 2) + p3 * t ^ 3
end
local function cubicTangent(p0, p1, p2, p3, t)
	local u = 1 - t
	return (p1 - p0) * (3 * u ^ 2) + (p2 - p1) * (6 * u * t) + (p3 - p2) * (3 * t ^ 2)
end
`;
const WALLS = `local function makeRoom(size, height)
	for _, w in { {Vector3.new(size * 2, height, 1), Vector3.new(0, height / 2, -size)}, {Vector3.new(size * 2, height, 1), Vector3.new(0, height / 2, size)},
	              {Vector3.new(1, height, size * 2), Vector3.new(-size, height / 2, 0)}, {Vector3.new(1, height, size * 2), Vector3.new(size, height / 2, 0)} } do
		makePart(w[1], ORIGIN + w[2], Color3.fromRGB(90, 90, 100))
	end
end
`;
Lab.ts({
/* ===== Bézier ===== */
'bz-quad':['S','A quadratic Bézier drawn with dots. The control point bobs up and down, and an orange ball rides the curve.',BEZ+`
local p0, p2 = ORIGIN + Vector3.new(-12, 1, 0), ORIGIN + Vector3.new(12, 1, 0)
local control = makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(163, 162, 165), { CanCollide = false })
local dots = {}
for i = 0, 30 do dots[i] = makePart(Vector3.new(0.4, 0.4, 0.4), ORIGIN, Color3.fromRGB(18, 147, 154), { Shape = Enum.PartType.Ball, CanCollide = false }) end
local rider = makePart(Vector3.new(1.4, 1.4, 1.4), p0, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false, Material = Enum.Material.Neon })

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local p1 = ORIGIN + Vector3.new(math.sin(t * 0.5) * 6, 8 + math.sin(t) * 4, -4)
	control.Position = p1
	for i, dot in dots do dot.Position = quadBezier(p0, p1, p2, i / 30) end
	rider.Position = quadBezier(p0, p1, p2, 0.5 - 0.5 * math.cos(t * 1.2))
end)`],

'bz-cubic':['S','A cubic Bézier S-curve with two control points, drawn with dots, with a ball riding along it.',BEZ+`
local p0, p3 = ORIGIN + Vector3.new(-14, 1, 0), ORIGIN + Vector3.new(14, 1, 0)
local c1 = makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(163, 162, 165), { CanCollide = false })
local c2 = makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(163, 162, 165), { CanCollide = false })
local dots = {}
for i = 0, 40 do dots[i] = makePart(Vector3.new(0.4, 0.4, 0.4), ORIGIN, Color3.fromRGB(18, 147, 154), { Shape = Enum.PartType.Ball, CanCollide = false }) end
local rider = makePart(Vector3.new(1.4, 1.4, 1.4), p0, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false, Material = Enum.Material.Neon })

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local p1 = ORIGIN + Vector3.new(-6, 10 + math.sin(t) * 3, -6)
	local p2 = ORIGIN + Vector3.new(6, 1 + math.cos(t) * 2, 8)
	c1.Position, c2.Position = p1, p2
	for i, dot in dots do dot.Position = cubicBezier(p0, p1, p2, p3, i / 40) end
	rider.Position = cubicBezier(p0, p1, p2, p3, 0.5 - 0.5 * math.cos(t))
end)`],

'bz-follow':['S','A cart travels a cubic track at a constant speed (using a distance table) and always faces along the curve (tangent).',BEZ+`
local p0, p1, p2, p3 = ORIGIN + Vector3.new(-16, 1, 8), ORIGIN + Vector3.new(-16, 1, -14), ORIGIN + Vector3.new(16, 6, 14), ORIGIN + Vector3.new(16, 1, -8)
local SAMPLES, lengths, total = 200, { 0 }, 0
local prev = p0
for i = 1, SAMPLES do
	local point = cubicBezier(p0, p1, p2, p3, i / SAMPLES)
	total += (point - prev).Magnitude
	lengths[i + 1] = total
	prev = point
	if i % 5 == 0 then makePart(Vector3.new(0.3, 0.3, 0.3), point, Color3.fromRGB(90, 90, 100), { CanCollide = false }) end
end
local function tAtDistance(d)
	for i = 2, #lengths do
		if lengths[i] >= d then
			local a, b = lengths[i - 1], lengths[i]
			return (i - 2 + (d - a) / (b - a)) / SAMPLES
		end
	end
	return 1
end
local cart = makePart(Vector3.new(2, 1.2, 3), p0, Color3.fromRGB(226, 133, 26), { CanCollide = false })
local SPEED = 12

RunService.Heartbeat:Connect(function()
	local t = tAtDistance((os.clock() * SPEED) % total)
	local pos = cubicBezier(p0, p1, p2, p3, t) + Vector3.new(0, 0.8, 0)
	cart.CFrame = CFrame.lookAt(pos, pos + cubicTangent(p0, p1, p2, p3, t))
end)`],

'bz-throw':['S','Every 2 seconds a ball is lobbed at the nearest player (or a random spot) along a quadratic arc and lands exactly there.',BEZ+`
local launcher = makePart(Vector3.new(3, 3, 3), ORIGIN + Vector3.new(-18, 1.5, 0), Color3.fromRGB(60, 60, 70))
local rng = Random.new()
while true do
	local root = nearestRoot(launcher.Position, 60)
	local target = root and root.Position - Vector3.new(0, 2.5, 0) or ORIGIN + Vector3.new(rng:NextNumber(-5, 15), 0.5, rng:NextNumber(-10, 10))
	local p0 = launcher.Position + Vector3.new(0, 2, 0)
	local p1 = (p0 + target) / 2 + Vector3.new(0, 18, 0)
	local ball = makePart(Vector3.new(1.4, 1.4, 1.4), p0, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false })
	local start = os.clock()
	while os.clock() - start < 1.3 do
		ball.Position = quadBezier(p0, p1, target, (os.clock() - start) / 1.3)
		RunService.Heartbeat:Wait()
	end
	local boom = Instance.new("Explosion")
	boom.Position = target
	boom.BlastPressure = 0
	boom.DestroyJointRadiusPercent = 0
	boom.Parent = workspace
	ball:Destroy()
	task.wait(2)
end`],

'bz-catmull':['S','A drone patrols a closed loop through six waypoints using a Catmull-Rom spline, which passes through every point.',`
local waypoints = {}
for i = 1, 6 do
	local a = (i - 1) / 6 * math.pi * 2
	waypoints[i] = ORIGIN + Vector3.new(math.cos(a) * (10 + (i % 2) * 5), 3 + (i % 3) * 2, math.sin(a) * (10 + (i % 2) * 5))
	makePart(Vector3.new(1, 1, 1), waypoints[i], Color3.fromRGB(18, 147, 154), { CanCollide = false })
end
local function catmullRom(p0, p1, p2, p3, t)
	return 0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ^ 2 + (3 * p1 - p0 - 3 * p2 + p3) * t ^ 3)
end
local function at(i) return waypoints[(i - 1) % #waypoints + 1] end
local drone = makePart(Vector3.new(1.5, 1, 2.5), waypoints[1], Color3.fromRGB(226, 133, 26), { CanCollide = false })

RunService.Heartbeat:Connect(function()
	local u = (os.clock() * 0.6) % #waypoints
	local i, t = math.floor(u) + 1, u % 1
	local pos = catmullRom(at(i - 1), at(i), at(i + 1), at(i + 2), t)
	local ahead = catmullRom(at(i - 1), at(i), at(i + 1), at(i + 2), math.min(t + 0.02, 1))
	if (ahead - pos).Magnitude > 1e-3 then drone.CFrame = CFrame.lookAt(pos, ahead) end
end)`],

'bz-chain':['S','Two cubic curves joined smoothly: the second curve\'s first handle mirrors the first curve\'s last handle through the joint, so the cart flows through without a kink.',BEZ+`
local a0, a1, a2, joint = ORIGIN + Vector3.new(-18, 1, 0), ORIGIN + Vector3.new(-14, 1, -12), ORIGIN + Vector3.new(-4, 1, -8), ORIGIN + Vector3.new(0, 1, 0)
local b1 = joint + (joint - a2)                     -- mirror the handle: no corner at the joint
local b2, b3 = ORIGIN + Vector3.new(14, 1, 12), ORIGIN + Vector3.new(18, 1, 0)
for i = 0, 60 do
	local t = i / 30
	local p = t <= 1 and cubicBezier(a0, a1, a2, joint, t) or cubicBezier(joint, b1, b2, b3, t - 1)
	makePart(Vector3.new(0.3, 0.3, 0.3), p, Color3.fromRGB(90, 90, 100), { CanCollide = false })
end
local cart = makePart(Vector3.new(2, 1, 3), a0, Color3.fromRGB(226, 133, 26), { CanCollide = false })

RunService.Heartbeat:Connect(function()
	local u = (os.clock() * 0.4) % 2
	local onA = u < 1
	local t = onA and u or u - 1
	local pos = onA and cubicBezier(a0, a1, a2, joint, t) or cubicBezier(joint, b1, b2, b3, t)
	local dir = onA and cubicTangent(a0, a1, a2, joint, t) or cubicTangent(joint, b1, b2, b3, t)
	cart.CFrame = CFrame.lookAt(pos + Vector3.new(0, 0.6, 0), pos + Vector3.new(0, 0.6, 0) + dir)
end)`],

'bz-closest':['S','A curved rail. A marker shows the closest point on it to the nearest player (sampled, then refined), and it says "GRIND" when you are within 3 studs.',BEZ+`
local p0, p1, p2, p3 = ORIGIN + Vector3.new(-16, 3, 6), ORIGIN + Vector3.new(-6, 8, -12), ORIGIN + Vector3.new(6, 0, 12), ORIGIN + Vector3.new(16, 3, -6)
for i = 0, 60 do makePart(Vector3.new(0.5, 0.5, 0.5), cubicBezier(p0, p1, p2, p3, i / 60), Color3.fromRGB(60, 60, 70), { CanCollide = false }) end
local marker = makePart(Vector3.new(1.2, 1.2, 1.2), p0, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false })
local label = makeLabel(marker)
local function dist(t, point) return (cubicBezier(p0, p1, p2, p3, t) - point).Magnitude end

RunService.Heartbeat:Connect(function()
	local root = nearestRoot(marker.Position)
	if not root then return end
	local best, bestD = 0, math.huge
	for i = 0, 50 do
		local d = dist(i / 50, root.Position)
		if d < bestD then best, bestD = i / 50, d end
	end
	local lo, hi = math.max(0, best - 0.02), math.min(1, best + 0.02)
	for _ = 1, 20 do
		local a, b = lo + (hi - lo) / 3, hi - (hi - lo) / 3
		if dist(a, root.Position) < dist(b, root.Position) then hi = b else lo = a end
	end
	local t = (lo + hi) / 2
	marker.Position = cubicBezier(p0, p1, p2, p3, t)
	local d = dist(t, root.Position)
	label.Text = string.format("t = %.2f   %.1f studs%s", t, d, d < 3 and "  GRIND" or "")
end)`],

'bz-offset':['S','Builds a road along a cubic curve out of parts, with fence posts on both edges placed using tangent × up.',BEZ+`
local p0, p1, p2, p3 = ORIGIN + Vector3.new(-24, 0.2, 10), ORIGIN + Vector3.new(-8, 0.2, -16), ORIGIN + Vector3.new(8, 0.2, 16), ORIGIN + Vector3.new(24, 0.2, -10)
local SEGMENTS, WIDTH = 40, 6
for i = 0, SEGMENTS - 1 do
	local a = cubicBezier(p0, p1, p2, p3, i / SEGMENTS)
	local b = cubicBezier(p0, p1, p2, p3, (i + 1) / SEGMENTS)
	local road = makePart(Vector3.new(WIDTH, 0.4, (b - a).Magnitude + 0.1), a, Color3.fromRGB(60, 60, 65))
	road.CFrame = CFrame.lookAt((a + b) / 2, b)
	if i % 3 == 0 then
		local right = (b - a):Cross(Vector3.yAxis).Unit
		for _, side in { -1, 1 } do
			makePart(Vector3.new(0.4, 2, 0.4), a + right * side * (WIDTH / 2 + 0.5) + Vector3.new(0, 1, 0), Color3.fromRGB(240, 240, 240))
		end
	end
end`],

'bz-frame':['S','A loop-the-loop track. The cart\'s "up" is carried along the curve with rotation-minimising frames, so it stays on the inside of the loop instead of flipping.',`
local N = 240
local points = {}
for i = 0, N do
	local s = i / N
	local th = -math.pi + 2 * math.pi * s
	points[i] = ORIGIN + Vector3.new(4 * (s * 2 * math.pi - math.pi) - 9 * math.sin(th) * 0.5, 2 + 6 * (1 + math.cos(th)), 4 * s - 2)
	if i % 4 == 0 then makePart(Vector3.new(0.4, 0.4, 0.4), points[i], Color3.fromRGB(60, 60, 70), { CanCollide = false }) end
end
local tangents, ups = {}, {}
for i = 0, N do tangents[i] = (points[math.min(N, i + 1)] - points[math.max(0, i - 1)]).Unit end
ups[0] = Vector3.yAxis
for i = 0, N - 1 do
	local v1 = points[i + 1] - points[i]
	local c1 = v1:Dot(v1)
	local rL = ups[i] - v1 * (2 / c1 * v1:Dot(ups[i]))
	local tL = tangents[i] - v1 * (2 / c1 * v1:Dot(tangents[i]))
	local v2 = tangents[i + 1] - tL
	local c2 = v2:Dot(v2)
	ups[i + 1] = c2 < 1e-12 and rL or (rL - v2 * (2 / c2 * v2:Dot(rL))).Unit
end
local cart = makePart(Vector3.new(1.6, 0.8, 2.4), points[0], Color3.fromRGB(226, 133, 26), { CanCollide = false })

RunService.Heartbeat:Connect(function()
	local i = math.floor((os.clock() * 50) % N)
	local pos = points[i] + ups[i] * 0.6
	cart.CFrame = CFrame.lookAt(pos, pos + tangents[i], ups[i])
end)`],

/* ===== Probability ===== */
'pr-weighted':['S','Click the chest to roll a weighted loot table. The result and its real percentage show above it.',`
local LOOT = { { "Common", 60 }, { "Uncommon", 25 }, { "Rare", 10 }, { "Legendary", 4 }, { "Mythic", 1 } }
local total = 0
for _, item in LOOT do total += item[2] end
local rng = Random.new()
local chest = makePart(Vector3.new(4, 3, 3), ORIGIN + Vector3.new(0, 1.5, 0), Color3.fromRGB(140, 90, 40))
local label = makeLabel(chest, "click me")
local click = Instance.new("ClickDetector")
click.Parent = chest

click.MouseClick:Connect(function(player)
	local pick = rng:NextNumber(0, total)
	for _, item in LOOT do
		pick -= item[2]
		if pick <= 0 then
			label.Text = string.format("%s: %s (%.0f%%)", player.Name, item[1], item[2] / total * 100)
			break
		end
	end
end)`],

'pr-atleast':['S','Click the block to try for a 5% drop. It counts your tries and shows the chance you had of getting it by then: 1 − 0.95^n.',`
local CHANCE = 0.05
local rng = Random.new()
local block = makePart(Vector3.new(4, 4, 4), ORIGIN + Vector3.new(0, 2, 0), Color3.fromRGB(163, 162, 165))
local label = makeLabel(block, "click to try (5% chance)")
local click = Instance.new("ClickDetector")
click.Parent = block
local tries = 0

click.MouseClick:Connect(function()
	tries += 1
	local chanceByNow = 1 - (1 - CHANCE) ^ tries
	if rng:NextNumber() < CHANCE then
		label.Text = string.format("GOT IT on try %d (%.0f%% of players have it by now)", tries, chanceByNow * 100)
		block.Color = Color3.fromRGB(250, 200, 40)
		tries = 0
	else
		label.Text = string.format("try %d: nothing (%.0f%% would have it by now)", tries, chanceByNow * 100)
		block.Color = Color3.fromRGB(163, 162, 165)
	end
end)
print("tries for a 50% chance:", math.ceil(math.log(0.5) / math.log(1 - CHANCE)))`],

'pr-dice':['S','Rolls 2d6 ten thousand times and builds a bar chart of the totals: the middle values come up most.',`
local rng = Random.new()
local counts = {}
for total = 2, 12 do counts[total] = 0 end
for _ = 1, 10000 do
	local total = rng:NextInteger(1, 6) + rng:NextInteger(1, 6)
	counts[total] += 1
end
for total = 2, 12 do
	local h = counts[total] / 10000 * 60
	local bar = makePart(Vector3.new(1.6, h, 1.6), ORIGIN + Vector3.new((total - 7) * 2, h / 2, 0), Color3.fromHSV(0.08, 0.7, 0.6 + h / 30))
	makeLabel(bar, string.format("%d: %.1f%%", total, counts[total] / 100))
end`],

'pr-spread':['S','A gun fires 40 bullets at a wall with bell-curve (gaussian) spread; marks show where they hit, bunched near the centre.',`
local rng = Random.new()
local function gaussian()
	local u1, u2 = 1 - rng:NextNumber(), rng:NextNumber()
	return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
end
local wall = makePart(Vector3.new(20, 16, 1), ORIGIN + Vector3.new(0, 8, -20), Color3.fromRGB(230, 230, 230))
local gun = makePart(Vector3.new(1, 1, 2), ORIGIN + Vector3.new(0, 8, 10), Color3.fromRGB(60, 60, 70))
local SPREAD = math.rad(3)
local params = RaycastParams.new()
params.FilterDescendantsInstances = { gun }

while true do
	for _ = 1, 40 do
		local shot = CFrame.lookAt(gun.Position, wall.Position) * CFrame.Angles(gaussian() * SPREAD, gaussian() * SPREAD, 0)
		local hit = workspace:Raycast(gun.Position, shot.LookVector * 100, params)
		if hit then
			local mark = makePart(Vector3.new(0.4, 0.4, 0.1), hit.Position, Color3.fromRGB(230, 60, 60), { CanCollide = false, CanQuery = false })
			task.delay(4, function() mark:Destroy() end)
		end
		task.wait(0.05)
	end
	task.wait(3)
end`],

'pr-shuffle':['S','A lamp changes colour every half second using a shuffle bag: every colour comes up once before any repeats.',`
local COLORS = { Color3.fromRGB(230, 60, 60), Color3.fromRGB(60, 200, 90), Color3.fromRGB(70, 130, 240), Color3.fromRGB(250, 200, 40) }
local rng = Random.new()
local bag = {}
local function nextColor()
	if #bag == 0 then
		for _, c in COLORS do table.insert(bag, c) end
		for i = #bag, 2, -1 do                           -- Fisher–Yates shuffle
			local j = rng:NextInteger(1, i)
			bag[i], bag[j] = bag[j], bag[i]
		end
	end
	return table.remove(bag)
end
local lamp = makePart(Vector3.new(4, 4, 4), ORIGIN + Vector3.new(0, 2, 0), COLORS[1], { Material = Enum.Material.Neon })
while true do
	lamp.Color = nextColor()
	task.wait(0.5)
end`],

'pr-ev':['S','Works out the expected value of a crate, then opens 10,000 simulated crates and prints the average and profit.',`
local REWARDS = { { amount = 10, chance = 0.73 }, { amount = 50, chance = 0.25 }, { amount = 500, chance = 0.02 } }
local PRICE = 30
local expected = 0
for _, r in REWARDS do expected += r.amount * r.chance end
local rng = Random.new()
local sum = 0
for _ = 1, 10000 do
	local roll = rng:NextNumber()
	for _, r in REWARDS do
		roll -= r.chance
		if roll <= 0 then sum += r.amount break end
	end
end
local crate = makePart(Vector3.new(4, 4, 4), ORIGIN + Vector3.new(0, 2, 0), Color3.fromRGB(140, 90, 40))
makeLabel(crate, string.format("EV %.1f, simulated %.1f, price %d", expected, sum / 10000, PRICE))
print("expected value:", expected, "simulated:", sum / 10000, "player profit per crate:", expected - PRICE)`],

'm-random':['S','Scatters 80 coins evenly inside a circle: random angle, and radius × math.sqrt(random) so they don\'t bunch in the middle.',`
local rng = Random.new()
local RADIUS = 16
for _ = 1, 80 do
	local angle = rng:NextNumber(0, 2 * math.pi)
	local r = RADIUS * math.sqrt(rng:NextNumber())
	makePart(Vector3.new(0.3, 1.5, 1.5), ORIGIN + Vector3.new(math.cos(angle) * r, 1, math.sin(angle) * r), Color3.fromRGB(250, 200, 40),
		{ Shape = Enum.PartType.Cylinder, Orientation = Vector3.new(0, 0, 90), Material = Enum.Material.Neon })
end`],

'pr-prd':['S','Click the dummy to attack. Crits use a rising chance (C × hits since the last crit), which averages 25% but never streaks badly.',`
local C = 0.0847                                    -- gives about 25% crits on average
local rng = Random.new()
local dummy = makePart(Vector3.new(3, 5, 2), ORIGIN + Vector3.new(0, 2.5, 0), Color3.fromRGB(163, 162, 165))
local label = makeLabel(dummy, "click to attack")
local click = Instance.new("ClickDetector")
click.Parent = dummy
local sinceCrit, hits, crits = 0, 0, 0

click.MouseClick:Connect(function()
	sinceCrit += 1
	hits += 1
	local chance = C * sinceCrit
	if rng:NextNumber() < chance then
		crits += 1
		sinceCrit = 0
		dummy.Color = Color3.fromRGB(250, 200, 40)
		label.Text = string.format("CRIT! (chance was %.0f%%)  %d/%d crits", chance * 100, crits, hits)
	else
		dummy.Color = Color3.fromRGB(163, 162, 165)
		label.Text = string.format("hit (crit chance %.0f%%)  %d/%d crits", chance * 100, crits, hits)
	end
end)`],

'pr-events':['S','Meteors fall at an average of 0.5 per second, rolled every frame with chance = 1 − exp(−rate × dt), so the rate is the same at any frame rate.',`
local RATE = 0.5
local rng = Random.new()
RunService.Heartbeat:Connect(function(dt)
	if rng:NextNumber() < 1 - math.exp(-RATE * dt) then
		local spot = ORIGIN + Vector3.new(rng:NextNumber(-20, 20), 0, rng:NextNumber(-20, 20))
		local meteor = makePart(Vector3.new(2, 2, 2), spot + Vector3.new(0, 60, 0), Color3.fromRGB(255, 120, 40),
			{ Shape = Enum.PartType.Ball, Material = Enum.Material.Neon, CanCollide = false })
		local tween = TweenService:Create(meteor, TweenInfo.new(1, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { Position = spot })
		tween:Play()
		tween.Completed:Connect(function()
			local boom = Instance.new("Explosion")
			boom.Position = spot
			boom.BlastPressure = 0
			boom.DestroyJointRadiusPercent = 0
			boom.Parent = workspace
			meteor:Destroy()
		end)
	end
end)`],

'pr-montecarlo':['S','Estimates π by throwing 20,000 random points into a square, and shows 400 of them (inside the circle in orange).',`
local rng = Random.new()
local inside = 0
local SIZE = 10
for i = 1, 20000 do
	local x, z = rng:NextNumber(-1, 1), rng:NextNumber(-1, 1)
	local hit = x * x + z * z <= 1
	if hit then inside += 1 end
	if i <= 400 then
		makePart(Vector3.new(0.3, 0.3, 0.3), ORIGIN + Vector3.new(x * SIZE, 0.2, z * SIZE), hit and Color3.fromRGB(226, 133, 26) or Color3.fromRGB(120, 120, 130), { CanCollide = false })
	end
end
local estimate = 4 * inside / 20000
local sign = makePart(Vector3.new(1, 1, 1), ORIGIN + Vector3.new(0, 3, 0), Color3.new(1, 1, 1))
makeLabel(sign, string.format("pi is about %.4f", estimate))
print("pi estimate:", estimate)`],

/* ===== Raycasting ===== */
'rc-basic':['S','A sweeping scanner fires a 40-stud ray each frame. The beam stops where it hits and the label shows the Instance name and Distance.',`
local scanner = makePart(Vector3.new(1.5, 1.5, 2), ORIGIN + Vector3.new(0, 3, 10), Color3.fromRGB(60, 60, 70))
makePart(Vector3.new(4, 6, 4), ORIGIN + Vector3.new(-6, 3, -6), Color3.fromRGB(140, 90, 40), { Name = "Crate" })
makePart(Vector3.new(12, 6, 1), ORIGIN + Vector3.new(4, 3, -14), Color3.fromRGB(90, 90, 100), { Name = "Wall" })
local beam = makeBeam(Color3.fromRGB(255, 60, 60))
local label = makeLabel(scanner)
local params = RaycastParams.new()
params.FilterDescendantsInstances = { scanner, beam }

RunService.Heartbeat:Connect(function()
	scanner.CFrame = CFrame.new(scanner.Position) * CFrame.Angles(0, math.sin(os.clock() * 0.6) * 0.9, 0)
	local origin, direction = scanner.Position, scanner.CFrame.LookVector * 40   -- direction AND range
	local result = workspace:Raycast(origin, direction, params)
	drawLine(beam, origin, result and result.Position or origin + direction)
	label.Text = result and string.format("hit %s at %.1f studs", result.Instance.Name, result.Distance) or "nil (nothing in 40 studs)"
end)`],

'rc-filter':['S','A laser behind a glass pane. The ray uses RaycastParams to Exclude the glass, so it hits the crate behind it.',`
local emitter = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN + Vector3.new(0, 3, 12), Color3.fromRGB(60, 60, 70))
local glass = makePart(Vector3.new(10, 8, 0.3), ORIGIN + Vector3.new(0, 4, 4), Color3.fromRGB(150, 200, 255), { Name = "Glass", Transparency = 0.6 })
local crate = makePart(Vector3.new(4, 6, 4), ORIGIN + Vector3.new(0, 3, -6), Color3.fromRGB(140, 90, 40), { Name = "Crate" })
local beam = makeBeam(Color3.fromRGB(255, 60, 60))
local label = makeLabel(emitter)
local params = RaycastParams.new()
params.FilterType = Enum.RaycastFilterType.Exclude
params.FilterDescendantsInstances = { emitter, beam, glass }    -- the ray passes through all of these

RunService.Heartbeat:Connect(function()
	local direction = (crate.Position - emitter.Position).Unit * 40
	local result = workspace:Raycast(emitter.Position, direction, params)
	drawLine(beam, emitter.Position, result and result.Position or emitter.Position + direction)
	label.Text = "hit: " .. (result and result.Instance.Name or "nothing")
end)`],

'rc-los':['S','A guard checks range, then its view cone, then a raycast for walls. It turns red only when it can really see you.',`
local RANGE, HALF_FOV = 40, math.rad(50)
local guard = makePart(Vector3.new(3, 5, 2), ORIGIN + Vector3.new(0, 2.5, 0), Color3.fromRGB(90, 160, 230))
makePart(Vector3.new(8, 8, 1), ORIGIN + Vector3.new(6, 4, -10), Color3.fromRGB(90, 90, 100))
makePart(Vector3.new(3, 3, 3), ORIGIN + Vector3.new(-6, 1.5, -8), Color3.fromRGB(140, 90, 40))
local label = makeLabel(guard)
local params = RaycastParams.new()

RunService.Heartbeat:Connect(function()
	guard.CFrame = CFrame.new(guard.Position) * CFrame.Angles(0, math.sin(os.clock() * 0.5) * 0.8, 0)
	local root = nearestRoot(guard.Position)
	local reason = "nobody here"
	if root then
		local offset = root.Position - guard.Position
		if offset.Magnitude > RANGE then
			reason = "too far"
		elseif guard.CFrame.LookVector:Dot(offset.Unit) < math.cos(HALF_FOV) then
			reason = "outside the cone"
		else
			params.FilterDescendantsInstances = { guard, root.Parent }
			reason = workspace:Raycast(guard.Position, offset, params) and "behind a wall" or "SPOTTED"
		end
	end
	guard.Color = reason == "SPOTTED" and Color3.fromRGB(230, 60, 60) or Color3.fromRGB(90, 160, 230)
	label.Text = reason
end)`],

'rc-mouse':['L','Click anywhere: a ray from the camera through the mouse (ViewportPointToRay) finds the spot and drops a block there, on your screen only.',`
local UserInputService = game:GetService("UserInputService")
local params = RaycastParams.new()

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed or input.UserInputType ~= Enum.UserInputType.MouseButton1 then return end
	local mouse = UserInputService:GetMouseLocation()
	local ray = camera:ViewportPointToRay(mouse.X, mouse.Y)
	params.FilterDescendantsInstances = { player.Character }
	local result = workspace:Raycast(ray.Origin, ray.Direction * 500, params)
	if result then
		makePart(Vector3.new(2, 2, 2), result.Position + result.Normal, Color3.fromHSV(math.random(), 0.6, 1))
	end
end)`],

'rc-surface':['S','Drops a sign onto random spots of a bumpy area: a ray down finds the ground, and the sign is stood on the surface Normal.',`
makePart(Vector3.new(16, 1, 12), ORIGIN + Vector3.new(-8, 2, 0), Color3.fromRGB(110, 150, 90), { Orientation = Vector3.new(0, 0, 20) })
makePart(Vector3.new(12, 1, 12), ORIGIN + Vector3.new(8, 2, 0), Color3.fromRGB(110, 150, 90), { Orientation = Vector3.new(-25, 0, 0) })
local sign = makePart(Vector3.new(2, 3, 0.4), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false })
local params = RaycastParams.new()
params.FilterDescendantsInstances = { sign }
local rng = Random.new()

while true do
	local top = ORIGIN + Vector3.new(rng:NextNumber(-14, 14), 30, rng:NextNumber(-6, 6))
	local result = workspace:Raycast(top, Vector3.new(0, -60, 0), params)
	if result then
		local up = result.Normal
		local forward = Vector3.new(0, 0, -1)
		forward = (forward - up * forward:Dot(up)).Unit             -- flatten onto the surface
		local pos = result.Position + up * 1.5
		sign.CFrame = CFrame.lookAt(pos, pos + forward, up)
	end
	task.wait(1)
end`],

'rc-pierce':['S','A railgun fires through up to 3 walls in a line. Each hit is excluded and the ray continues, losing 35% damage per wall.',`
local gun = makePart(Vector3.new(1.5, 1.5, 3), ORIGIN + Vector3.new(0, 3, 16), Color3.fromRGB(60, 60, 70))
for i = 1, 4 do makePart(Vector3.new(8, 6, 0.6), ORIGIN + Vector3.new(0, 3, 10 - i * 6), Color3.fromHSV(i / 5, 0.4, 0.8), { Name = "Wall" .. i }) end
local params = RaycastParams.new()
params.FilterType = Enum.RaycastFilterType.Exclude

while true do
	local ignore = { gun }
	local origin, direction, damage = gun.Position, Vector3.new(math.random(-10, 10) / 100, 0, -1).Unit * 100, 100
	for _ = 0, 3 do
		params.FilterDescendantsInstances = ignore
		local result = workspace:Raycast(origin, direction, params)
		if not result then break end
		local beam = makeBeam(Color3.fromRGB(255, 60, 60))
		drawLine(beam, origin, result.Position)
		local spark = makePart(Vector3.new(0.8, 0.8, 0.8), result.Position, Color3.fromRGB(250, 200, 40), { Shape = Enum.PartType.Ball, CanCollide = false })
		makeLabel(spark, string.format("%s: %.0f dmg", result.Instance.Name, damage))
		task.delay(1.5, function() beam:Destroy() spark:Destroy() end)
		damage *= 0.65
		table.insert(ignore, result.Instance)
		origin = result.Position
	end
	task.wait(2)
end`],

'rc-shapecast':['S','Two shots toward a narrow gap: a thin Raycast slips through, a radius-1.2 Spherecast clips a pillar.',`
makePart(Vector3.new(4, 6, 2), ORIGIN + Vector3.new(-2.8, 3, -4), Color3.fromRGB(90, 90, 100), { Name = "PillarL" })
makePart(Vector3.new(4, 6, 2), ORIGIN + Vector3.new(2.8, 3, -4), Color3.fromRGB(90, 90, 100), { Name = "PillarR" })
makePart(Vector3.new(16, 8, 1), ORIGIN + Vector3.new(0, 4, -16), Color3.fromRGB(140, 90, 40), { Name = "BackWall" })
local origin = ORIGIN + Vector3.new(0, 3, 10)
local direction = Vector3.new(0, 0, -40)
local ray = workspace:Raycast(origin, direction)
local sphere = workspace:Spherecast(origin, 1.2, direction)
local thin = makeBeam(Color3.fromRGB(120, 120, 130))
drawLine(thin, origin, ray and ray.Position or origin + direction)
local ball = makePart(Vector3.new(2.4, 2.4, 2.4), origin, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, Transparency = 0.5, CanCollide = false, CanQuery = false })
if sphere then ball.Position = origin + direction.Unit * sphere.Distance end
makeLabel(ball, string.format("Raycast: %s   Spherecast: %s", ray and ray.Instance.Name or "nil", sphere and sphere.Instance.Name or "nil"))`],

'rc-bounce':['S','A rotating emitter fires a laser that ricochets up to 6 times around a room: raycast, reflect off the Normal, repeat.',WALLS+`
makeRoom(16, 6)
makePart(Vector3.new(4, 6, 4), ORIGIN + Vector3.new(5, 3, -5), Color3.fromRGB(150, 80, 160), { Orientation = Vector3.new(0, 30, 0) })
local emitter = makePart(Vector3.new(1.5, 1.5, 2.5), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(60, 60, 70))
local beams = {}
for i = 1, 6 do beams[i] = makeBeam(Color3.fromRGB(255, 60, 60)) end
local params = RaycastParams.new()
params.FilterDescendantsInstances = { emitter, table.unpack(beams) }

RunService.Heartbeat:Connect(function()
	emitter.CFrame = CFrame.new(emitter.Position) * CFrame.Angles(0, os.clock() * 0.4, 0)
	local origin, direction = emitter.Position, emitter.CFrame.LookVector
	for i, beam in beams do beam.Transparency = 1 end
	for i = 1, 6 do
		local result = workspace:Raycast(origin, direction * 100, params)
		local hit = result and result.Position or origin + direction * 100
		drawLine(beams[i], origin, hit)
		beams[i].Transparency = 0
		if not result then break end
		local n = result.Normal
		direction = direction - 2 * direction:Dot(n) * n
		origin = result.Position + n * 0.01
	end
end)`],

'rc-overlap':['S','Every 3 seconds an explosion finds crates with GetPartBoundsInRadius, skips ones hidden behind the wall (raycast), and pushes the rest away.',`
local rng = Random.new()
local crates = {}
for i = 1, 14 do
	crates[i] = makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(rng:NextNumber(-12, 12), 1, rng:NextNumber(-12, 12)), Color3.fromRGB(140, 90, 40),
		{ Anchored = false, Name = "Crate" })
end
local wall = makePart(Vector3.new(1, 6, 10), ORIGIN + Vector3.new(4, 3, 0), Color3.fromRGB(90, 90, 100))
local center = ORIGIN + Vector3.new(0, 1, 0)
local RADIUS = 12
local overlap = OverlapParams.new()
overlap.FilterType = Enum.RaycastFilterType.Include
overlap.FilterDescendantsInstances = crates
local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Include
rayParams.FilterDescendantsInstances = { wall }

while true do
	task.wait(3)
	local boom = Instance.new("Explosion")
	boom.Position = center
	boom.BlastPressure = 0
	boom.DestroyJointRadiusPercent = 0
	boom.Parent = workspace
	for _, crate in workspace:GetPartBoundsInRadius(center, RADIUS, overlap) do
		local offset = crate.Position - center
		if not workspace:Raycast(center, offset, rayParams) then       -- nothing solid in between
			local strength = 1 - math.clamp(offset.Magnitude / RADIUS, 0, 1)
			crate:ApplyImpulse((offset.Unit + Vector3.new(0, 1, 0)) * strength * 120 * crate.AssemblyMass)
		end
	end
end`],

'rc-hover':['S','A hoverboard glides back and forth over ramps. Four rays down measure the ground; it floats at the average height and tilts with the average Normal.',`
makePart(Vector3.new(8, 1, 8), ORIGIN + Vector3.new(-8, 1, 0), Color3.fromRGB(110, 150, 90), { Orientation = Vector3.new(0, 0, 15) })
makePart(Vector3.new(6, 1, 8), ORIGIN + Vector3.new(2, 0.8, 0), Color3.fromRGB(110, 150, 90), { Orientation = Vector3.new(0, 0, -20) })
makePart(Vector3.new(8, 1, 8), ORIGIN + Vector3.new(11, 1.2, 0), Color3.fromRGB(110, 150, 90), { Orientation = Vector3.new(0, 0, 10) })
local board = makePart(Vector3.new(4, 0.4, 2), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(226, 133, 26), { CanCollide = false })
local params = RaycastParams.new()
params.FilterDescendantsInstances = { board }
local CORNERS = { Vector3.new(-1.8, 0, -0.9), Vector3.new(1.8, 0, -0.9), Vector3.new(-1.8, 0, 0.9), Vector3.new(1.8, 0, 0.9) }
local HOVER = 1.5

RunService.Heartbeat:Connect(function()
	local x = math.sin(os.clock() * 0.4) * 16
	local sumY, sumN, count = 0, Vector3.zero, 0
	for _, c in CORNERS do
		local origin = ORIGIN + Vector3.new(x + c.X, 10, c.Z)
		local result = workspace:Raycast(origin, Vector3.new(0, -20, 0), params)
		if result then
			sumY += result.Position.Y
			sumN += result.Normal
			count += 1
		end
	end
	if count == 0 then return end
	local up = (sumN / count).Unit
	local pos = Vector3.new(ORIGIN.X + x, sumY / count + HOVER, ORIGIN.Z)
	local forward = Vector3.xAxis - up * Vector3.xAxis:Dot(up)
	board.CFrame = CFrame.lookAt(pos, pos + forward.Unit, up)
end)`],

'rc-ccd':['S','A very fast bullet (200 studs/s) still stops at a thin wall, because each frame it raycasts from its last position to its new one.',`
local wall = makePart(Vector3.new(10, 8, 0.2), ORIGIN + Vector3.new(0, 4, -10), Color3.fromRGB(90, 90, 100))
local gun = makePart(Vector3.new(1, 1, 2), ORIGIN + Vector3.new(0, 4, 20), Color3.fromRGB(60, 60, 70))
local params = RaycastParams.new()
params.FilterDescendantsInstances = { gun }

while true do
	local bullet = makePart(Vector3.new(0.5, 0.5, 1.5), gun.Position, Color3.fromRGB(250, 200, 40), { CanCollide = false, CanQuery = false, Material = Enum.Material.Neon })
	local velocity = Vector3.new(0, 0, -200)
	local last = gun.Position
	while true do
		local dt = RunService.Heartbeat:Wait()
		local nextPos = last + velocity * dt
		local result = workspace:Raycast(last, nextPos - last, params)      -- the whole stretch, not just the end
		if result then
			bullet.Position = result.Position
			local mark = makePart(Vector3.new(0.6, 0.6, 0.1), result.Position, Color3.fromRGB(230, 60, 60), { CanCollide = false, CanQuery = false })
			task.delay(1, function() mark:Destroy() end)
			break
		end
		bullet.Position = nextPos
		last = nextPos
		if (last - gun.Position).Magnitude > 100 then break end
	end
	bullet:Destroy()
	task.wait(1)
end`],

/* ===== Bitwise ===== */
'bw-binary':['S','A row of 8 lamps shows a number counting up in binary, one bit per lamp (lit = 1).',`
local lamps = {}
for bit = 0, 7 do
	lamps[bit] = makePart(Vector3.new(1.6, 1.6, 1.6), ORIGIN + Vector3.new((3.5 - bit) * 2, 2, 0), Color3.fromRGB(60, 60, 70))
	makeLabel(lamps[bit], tostring(2 ^ bit))
end
local sign = makePart(Vector3.new(1, 1, 1), ORIGIN + Vector3.new(0, 6, 0), Color3.new(1, 1, 1), { Transparency = 1, CanCollide = false })
local label = makeLabel(sign)
local n = 0
while true do
	for bit = 0, 7 do
		local on = bit32.extract(n, bit) == 1
		lamps[bit].Color = on and Color3.fromRGB(226, 133, 26) or Color3.fromRGB(60, 60, 70)
		lamps[bit].Material = on and Enum.Material.Neon or Enum.Material.SmoothPlastic
	end
	label.Text = string.format("%d = 0x%02X", n, n)
	n = (n + 1) % 256
	task.wait(0.4)
end`],

'bw-flags':['S','Click the four buttons to flip status flags with bit32.bxor; the dummy reads them with bit32.btest.',`
local FLAGS = { Stunned = 1, OnFire = 2, Shielded = 4, Invisible = 8 }
local ORDER = { "Stunned", "OnFire", "Shielded", "Invisible" }
local dummy = makePart(Vector3.new(3, 5, 2), ORIGIN + Vector3.new(0, 2.5, 0), Color3.fromRGB(160, 160, 170))
local label = makeLabel(dummy)
local state = 0
local function refresh()
	dummy.Color = bit32.btest(state, FLAGS.OnFire) and Color3.fromRGB(255, 120, 30) or Color3.fromRGB(160, 160, 170)
	dummy.Material = bit32.btest(state, FLAGS.Shielded) and Enum.Material.ForceField or Enum.Material.SmoothPlastic
	dummy.Transparency = bit32.btest(state, FLAGS.Invisible) and 0.8 or 0
	label.Text = "state = " .. state
end
for i, name in ORDER do
	local button = makePart(Vector3.new(3, 1, 3), ORIGIN + Vector3.new(-6 + (i - 1) * 4, 0.5, 6), Color3.fromHSV(i / 5, 0.6, 0.9))
	makeLabel(button, name .. " = " .. FLAGS[name])
	local click = Instance.new("ClickDetector")
	click.Parent = button
	click.MouseClick:Connect(function()
		state = bit32.bxor(state, FLAGS[name])
		refresh()
	end)
end
refresh()`],

'bw-ops':['S','Prints AND, OR, XOR and NOT for two numbers in binary, and shows each result as a row of lamps.',`
local A, B = 0b11001010, 0b10101100
local function bits(n) local s = "" for i = 7, 0, -1 do s ..= bit32.extract(n, i) end return s end
local results = { { "A", A }, { "B", B }, { "band", bit32.band(A, B) }, { "bor", bit32.bor(A, B) }, { "bxor", bit32.bxor(A, B) }, { "bnot A", bit32.band(bit32.bnot(A), 0xFF) } }
for row, r in results do
	for bit = 0, 7 do
		local on = bit32.extract(r[2], bit) == 1
		makePart(Vector3.new(1.4, on and 1.4 or 0.4, 1.4), ORIGIN + Vector3.new((3.5 - bit) * 1.8, 1, (row - 3) * 2.4),
			on and Color3.fromRGB(226, 133, 26) or Color3.fromRGB(70, 70, 80))
	end
	local tag = makePart(Vector3.new(0.5, 0.5, 0.5), ORIGIN + Vector3.new(-9, 1, (row - 3) * 2.4), Color3.new(1, 1, 1), { Transparency = 1 })
	makeLabel(tag, r[1] .. " = " .. r[2])
	print(string.format("%-7s %s  (%d)", r[1], bits(r[2]), r[2]))
end`],

'bw-shift':['S','Packs two grid coordinates into one dictionary key with lshift/bor and unpacks them with rshift/band, then uses it as a key.',`
local function packKey(x, z) return bit32.bor(bit32.lshift(x, 16), z) end
local function unpackKey(key) return bit32.rshift(key, 16), bit32.band(key, 0xFFFF) end
local blocks = {}
for x = 1, 5 do
	for z = 1, 5 do
		local key = packKey(x, z)
		blocks[key] = makePart(Vector3.new(1.8, 0.5, 1.8), ORIGIN + Vector3.new(x * 2 - 6, 0.25, z * 2 - 6), Color3.fromHSV((x + z) / 12, 0.5, 0.9))
	end
end
local key = packKey(3, 4)
print("packed (3, 4) ->", key, "->", unpackKey(key))
blocks[key].Color = Color3.fromRGB(226, 133, 26)
makeLabel(blocks[key], "key " .. key .. " = (3, 4)")`],

'bw-pack':['S','A lamp\'s colour is stored as one packed 24-bit number (R << 16 | G << 8 | B) and unpacked with bit32.extract every frame.',`
local lamp = makePart(Vector3.new(4, 4, 4), ORIGIN + Vector3.new(0, 2, 0), Color3.new(1, 1, 1), { Material = Enum.Material.Neon })
local label = makeLabel(lamp)
RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local r = math.floor(127 + 127 * math.sin(t))
	local g = math.floor(127 + 127 * math.sin(t * 1.3 + 2))
	local b = math.floor(127 + 127 * math.sin(t * 0.7 + 4))
	local packed = bit32.bor(bit32.lshift(r, 16), bit32.lshift(g, 8), b)
	lamp.Color = Color3.fromRGB(bit32.extract(packed, 16, 8), bit32.extract(packed, 8, 8), bit32.extract(packed, 0, 8))
	label.Text = string.format("packed %d = #%06X", packed, packed)
end)`],

'bw-slots':['S','Sixteen inventory slots as bits. Click to take the first free slot (found with bit32.countrz of the free bits), right-click to empty a random one.',`
local used = 0
local slots = {}
for i = 0, 15 do
	slots[i] = makePart(Vector3.new(1.6, 1.6, 1.6), ORIGIN + Vector3.new((i - 7.5) * 2, 1, 0), Color3.fromRGB(70, 70, 80))
end
local button = makePart(Vector3.new(3, 1, 3), ORIGIN + Vector3.new(0, 0.5, 5), Color3.fromRGB(226, 133, 26))
local label = makeLabel(button, "click: take a slot / right-click: free one")
local click = Instance.new("ClickDetector")
click.Parent = button
local function redraw()
	for i = 0, 15 do slots[i].Color = bit32.btest(used, bit32.lshift(1, i)) and Color3.fromRGB(226, 133, 26) or Color3.fromRGB(70, 70, 80) end
end
local function firstFree()
	local free = bit32.band(bit32.bnot(used), 0xFFFF)
	if free == 0 then return nil end
	return bit32.countrz(free)
end
click.MouseClick:Connect(function()
	local slot = firstFree()
	if slot then used = bit32.bor(used, bit32.lshift(1, slot)) end
	label.Text = slot and ("took slot " .. slot) or "inventory full"
	redraw()
end)
click.RightMouseClick:Connect(function()
	used = bit32.band(used, bit32.bnot(bit32.lshift(1, math.random(0, 15))))
	redraw()
end)`],

'bw-autotile':['S','Builds a road network where each tile picks its shape from a 4-bit neighbour mask (N=1, E=2, S=4, W=8).',`
local MAP = {
	"..........",
	".########.",
	".#......#.",
	".#..#####.",
	".#..#..#..",
	".####..#..",
	"....#..#..",
	"....####..",
}
local CELL = 4
local function isRoad(x, z) return MAP[z] and MAP[z]:sub(x, x) == "#" end
for z = 1, #MAP do
	for x = 1, #MAP[1] do
		if isRoad(x, z) then
			local mask = 0
			if isRoad(x, z - 1) then mask = bit32.bor(mask, 1) end
			if isRoad(x + 1, z) then mask = bit32.bor(mask, 2) end
			if isRoad(x, z + 1) then mask = bit32.bor(mask, 4) end
			if isRoad(x - 1, z) then mask = bit32.bor(mask, 8) end
			local center = ORIGIN + Vector3.new(x * CELL - 20, 0.2, z * CELL - 16)
			local hub = makePart(Vector3.new(2, 0.4, 2), center, Color3.fromRGB(60, 60, 65))
			makeLabel(hub, tostring(mask))
			for _, arm in { { 1, Vector3.new(0, 0, -1) }, { 2, Vector3.new(1, 0, 0) }, { 4, Vector3.new(0, 0, 1) }, { 8, Vector3.new(-1, 0, 0) } } do
				if bit32.btest(mask, arm[1]) then
					local size = arm[2].X ~= 0 and Vector3.new(1, 0.4, 2) or Vector3.new(2, 0.4, 1)
					makePart(size, center + arm[2] * 1.5, Color3.fromRGB(60, 60, 65))
				end
			end
		end
	end
end`],

'bw-layers':['S','Defines collision layers and "can hit" masks, prints who can hit whom, and colours a 4 × 4 grid of blocks by the result.',`
local LAYER = { Players = 1, Enemies = 2, PlayerShots = 4, EnemyShots = 8 }
local NAMES = { "Players", "Enemies", "PlayerShots", "EnemyShots" }
local MASKS = { Players = 2 + 8, Enemies = 1 + 2 + 4, PlayerShots = 2, EnemyShots = 1 }
local function canHit(attacker, target) return bit32.btest(MASKS[attacker], LAYER[target]) end
for row, attacker in NAMES do
	for col, target in NAMES do
		local yes = canHit(attacker, target)
		makePart(Vector3.new(2, yes and 2 or 0.4, 2), ORIGIN + Vector3.new(col * 2.5 - 6, 1, row * 2.5 - 6),
			yes and Color3.fromRGB(226, 133, 26) or Color3.fromRGB(70, 70, 80))
		if yes then print(attacker, "can hit", target) end
	end
end`],

'bw-signed':['S','Prints how bit32 turns negative numbers into big unsigned ones (two\'s complement) and how to convert them back.',`
local function toSigned(u) if u >= 2 ^ 31 then return u - 2 ^ 32 end return u end
for _, n in { -1, -6, -128, 5, 300 } do
	local u = bit32.band(n, 0xFFFFFFFF)
	print(string.format("%5d -> unsigned %10d -> back to %5d   lowest 8 bits %3d", n, u, toSigned(u), bit32.band(n, 0xFF)))
end
print("bit32.bnot(5) =", bit32.bnot(5), "which is", toSigned(bit32.bnot(5)))
local sign = makePart(Vector3.new(1, 1, 1), ORIGIN + Vector3.new(0, 3, 0), Color3.new(1, 1, 1))
makeLabel(sign, "see the Output window")`],

'bw-morton':['S','Lights an 8 × 8 grid of tiles in Morton (Z-order) key order, so you can watch the zig-zag Z pattern.',`
local function part1by1(n)
	n = bit32.band(n, 0xFF)
	n = bit32.band(bit32.bor(n, bit32.lshift(n, 4)), 0x0F0F)
	n = bit32.band(bit32.bor(n, bit32.lshift(n, 2)), 0x3333)
	n = bit32.band(bit32.bor(n, bit32.lshift(n, 1)), 0x5555)
	return n
end
local function morton(x, z) return bit32.bor(part1by1(x), bit32.lshift(part1by1(z), 1)) end
local tiles = {}
for x = 0, 7 do
	for z = 0, 7 do
		tiles[morton(x, z)] = makePart(Vector3.new(1.8, 0.4, 1.8), ORIGIN + Vector3.new(x * 2 - 7, 0.2, z * 2 - 7), Color3.fromRGB(70, 70, 80))
	end
end
while true do
	for key = 0, 63 do
		tiles[key].Color = Color3.fromHSV(key / 64, 0.7, 1)
		task.wait(0.08)
	end
	task.wait(1)
	for key = 0, 63 do tiles[key].Color = Color3.fromRGB(70, 70, 80) end
end`],
});
})();
