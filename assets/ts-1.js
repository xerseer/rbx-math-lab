(function(){
"use strict";
Lab.ts({
/* ===== Vector3 basics ===== */
'vec-new':['S','A marker placed by a Vector3, with a line from the origin and its X, Y, Z and Magnitude shown above it.',`
local v = Vector3.new(6, 4, -3)
makePart(Vector3.new(0.8, 0.8, 0.8), ORIGIN, Color3.new(1, 1, 1))        -- the origin
local marker = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN + v, Color3.fromRGB(226, 133, 26))
drawLine(makeBeam(), ORIGIN, ORIGIN + v)
makeLabel(marker, string.format("v = (%g, %g, %g)   Magnitude %.2f", v.X, v.Y, v.Z, v.Magnitude))
print(v.X, v.Y, v.Z, v.Magnitude)`],

'vec-sub':['S','Point B circles around point A. The beam is B − A, labelled with its length (the distance).',`
local A = ORIGIN + Vector3.new(0, 2, 0)
local a = makePart(Vector3.new(1.5, 1.5, 1.5), A, Color3.fromRGB(18, 147, 154))
local b = makePart(Vector3.new(1.5, 1.5, 1.5), A, Color3.fromRGB(194, 65, 142))
local beam = makeBeam()
local label = makeLabel(a)

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	b.Position = A + Vector3.new(math.cos(t) * 10, 3 + math.sin(t * 2) * 2, math.sin(t) * 10)
	local offset = b.Position - a.Position              -- the arrow from A to B
	drawLine(beam, a.Position, a.Position + offset)
	label.Text = string.format("B - A = (%.1f, %.1f, %.1f)   distance %.1f", offset.X, offset.Y, offset.Z, offset.Magnitude)
end)`],

'vec-scale':['S','An arrow is scaled by a number that swings from −1.5 to 2 (negative flips it), plus its flattened shadow (Y removed).',`
local v = Vector3.new(6, 4, -2)
local base = ORIGIN + Vector3.new(0, 0.5, 0)
local arrow, shadow = makeBeam(), makeBeam(Color3.fromRGB(194, 65, 142))
local tip = makePart(Vector3.new(1, 1, 1), base, Color3.fromRGB(226, 133, 26))
local label = makeLabel(tip)

RunService.Heartbeat:Connect(function()
	local s = 0.25 + 1.75 * math.sin(os.clock())           -- from -1.5 to 2
	local scaled = v * s
	drawLine(arrow, base, base + scaled)
	drawLine(shadow, base, base + scaled * Vector3.new(1, 0, 1))   -- flatten: keep X and Z
	tip.Position = base + scaled
	label.Text = string.format("v * %.2f   length %.1f", s, scaled.Magnitude)
end)`],

'vec-mag':['S','A tower with a 20-stud range. It turns red and shows the distance when a player is inside the range.',`
local RANGE = 20
local tower = makePart(Vector3.new(3, 8, 3), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(90, 160, 230))
local ring = makePart(Vector3.new(0.2, RANGE * 2, RANGE * 2), ORIGIN + Vector3.new(0, 0.1, 0), Color3.fromRGB(226, 133, 26),
	{ Shape = Enum.PartType.Cylinder, Transparency = 0.8, CanCollide = false, Orientation = Vector3.new(0, 0, 90) })
local label = makeLabel(tower)

RunService.Heartbeat:Connect(function()
	local root = nearestRoot(tower.Position)
	if not root then label.Text = "no players" return end
	local distance = ((root.Position - tower.Position) * Vector3.new(1, 0, 1)).Magnitude   -- ignore height
	local inRange = distance <= RANGE
	tower.Color = inRange and Color3.fromRGB(230, 60, 60) or Color3.fromRGB(90, 160, 230)
	label.Text = string.format("%.1f studs  %s", distance, inRange and "IN RANGE" or "")
end)`],

'vec-unit':['S','A turret fires a ball at the nearest player once a second. The velocity is direction.Unit × speed, so every shot flies at the same speed.',`
local SPEED = 40
local gun = makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(60, 60, 70))

while true do
	local root = nearestRoot(gun.Position, 80)
	if root then
		local direction = (root.Position - gun.Position).Unit      -- length 1: direction only
		local velocity = direction * SPEED
		local ball = makePart(Vector3.new(0.8, 0.8, 0.8), gun.Position, Color3.fromRGB(226, 133, 26),
			{ Shape = Enum.PartType.Ball, CanCollide = false, Material = Enum.Material.Neon })
		task.spawn(function()
			local start = os.clock()
			while os.clock() - start < 2 do
				ball.Position += velocity * RunService.Heartbeat:Wait()
			end
			ball:Destroy()
		end)
	end
	task.wait(1)
end`],

'vec-lerp':['S','A marker slides between two posts with A:Lerp(B, alpha), alpha going 0 → 1 → 0.',`
local A, B = ORIGIN + Vector3.new(-10, 2, 0), ORIGIN + Vector3.new(10, 6, -4)
makePart(Vector3.new(1, 4, 1), A - Vector3.new(0, 1.5, 0), Color3.fromRGB(18, 147, 154))
makePart(Vector3.new(1, 4, 1), B - Vector3.new(0, 1.5, 0), Color3.fromRGB(194, 65, 142))
local marker = makePart(Vector3.new(1.5, 1.5, 1.5), A, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball })
local label = makeLabel(marker)

RunService.Heartbeat:Connect(function()
	local alpha = 0.5 - 0.5 * math.cos(os.clock())
	marker.Position = A:Lerp(B, alpha)
	label.Text = string.format("A:Lerp(B, %.2f)", alpha)
end)`],

'vec-moveto':['S','A platform visits waypoints at a fixed speed. The step is capped at the remaining distance, so it stops exactly on each point.',`
local SPEED = 10
local points = { Vector3.new(-12, 2, 0), Vector3.new(0, 6, -8), Vector3.new(12, 2, 0), Vector3.new(0, 2, 8) }
for _, p in points do makePart(Vector3.new(1, 1, 1), ORIGIN + p, Color3.fromRGB(194, 65, 142), { CanCollide = false }) end
local platform = makePart(Vector3.new(4, 1, 4), ORIGIN + points[1], Color3.fromRGB(226, 133, 26))

local function moveTowards(current, goal, maxStep)
	local offset = goal - current
	if offset.Magnitude <= maxStep then return goal end
	return current + offset.Unit * maxStep
end

local index = 2
RunService.Heartbeat:Connect(function(dt)
	local goal = ORIGIN + points[index]
	platform.Position = moveTowards(platform.Position, goal, SPEED * dt)
	if platform.Position == goal then                 -- exact, because moveTowards snaps
		index = index % #points + 1
	end
end)`],

'vec-bounds':['S','Six parts drift around. A see-through box built from Min and Max always wraps all of them.',`
local rng = Random.new()
local parts, homes = {}, {}
for i = 1, 6 do
	homes[i] = ORIGIN + Vector3.new(rng:NextNumber(-10, 10), rng:NextNumber(2, 8), rng:NextNumber(-8, 8))
	parts[i] = makePart(Vector3.new(1.2, 1.2, 1.2), homes[i], Color3.fromHSV(i / 6, 0.6, 1))
end
local box = makePart(Vector3.one, ORIGIN, Color3.fromRGB(226, 133, 26), { Transparency = 0.8, CanCollide = false })
local label = makeLabel(box)

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local lo, hi = Vector3.new(math.huge, math.huge, math.huge), Vector3.new(-math.huge, -math.huge, -math.huge)
	for i, p in parts do
		p.Position = homes[i] + Vector3.new(math.sin(t + i) * 3, math.cos(t * 1.3 + i) * 2, math.sin(t * 0.7 + i * 2) * 3)
		lo = lo:Min(p.Position)
		hi = hi:Max(p.Position)
	end
	box.Size = hi - lo + Vector3.new(1.2, 1.2, 1.2)
	box.Position = (lo + hi) / 2
	label.Text = string.format("size %.1f x %.1f x %.1f", box.Size.X, box.Size.Y, box.Size.Z)
end)`],

'vec-avg':['S','A marker floats at the average position of every player plus three dummies: the centre of the group.',`
local dummies = {}
for i = 1, 3 do
	dummies[i] = makePart(Vector3.new(2, 4, 2), ORIGIN + Vector3.new(0, 2, 0), Color3.fromRGB(18, 147, 154))
end
local centre = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(226, 133, 26),
	{ Shape = Enum.PartType.Ball, CanCollide = false, Material = Enum.Material.Neon })
local label = makeLabel(centre, "centre")

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local sum, count = Vector3.zero, 0
	for i, d in dummies do
		local a = t * 0.4 + i * 2.1
		d.Position = ORIGIN + Vector3.new(math.cos(a) * 12, 2, math.sin(a * 1.3) * 10)
		sum += d.Position
		count += 1
	end
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then sum += root.Position; count += 1 end
	end
	centre.Position = sum / count + Vector3.new(0, 4, 0)
	label.Text = "centre of " .. count
end)`],

'vec-physics':['S','Balls are launched with your own gravity maths (velocity += g·dt, position += velocity·dt). A red marker shows where the formula predicts each one lands.',`
local g = Vector3.new(0, -workspace.Gravity, 0)
local start = ORIGIN + Vector3.new(-20, 1, 0)
makePart(Vector3.new(2, 2, 2), start, Color3.fromRGB(60, 60, 70))
local rng = Random.new()

while true do
	local angle, speed = math.rad(rng:NextNumber(30, 65)), rng:NextNumber(55, 75)
	local v0 = Vector3.new(math.cos(angle) * speed, math.sin(angle) * speed, 0)
	local flightTime = 2 * v0.Y / workspace.Gravity
	local landing = start + Vector3.new(v0.X * flightTime, 0, 0)
	local marker = makePart(Vector3.new(0.3, 4, 4), landing, Color3.fromRGB(230, 60, 60),
		{ Shape = Enum.PartType.Cylinder, Orientation = Vector3.new(0, 0, 90), CanCollide = false })
	local ball = makePart(Vector3.new(1, 1, 1), start, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false })
	local velocity, position, t = v0, start, 0
	while t < flightTime do
		local dt = RunService.Heartbeat:Wait()
		t += dt
		velocity += g * dt
		position += velocity * dt
		ball.Position = position
	end
	task.wait(0.5)
	ball:Destroy()
	marker:Destroy()
end`],

'vec-sphere':['S','150 small balls placed evenly on a sphere with the Fibonacci (golden angle) method.',`
local COUNT, RADIUS = 150, 10
local CENTER = ORIGIN + Vector3.new(0, 12, 0)
local GOLDEN_ANGLE = math.pi * (3 - math.sqrt(5))
for i = 0, COUNT - 1 do
	local y = 1 - 2 * (i + 0.5) / COUNT
	local r = math.sqrt(1 - y * y)
	local a = i * GOLDEN_ANGLE
	local direction = Vector3.new(math.cos(a) * r, y, math.sin(a) * r)
	makePart(Vector3.new(0.6, 0.6, 0.6), CENTER + direction * RADIUS, Color3.fromHSV(i / COUNT, 0.6, 1),
		{ Shape = Enum.PartType.Ball, CanCollide = false, Material = Enum.Material.Neon })
end`],

/* ===== Vector maths ===== */
'vec-dot':['S','A guard facing −Z shows the dot product between its LookVector and the direction to you, and turns red when you are inside its 90° cone.',`
local guard = makePart(Vector3.new(3, 5, 2), ORIGIN + Vector3.new(0, 2.5, 0), Color3.fromRGB(90, 160, 230))
makePart(Vector3.new(2.4, 0.6, 0.3), guard.Position + Vector3.new(0, 1.5, -1.1), Color3.new(1, 1, 1), { Material = Enum.Material.Neon })   -- face
local label = makeLabel(guard)

RunService.Heartbeat:Connect(function()
	local root = nearestRoot(guard.Position)
	if not root then return end
	local toTarget = (root.Position - guard.Position).Unit
	local dot = guard.CFrame.LookVector:Dot(toTarget)
	local inView = dot > math.cos(math.rad(45))
	guard.Color = inView and Color3.fromRGB(230, 60, 60) or Color3.fromRGB(90, 160, 230)
	label.Text = string.format("dot = %.2f  %s", dot, inView and "SEES YOU" or "")
end)`],

'vec-cross':['S','A block tells you whether you are on its left or its right, from the sign of LookVector:Cross(toTarget).Y.',`
local block = makePart(Vector3.new(3, 3, 4), ORIGIN + Vector3.new(0, 1.5, 0), Color3.fromRGB(163, 162, 165))
makePart(Vector3.new(2.6, 0.5, 0.3), block.Position + Vector3.new(0, 0.8, -2.1), Color3.new(1, 1, 1), { Material = Enum.Material.Neon })
local label = makeLabel(block)

RunService.Heartbeat:Connect(function()
	local root = nearestRoot(block.Position)
	if not root then return end
	local toTarget = (root.Position - block.Position).Unit
	local side = block.CFrame.LookVector:Cross(toTarget).Y
	label.Text = side > 0.05 and "you are on my LEFT" or side < -0.05 and "you are on my RIGHT" or "straight ahead / behind"
	block.Color = side > 0 and Color3.fromRGB(18, 147, 154) or Color3.fromRGB(194, 65, 142)
end)`],

'vec-project':['S','A ball bounces around a box of walls but slides along them instead of stopping: the part of its velocity going into the wall is removed (projection).',`
local SIZE = 16
for _, w in { {Vector3.new(SIZE * 2, 4, 1), Vector3.new(0, 2, -SIZE)}, {Vector3.new(SIZE * 2, 4, 1), Vector3.new(0, 2, SIZE)},
              {Vector3.new(1, 4, SIZE * 2), Vector3.new(-SIZE, 2, 0)}, {Vector3.new(1, 4, SIZE * 2), Vector3.new(SIZE, 2, 0)} } do
	makePart(w[1], ORIGIN + w[2], Color3.fromRGB(90, 90, 100))
end
local ball = makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(0, 1.5, 0), Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, CanCollide = false })
local params = RaycastParams.new()
params.FilterDescendantsInstances = { ball }
local steer = 0

RunService.Heartbeat:Connect(function(dt)
	steer += dt * 0.5
	local move = Vector3.new(math.cos(steer), 0, math.sin(steer * 0.7)).Unit * 12 * dt   -- wanted move
	local result = workspace:Raycast(ball.Position, move.Unit * (1.1 + move.Magnitude), params)
	if result then
		local n = result.Normal
		move = move - n * math.min(0, move:Dot(n))      -- remove only the part going INTO the wall
	end
	ball.Position += move
end)`],

'vec-angle':['S','A turret turns toward you at most 90° per second, using the signed angle look:Angle(toTarget, Vector3.yAxis).',`
local MAX_TURN = math.rad(90)
local turret = makePart(Vector3.new(3, 2, 5), ORIGIN + Vector3.new(0, 1, 0), Color3.fromRGB(226, 133, 26))
local barrel = makePart(Vector3.new(0.6, 0.6, 3), turret.Position, Color3.fromRGB(60, 60, 70))
local label = makeLabel(turret)

RunService.Heartbeat:Connect(function(dt)
	barrel.CFrame = turret.CFrame * CFrame.new(0, 0.6, -3.5)
	local root = nearestRoot(turret.Position)
	if not root then return end
	local look = turret.CFrame.LookVector
	local toTarget = (root.Position - turret.Position) * Vector3.new(1, 0, 1)
	if toTarget.Magnitude < 0.01 then return end
	local angle = look:Angle(toTarget, Vector3.yAxis)        -- signed: + is to the left
	local step = math.clamp(angle, -MAX_TURN * dt, MAX_TURN * dt)
	turret.CFrame = turret.CFrame * CFrame.Angles(0, step, 0)
	label.Text = string.format("%.0f degrees to go", math.deg(angle))
end)`],

'vec-rotate':['S','A spread of 8 beams fans out around a slowly turning aim direction, each made by rotating the aim with CFrame.fromAxisAngle.',`
local origin = ORIGIN + Vector3.new(0, 4, 0)
makePart(Vector3.new(1.5, 1.5, 1.5), origin, Color3.fromRGB(60, 60, 70))
local beams = {}
for i = 1, 8 do beams[i] = makeBeam(Color3.fromHSV(i / 8, 0.7, 1)) end

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local aim = Vector3.new(math.sin(t * 0.5), 0.15, -math.cos(t * 0.5)).Unit
	local side = aim:Cross(Vector3.yAxis).Unit
	local tilted = CFrame.fromAxisAngle(side, math.rad(8)):VectorToWorldSpace(aim)   -- 8 degrees off the aim
	for i, beam in beams do
		local around = CFrame.fromAxisAngle(aim, (i - 1) / 8 * math.pi * 2)              -- spin around the aim
		local direction = around:VectorToWorldSpace(tilted)
		drawLine(beam, origin, origin + direction * 25)
	end
end)`],

'vec-closest':['S','A laser runs between two emitters. Anyone within 2 studs of the line (closest point on a segment) is "zapped": the beam turns red.',`
local A, B = ORIGIN + Vector3.new(-14, 3, -4), ORIGIN + Vector3.new(14, 3, 4)
makePart(Vector3.new(1.5, 6, 1.5), A - Vector3.new(0, 0, 0), Color3.fromRGB(60, 60, 70))
makePart(Vector3.new(1.5, 6, 1.5), B, Color3.fromRGB(60, 60, 70))
local beam = makeBeam(Color3.fromRGB(60, 220, 100))
drawLine(beam, A, B)
local dot = makePart(Vector3.new(0.8, 0.8, 0.8), A, Color3.new(1, 1, 1), { Shape = Enum.PartType.Ball, CanCollide = false })
local label = makeLabel(dot)
local dir, length = (B - A).Unit, (B - A).Magnitude

RunService.Heartbeat:Connect(function()
	local root = nearestRoot(A)
	if not root then return end
	local t = math.clamp((root.Position - A):Dot(dir), 0, length)
	local closest = A + dir * t
	local distance = (root.Position - closest).Magnitude
	dot.Position = closest
	local zapped = distance < 2
	beam.Color = zapped and Color3.fromRGB(255, 40, 40) or Color3.fromRGB(60, 220, 100)
	label.Text = string.format("%.1f studs from the laser%s", distance, zapped and "  ZAP" or "")
end)`],

'vec-plane':['S','A finish gate. Each time a player crosses it front-to-back the sign of (pos − gate):Dot(normal) flips and a lap is counted.',`
local gate = makePart(Vector3.new(14, 10, 0.4), ORIGIN + Vector3.new(0, 5, 0), Color3.fromRGB(226, 133, 26),
	{ Transparency = 0.6, CanCollide = false })
local label = makeLabel(gate, "run through me")
local lastSide, laps = {}, {}

RunService.Heartbeat:Connect(function()
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local rel = gate.CFrame:PointToObjectSpace(root.Position)
			local d = (root.Position - gate.Position):Dot(gate.CFrame.LookVector)   -- signed distance
			local withinGate = math.abs(rel.X) < 7 and math.abs(rel.Y) < 5
			if lastSide[player] and lastSide[player] < 0 and d >= 0 and withinGate then
				laps[player] = (laps[player] or 0) + 1
				label.Text = player.Name .. ": lap " .. laps[player]
			end
			lastSide[player] = d
		end
	end
end)`],

'vec-basis':['S','An arrow flies along a curvy path and always points the way it is moving, by building its CFrame from velocity with CFrame.fromMatrix.',`
local arrow = makePart(Vector3.new(0.6, 0.6, 4), ORIGIN, Color3.fromRGB(226, 133, 26))
local fin = makePart(Vector3.new(1.6, 0.2, 1), ORIGIN, Color3.fromRGB(18, 147, 154))
local function pathAt(t)
	return ORIGIN + Vector3.new(math.sin(t) * 14, 6 + math.sin(t * 2) * 4, math.cos(t * 0.7) * 10)
end

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local pos, ahead = pathAt(t), pathAt(t + 0.01)
	local look = (ahead - pos).Unit
	local right = look:Cross(Vector3.yAxis).Unit
	local up = right:Cross(look)
	local cf = CFrame.fromMatrix(pos, right, up)              -- LookVector = look
	arrow.CFrame = cf
	fin.CFrame = cf * CFrame.new(0, 0.4, 1.6)                -- a fin on top, at the back
end)`],

'vec-reflect':['S','A ball bounces around a room using its own maths: raycast ahead, and if it hits, reflect the direction with d − 2(d·n)n.',`
local SIZE = 14
for _, w in { {Vector3.new(SIZE * 2, 6, 1), Vector3.new(0, 3, -SIZE)}, {Vector3.new(SIZE * 2, 6, 1), Vector3.new(0, 3, SIZE)},
              {Vector3.new(1, 6, SIZE * 2), Vector3.new(-SIZE, 3, 0)}, {Vector3.new(1, 6, SIZE * 2), Vector3.new(SIZE, 3, 0)} } do
	makePart(w[1], ORIGIN + w[2], Color3.fromRGB(90, 90, 100))
end
makePart(Vector3.new(4, 6, 4), ORIGIN + Vector3.new(3, 3, -2), Color3.fromRGB(150, 80, 160), { Orientation = Vector3.new(0, 35, 0) })
local ball = makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN + Vector3.new(-6, 2, 4), Color3.fromRGB(226, 133, 26),
	{ Shape = Enum.PartType.Ball, CanCollide = false, Material = Enum.Material.Neon })
local params = RaycastParams.new()
params.FilterDescendantsInstances = { ball }
local direction = Vector3.new(1, 0, 0.6).Unit
local SPEED = 18

RunService.Heartbeat:Connect(function(dt)
	local step = SPEED * dt
	local result = workspace:Raycast(ball.Position, direction * (step + 0.75), params)
	if result then
		local n = result.Normal
		direction = direction - 2 * direction:Dot(n) * n      -- bounce
	end
	ball.Position += direction * step
end)`],

'vec-lead':['S','A turret leads moving players: it solves the intercept time from your velocity and fires where you will be.',`
local BULLET_SPEED = 60
local gun = makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(60, 60, 70))

local function interceptTime(shooter, targetPos, targetVel, speed)
	local d = targetPos - shooter
	local a = targetVel:Dot(targetVel) - speed * speed
	local b = 2 * d:Dot(targetVel)
	local c = d:Dot(d)
	if math.abs(a) < 1e-6 then return c > 0 and -c / b or nil end
	local disc = b * b - 4 * a * c
	if disc < 0 then return nil end
	local r = math.sqrt(disc)
	local t1, t2 = (-b - r) / (2 * a), (-b + r) / (2 * a)
	local t = math.min(t1, t2) > 0 and math.min(t1, t2) or math.max(t1, t2)
	return t > 0 and t or nil
end

while true do
	local root = nearestRoot(gun.Position, 100)
	if root then
		local t = interceptTime(gun.Position, root.Position, root.AssemblyLinearVelocity, BULLET_SPEED)
		if t then
			local aim = root.Position + root.AssemblyLinearVelocity * t
			local velocity = (aim - gun.Position).Unit * BULLET_SPEED
			local bullet = makePart(Vector3.new(0.6, 0.6, 0.6), gun.Position, Color3.fromRGB(226, 133, 26),
				{ Shape = Enum.PartType.Ball, CanCollide = false, Material = Enum.Material.Neon })
			task.spawn(function()
				local elapsed = 0
				while elapsed < t + 0.3 do
					local dt = RunService.Heartbeat:Wait()
					elapsed += dt
					bullet.Position += velocity * dt
				end
				bullet:Destroy()
			end)
		end
	end
	task.wait(0.8)
end`],

'vec-steer':['S','A seeker chases the nearest player with steering: desired velocity minus current velocity, limited to a maximum force, so it curves and slows near you.',`
local MAX_SPEED, MAX_FORCE, SLOW_RADIUS = 20, 25, 8
local seeker = makePart(Vector3.new(1.5, 1.5, 3), ORIGIN + Vector3.new(0, 2, 0), Color3.fromRGB(226, 133, 26), { CanCollide = false })
local velocity = Vector3.zero

RunService.Heartbeat:Connect(function(dt)
	local root = nearestRoot(seeker.Position)
	if not root then return end
	local offset = (root.Position - seeker.Position) * Vector3.new(1, 0, 1)
	local distance = offset.Magnitude
	if distance < 0.1 then return end
	local speed = distance < SLOW_RADIUS and MAX_SPEED * distance / SLOW_RADIUS or MAX_SPEED   -- arrive
	local desired = offset / distance * speed
	local steer = desired - velocity
	if steer.Magnitude > MAX_FORCE then steer = steer.Unit * MAX_FORCE end
	velocity += steer * dt
	local pos = seeker.Position + velocity * dt
	if velocity.Magnitude > 0.1 then
		seeker.CFrame = CFrame.lookAt(pos, pos + velocity)
	end
end)`],

'vec-swing':['S','A ramp tilts back and forth; a block on it is stood up along the surface normal using the shortest rotation between two vectors.',`
local ramp = makePart(Vector3.new(14, 1, 14), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(90, 90, 100))
local block = makePart(Vector3.new(2, 3, 2), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false })

local function rotationBetween(a, b)
	local axis = a:Cross(b)
	local angle = math.acos(math.clamp(a:Dot(b), -1, 1))
	if axis.Magnitude < 1e-6 then return CFrame.identity end
	return CFrame.fromAxisAngle(axis.Unit, angle)
end

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	ramp.CFrame = CFrame.new(ramp.Position) * CFrame.Angles(math.sin(t) * 0.5, 0, math.cos(t * 0.7) * 0.5)
	local normal = ramp.CFrame.UpVector
	local turn = rotationBetween(Vector3.yAxis, normal)          -- world up → surface normal
	block.CFrame = CFrame.new(ramp.Position + normal * 2) * turn
end)`],

/* ===== CFrame ===== */
'cf-intro':['S','A part turns and tilts; the label shows its Position and LookVector, read straight from its CFrame.',`
local part = makePart(Vector3.new(2, 1, 4), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(226, 133, 26))
local face = makePart(Vector3.new(1.6, 0.6, 0.2), ORIGIN, Color3.fromRGB(47, 111, 214))
local label = makeLabel(part)

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	part.CFrame = CFrame.new(ORIGIN + Vector3.new(0, 4, 0)) * CFrame.Angles(0, t * 0.6, 0) * CFrame.Angles(math.sin(t) * 0.4, 0, 0)
	face.CFrame = part.CFrame * CFrame.new(0, 0, -2.1)        -- the front face (-Z)
	local look = part.CFrame.LookVector
	label.Text = string.format("LookVector (%.2f, %.2f, %.2f)", look.X, look.Y, look.Z)
end)`],

'cf-angles':['S','Three coins spin around Y, X and Z at 90° per second with CFrame.Angles(math.rad(90) * dt ...).',`
local coins = {}
for i, axis in { "Y", "X", "Z" } do
	local coin = makePart(Vector3.new(0.4, 3, 3), ORIGIN + Vector3.new((i - 2) * 6, 4, 0), Color3.fromRGB(250, 200, 40),
		{ Shape = Enum.PartType.Cylinder, Material = Enum.Material.Neon })
	makeLabel(coin, "around " .. axis)
	coins[axis] = coin
end
local rate = math.rad(90)                    -- radians per second

RunService.Heartbeat:Connect(function(dt)
	coins.Y.CFrame *= CFrame.Angles(0, rate * dt, 0)
	coins.X.CFrame *= CFrame.Angles(rate * dt, 0, 0)
	coins.Z.CFrame *= CFrame.Angles(0, 0, rate * dt)
end)`],

'cf-lookat':['S','Two turrets track the nearest player: one aims fully with CFrame.lookAt, the other only turns left/right (target height flattened).',`
local full = makePart(Vector3.new(2, 2, 4), ORIGIN + Vector3.new(-5, 3, 0), Color3.fromRGB(226, 133, 26))
local flat = makePart(Vector3.new(2, 2, 4), ORIGIN + Vector3.new(5, 3, 0), Color3.fromRGB(18, 147, 154))
makeLabel(full, "full aim")
makeLabel(flat, "turn only")

RunService.Heartbeat:Connect(function()
	local root = nearestRoot(ORIGIN)
	if not root then return end
	local target = root.Position
	full.CFrame = CFrame.lookAt(full.Position, target)
	flat.CFrame = CFrame.lookAt(flat.Position, Vector3.new(target.X, flat.Position.Y, target.Z))
end)`],

'cf-offset':['S','Every player gets a glowing shield floating 5 studs in front of them: root.CFrame * CFrame.new(0, 0, -5).',`
local shields = {}
RunService.Heartbeat:Connect(function()
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		local shield = shields[player]
		if root then
			if not shield then
				shield = makePart(Vector3.new(5, 5, 0.4), root.Position, Color3.fromRGB(90, 160, 255),
					{ Material = Enum.Material.ForceField, CanCollide = false, CanQuery = false })
				shields[player] = shield
			end
			shield.CFrame = root.CFrame * CFrame.new(0, 0, -5)    -- in front, wherever they face
		end
	end
end)
Players.PlayerRemoving:Connect(function(player)
	if shields[player] then shields[player]:Destroy() shields[player] = nil end
end)`],

'cf-order':['S','Two moons with the same pieces in a different order: Angles then offset = orbit; offset then Angles = spin in place.',`
local left = makePart(Vector3.new(1, 1, 1), ORIGIN + Vector3.new(-8, 4, 0), Color3.fromRGB(18, 147, 154))
local right = makePart(Vector3.new(1, 1, 1), ORIGIN + Vector3.new(8, 4, 0), Color3.fromRGB(194, 65, 142))
local moonA = makePart(Vector3.new(1.4, 1.4, 2.4), left.Position, Color3.fromRGB(226, 133, 26))
local moonB = makePart(Vector3.new(1.4, 1.4, 2.4), right.Position, Color3.fromRGB(226, 133, 26))
makeLabel(left, "Angles, then offset: orbit")
makeLabel(right, "offset, then Angles: spin")

RunService.Heartbeat:Connect(function()
	local angle = os.clock()
	moonA.CFrame = left.CFrame * CFrame.Angles(0, angle, 0) * CFrame.new(5, 0, 0)
	moonB.CFrame = right.CFrame * CFrame.new(5, 0, 0) * CFrame.Angles(0, angle, 0)
end)`],

'cf-objectspace':['S','A turning NPC block reports where you are from its point of view (left/right, front/behind) using PointToObjectSpace.',`
local npc = makePart(Vector3.new(2, 4, 2), ORIGIN + Vector3.new(0, 2, 0), Color3.fromRGB(163, 162, 165))
local face = makePart(Vector3.new(1.6, 0.6, 0.2), ORIGIN, Color3.fromRGB(47, 111, 214))
local label = makeLabel(npc)

RunService.Heartbeat:Connect(function()
	npc.CFrame = CFrame.new(npc.Position) * CFrame.Angles(0, os.clock() * 0.3, 0)
	face.CFrame = npc.CFrame * CFrame.new(0, 1, -1.1)
	local root = nearestRoot(npc.Position)
	if not root then return end
	local rel = npc.CFrame:PointToObjectSpace(root.Position)
	local side = rel.X > 0 and string.format("%.0f right", rel.X) or string.format("%.0f left", -rel.X)
	local depth = rel.Z < 0 and string.format("%.0f in front", -rel.Z) or string.format("%.0f behind", rel.Z)
	label.Text = side .. ", " .. depth
end)`],

'cf-lerp':['S','A block blends between two very different CFrames (position and rotation) with CFrame:Lerp.',`
local A = CFrame.new(ORIGIN + Vector3.new(-10, 2, 0))
local B = CFrame.new(ORIGIN + Vector3.new(10, 8, -6)) * CFrame.fromEulerAnglesYXZ(0.6, 2.4, 0.4)
makePart(Vector3.new(2, 1, 4), A.Position, Color3.fromRGB(18, 147, 154), { CFrame = A, Transparency = 0.6, CanCollide = false })
makePart(Vector3.new(2, 1, 4), B.Position, Color3.fromRGB(194, 65, 142), { CFrame = B, Transparency = 0.6, CanCollide = false })
local block = makePart(Vector3.new(2, 1, 4), A.Position, Color3.fromRGB(226, 133, 26), { CanCollide = false })

RunService.Heartbeat:Connect(function()
	local alpha = 0.5 - 0.5 * math.cos(os.clock() * 0.8)
	block.CFrame = A:Lerp(B, alpha)
end)`],

'cf-pivot':['S','A door swings around its hinge edge: hinge * rotation * hinge:Inverse() * closed.',`
local hinge = CFrame.new(ORIGIN + Vector3.new(0, 4.5, 0))
local closed = hinge * CFrame.new(3, 0, 0)
makePart(Vector3.new(0.6, 9, 0.6), hinge.Position, Color3.fromRGB(60, 60, 70))
local door = makePart(Vector3.new(6, 9, 0.5), closed.Position, Color3.fromRGB(150, 110, 70))

RunService.Heartbeat:Connect(function()
	local open = math.rad(100) * (0.5 - 0.5 * math.cos(os.clock()))
	door.CFrame = hinge * CFrame.Angles(0, open, 0) * hinge:Inverse() * closed
end)`],

'cf-camera':['L','An over-the-shoulder camera: hold right mouse to look around. Built from focus * yaw * pitch * offset, pulled in front of walls with a raycast.',`
local UserInputService = game:GetService("UserInputService")
local yaw, pitch = 0, math.rad(-10)
local SIDE, DIST = 2, 10
makePart(Vector3.new(20, 12, 1), ORIGIN + Vector3.new(0, 6, 10), Color3.fromRGB(90, 90, 100))   -- a wall to test with

UserInputService.InputChanged:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseMovement and UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton2) then
		yaw -= input.Delta.X * 0.005
		pitch = math.clamp(pitch - input.Delta.Y * 0.005, math.rad(-70), math.rad(40))
	end
end)

local params = RaycastParams.new()
RunService:BindToRenderStep("ShoulderCam", Enum.RenderPriority.Camera.Value + 1, function()
	local root = myRoot()
	if not root then return end
	camera.CameraType = Enum.CameraType.Scriptable
	UserInputService.MouseBehavior = UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton2)
		and Enum.MouseBehavior.LockCurrentPosition or Enum.MouseBehavior.Default
	local focus = CFrame.new(root.Position + Vector3.new(0, 2, 0)) * CFrame.Angles(0, yaw, 0) * CFrame.Angles(pitch, 0, 0)
	local wanted = focus * CFrame.new(SIDE, 0, DIST)
	params.FilterDescendantsInstances = { player.Character }
	local hit = workspace:Raycast(focus.Position, wanted.Position - focus.Position, params)
	local position = hit and hit.Position + hit.Normal * 0.3 or wanted.Position
	camera.CFrame = CFrame.new(position) * wanted.Rotation
end)`],

'cf-weld':['S','Every player gets a shield welded to their back. Weld.C0 says where on the torso, C1 which point of the shield sits there.',`
local function giveShield(character)
	local root = character:WaitForChild("HumanoidRootPart")
	local shield = Instance.new("Part")
	shield.Size = Vector3.new(3, 3.5, 0.4)
	shield.Color = Color3.fromRGB(150, 110, 70)
	shield.CanCollide = false
	shield.Massless = true
	shield.Parent = character
	local weld = Instance.new("Weld")
	weld.Part0 = root
	weld.Part1 = shield
	weld.C0 = CFrame.new(0, 0.3, 0.8)                            -- on the back (+Z is behind)
	weld.C1 = CFrame.Angles(0, 0, math.rad(15))                   -- tilted a little
	weld.Parent = shield
end
Players.PlayerAdded:Connect(function(p) p.CharacterAdded:Connect(giveShield) end)
for _, p in Players:GetPlayers() do
	p.CharacterAdded:Connect(giveShield)
	if p.Character then giveShield(p.Character) end
end`],

'cf-localvel':['S','A label over each player shows their forward and sideways speed, from root.CFrame:VectorToObjectSpace(velocity).',`
local labels = {}
RunService.Heartbeat:Connect(function()
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			if not labels[player] or not labels[player].Parent or labels[player].Parent.Parent ~= root then
				labels[player] = makeLabel(root)
			end
			local localV = root.CFrame:VectorToObjectSpace(root.AssemblyLinearVelocity)
			labels[player].Text = string.format("forward %.0f  sideways %.0f", -localV.Z, localV.X)
		end
	end
end)`],

'cf-euler':['S','A compass label over each player shows their heading in degrees, read back with ToEulerAnglesYXZ.',`
local labels = {}
RunService.Heartbeat:Connect(function()
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			if not labels[player] or not labels[player].Parent or labels[player].Parent.Parent ~= root then
				labels[player] = makeLabel(root)
			end
			local _, yaw, _ = root.CFrame:ToEulerAnglesYXZ()
			local heading = (math.deg(yaw) + 360) % 360
			local names = { "N", "NW", "W", "SW", "S", "SE", "E", "NE" }
			labels[player].Text = string.format("%s  %.0f degrees", names[math.floor((heading + 22.5) / 45) % 8 + 1], heading)
		end
	end
end)`],

'cf-slerp':['S','Two blocks turn between the same two orientations: CFrame:Lerp (smooth, shortest path) vs lerping the three angles (wobbly detour).',`
local goalAngles = Vector3.new(math.rad(70), math.rad(150), math.rad(120))       -- pitch, yaw, roll
local slerpBlock = makePart(Vector3.new(2, 1, 4), ORIGIN + Vector3.new(-6, 5, 0), Color3.fromRGB(226, 133, 26))
local angleBlock = makePart(Vector3.new(2, 1, 4), ORIGIN + Vector3.new(6, 5, 0), Color3.fromRGB(230, 60, 60))
makeLabel(slerpBlock, "CFrame:Lerp")
makeLabel(angleBlock, "lerping angles")
local startL, startA = CFrame.new(slerpBlock.Position), CFrame.new(angleBlock.Position)
local goalRot = CFrame.fromEulerAnglesYXZ(goalAngles.X, goalAngles.Y, goalAngles.Z)

RunService.Heartbeat:Connect(function()
	local t = 0.5 - 0.5 * math.cos(os.clock() * 0.7)
	slerpBlock.CFrame = startL:Lerp(startL * goalRot, t)
	local a = goalAngles * t
	angleBlock.CFrame = startA * CFrame.fromEulerAnglesYXZ(a.X, a.Y, a.Z)
end)`],

/* ===== math library ===== */
'm-sincos':['S','Twelve orbs placed evenly around a circle with cos and sin, slowly rotating, plus one bobbing up and down with math.sin.',`
local COUNT, RADIUS = 12, 10
local CENTER = ORIGIN + Vector3.new(0, 3, 0)
local orbs = {}
for i = 1, COUNT do
	orbs[i] = makePart(Vector3.new(1.2, 1.2, 1.2), CENTER, Color3.fromHSV(i / COUNT, 0.6, 1), { Shape = Enum.PartType.Ball, CanCollide = false })
end
local bobber = makePart(Vector3.new(2, 2, 2), CENTER, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball, Material = Enum.Material.Neon })

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	for i, orb in orbs do
		local angle = (i - 1) / COUNT * math.pi * 2 + t * 0.5
		orb.Position = CENTER + Vector3.new(math.cos(angle) * RADIUS, 0, math.sin(angle) * RADIUS)
	end
	bobber.Position = CENTER + Vector3.new(0, math.sin(t * 2) * 1.5, 0)
end)`],

'm-atan2':['S','A tank body turns only around Y toward you, using yaw = math.atan2(-dir.X, -dir.Z).',`
local tank = makePart(Vector3.new(4, 2, 6), ORIGIN + Vector3.new(0, 1, 0), Color3.fromRGB(70, 110, 70))
local barrel = makePart(Vector3.new(0.6, 0.6, 4), ORIGIN, Color3.fromRGB(40, 60, 40))
local label = makeLabel(tank)

RunService.Heartbeat:Connect(function()
	local root = nearestRoot(tank.Position)
	if not root then return end
	local dir = root.Position - tank.Position
	local yaw = math.atan2(-dir.X, -dir.Z)                 -- 0 = facing -Z
	tank.CFrame = CFrame.new(tank.Position) * CFrame.Angles(0, yaw, 0)
	barrel.CFrame = tank.CFrame * CFrame.new(0, 0.8, -4.5)
	label.Text = string.format("yaw %.0f degrees", math.deg(yaw))
end)`],

'm-clamp':['S','A drone follows the nearest player but math.clamp keeps it inside a 20 × 20 arena (outlined).',`
local LIMIT = 10
for _, w in { {Vector3.new(LIMIT * 2, 0.4, 0.4), Vector3.new(0, 0.2, -LIMIT)}, {Vector3.new(LIMIT * 2, 0.4, 0.4), Vector3.new(0, 0.2, LIMIT)},
              {Vector3.new(0.4, 0.4, LIMIT * 2), Vector3.new(-LIMIT, 0.2, 0)}, {Vector3.new(0.4, 0.4, LIMIT * 2), Vector3.new(LIMIT, 0.2, 0)} } do
	makePart(w[1], ORIGIN + w[2], Color3.fromRGB(226, 133, 26), { Material = Enum.Material.Neon, CanCollide = false })
end
local drone = makePart(Vector3.new(2, 1, 2), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(18, 147, 154), { CanCollide = false })

RunService.Heartbeat:Connect(function()
	local root = nearestRoot(ORIGIN)
	if not root then return end
	local rel = root.Position - ORIGIN
	local clamped = Vector3.new(math.clamp(rel.X, -LIMIT, LIMIT), 4, math.clamp(rel.Z, -LIMIT, LIMIT))
	drone.Position = drone.Position:Lerp(ORIGIN + clamped, 0.15)
end)`],

'm-snap':['S','A see-through preview block snaps to a 4-stud grid under the nearest player: math.round(x / 4) * 4.',`
local GRID = 4
local preview = makePart(Vector3.new(GRID, GRID, GRID), ORIGIN, Color3.fromRGB(226, 133, 26),
	{ Transparency = 0.5, CanCollide = false, CanQuery = false })
local label = makeLabel(preview)
local function snap(n) return math.round(n / GRID) * GRID end

RunService.Heartbeat:Connect(function()
	local root = nearestRoot(ORIGIN)
	if not root then return end
	local p = root.Position + root.CFrame.LookVector * 6           -- a spot in front of you
	preview.Position = Vector3.new(snap(p.X), GRID / 2, snap(p.Z))
	label.Text = string.format("(%d, %d)", preview.Position.X, preview.Position.Z)
end)`],

'm-noise':['S','A 24 × 24 patch of terrain columns whose heights come from math.noise.',`
local SIZE, SCALE, AMPLITUDE = 24, 0.12, 8
for x = 1, SIZE do
	for z = 1, SIZE do
		local n = math.noise(x * SCALE, z * SCALE, 3)              -- about -0.5..0.5
		local h = math.max(0.5, 4 + n * AMPLITUDE)
		makePart(Vector3.new(2, h, 2), ORIGIN + Vector3.new((x - SIZE / 2) * 2, h / 2, (z - SIZE / 2) * 2),
			Color3.fromRGB(70, 150, 90):Lerp(Color3.fromRGB(240, 240, 230), math.clamp((h - 2) / 8, 0, 1)))
	end
	task.wait()
end`],

'm-exp':['S','A pet follows each player smoothly at any frame rate, using alpha = 1 − math.exp(−speed × dt).',`
local SPEED = 5
local pets = {}
RunService.Heartbeat:Connect(function(dt)
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local pet = pets[player]
			if not pet then
				pet = makePart(Vector3.new(1.5, 1.5, 1.5), root.Position, Color3.fromRGB(226, 133, 26),
					{ Shape = Enum.PartType.Ball, CanCollide = false, CanQuery = false, Material = Enum.Material.Neon })
				pets[player] = pet
			end
			local goal = (root.CFrame * CFrame.new(3, 2, 3)).Position
			pet.Position = pet.Position:Lerp(goal, 1 - math.exp(-SPEED * dt))
		end
	end
end)`],

'm-easing':['S','A row of blocks slides back and forth, each with a different Enum.EasingStyle, so you can compare them side by side.',`
local styles = { "Linear", "Quad", "Cubic", "Sine", "Exponential", "Back", "Elastic", "Bounce" }
for i, name in styles do
	local block = makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(-12, 1, (i - 4.5) * 3), Color3.fromHSV(i / #styles, 0.6, 1))
	makeLabel(block, name)
	local info = TweenInfo.new(2, Enum.EasingStyle[name], Enum.EasingDirection.Out, -1, true, 0.5)
	TweenService:Create(block, info, { Position = ORIGIN + Vector3.new(12, 1, (i - 4.5) * 3) }):Play()
end`],

'm-mod':['S','A guard patrols six pads forever: index = index % #pads + 1 wraps back to the first.',`
local pads = {}
for i = 1, 6 do
	local a = (i - 1) / 6 * math.pi * 2
	pads[i] = makePart(Vector3.new(3, 0.4, 3), ORIGIN + Vector3.new(math.cos(a) * 12, 0.2, math.sin(a) * 12), Color3.fromRGB(163, 162, 165))
	makeLabel(pads[i], tostring(i))
end
local guard = makePart(Vector3.new(2, 4, 2), pads[1].Position + Vector3.new(0, 2, 0), Color3.fromRGB(226, 133, 26))
local index = 1
while true do
	pads[index].Color = Color3.fromRGB(163, 162, 165)
	index = index % #pads + 1                                  -- 1, 2, ... 6, 1, 2 ...
	pads[index].Color = Color3.fromRGB(226, 133, 26)
	local tween = TweenService:Create(guard, TweenInfo.new(1.2, Enum.EasingStyle.Linear),
		{ Position = pads[index].Position + Vector3.new(0, 2, 0) })
	tween:Play()
	tween.Completed:Wait()
end`],

'm-map':['S','A lamp gets brighter the closer you are: brightness = 1 − inverseLerp(near, far, distance), clamped.',`
local NEAR, FAR = 6, 30
local lamp = makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(255, 220, 120), { Material = Enum.Material.Neon })
local light = Instance.new("PointLight")
light.Range = 30
light.Parent = lamp
local label = makeLabel(lamp)
local function inverseLerp(a, b, x) return (x - a) / (b - a) end

RunService.Heartbeat:Connect(function()
	local root = nearestRoot(lamp.Position)
	if not root then return end
	local distance = (root.Position - lamp.Position).Magnitude
	local t = math.clamp(inverseLerp(NEAR, FAR, distance), 0, 1)
	light.Brightness = (1 - t) * 5
	lamp.Transparency = t * 0.8
	label.Text = string.format("%.0f studs -> brightness %.2f", distance, light.Brightness)
end)`],

'm-angdiff':['S','A turret turns toward a target that jumps between headings near ±180°. With angle wrapping it always takes the short way round.',`
local turret = makePart(Vector3.new(2, 2, 5), ORIGIN + Vector3.new(0, 1, 0), Color3.fromRGB(226, 133, 26))
local target = makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(194, 65, 142), { CanCollide = false })
local label = makeLabel(turret)
local function angleDiff(from, to)                     -- degrees, always -180..180
	return (to - from + 180) % 360 - 180
end
local yaw, targetYaw = 0, 170
task.spawn(function()
	while true do
		targetYaw = targetYaw > 0 and -170 or 170          -- jump across the 180 line
		task.wait(3)
	end
end)

RunService.Heartbeat:Connect(function(dt)
	local diff = angleDiff(yaw, targetYaw)
	yaw += math.clamp(diff, -120 * dt, 120 * dt)
	turret.CFrame = CFrame.new(turret.Position) * CFrame.Angles(0, math.rad(yaw), 0)
	target.Position = turret.Position + Vector3.new(-math.sin(math.rad(targetYaw)), 0, -math.cos(math.rad(targetYaw))) * 8
	label.Text = string.format("turning %.0f degrees (the short way)", diff)
end)`],

'm-spring':['S','A box springs toward a goal that jumps every 2 seconds: acceleration = −stiffness·offset − damping·velocity, stepped at a fixed rate.',`
local STIFFNESS, DAMPING_RATIO = 120, 0.3
local DAMPING = 2 * DAMPING_RATIO * math.sqrt(STIFFNESS)
local box = makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(226, 133, 26), { CanCollide = false })
local goalMarker = makePart(Vector3.new(0.6, 0.6, 0.6), ORIGIN, Color3.fromRGB(47, 111, 214), { Shape = Enum.PartType.Ball, CanCollide = false })
local x, v, goal = 0, 0, 0
task.spawn(function()
	while true do
		task.wait(2)
		goal = goal == 0 and 8 or 0
	end
end)
local STEP, acc = 1 / 240, 0
RunService.Heartbeat:Connect(function(dt)
	acc += math.min(dt, 0.1)
	while acc >= STEP do
		acc -= STEP
		local a = -STIFFNESS * (x - goal) - DAMPING * v
		v += a * STEP
		x += v * STEP
	end
	box.Position = ORIGIN + Vector3.new(x - 4, 4, 0)
	goalMarker.Position = ORIGIN + Vector3.new(goal - 4, 6, 0)
end)`],

'm-growth':['S','Prints an XP table for levels 1 to 15 with an exponential curve, and works the level back out from total XP with math.log.',`
local BASE, GROWTH = 100, 1.15
local function xpNeeded(level) return math.floor(BASE * GROWTH ^ (level - 1)) end
local function totalXpFor(level) return BASE * (GROWTH ^ (level - 1) - 1) / (GROWTH - 1) end   -- XP to reach this level
local function levelFromXp(xp) return math.floor(math.log(xp * (GROWTH - 1) / BASE + 1) / math.log(GROWTH)) + 1 end
for level = 1, 15 do
	print(string.format("level %2d -> %2d needs %5d XP   (total so far %6.0f)", level, level + 1, xpNeeded(level), totalXpFor(level)))
end
for _, xp in { 0, 500, 2500, 12000 } do print(xp, "total XP is level", levelFromXp(xp)) end
for level = 1, 15 do
	local h = xpNeeded(level) / 40
	local bar = makePart(Vector3.new(1.5, h, 1.5), ORIGIN + Vector3.new((level - 8) * 2, h / 2, 0), Color3.fromHSV(level / 20, 0.6, 0.9))
	if level % 5 == 0 then makeLabel(bar, "lvl " .. level .. ": " .. xpNeeded(level)) end
end`],
});
})();
