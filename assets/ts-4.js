(function(){
"use strict";
const NOISEGRID = `local SIZE, CELL = 32, 2
local folder = Instance.new("Folder")
folder.Parent = demo
local function heightColor(height)
	if height < 0.32 then
		return Color3.fromRGB(47, 111, 214)
	elseif height < 0.37 then
		return Color3.fromRGB(228, 209, 154)
	elseif height < 0.62 then
		return Color3.fromRGB(95, 174, 79)
	elseif height < 0.8 then
		return Color3.fromRGB(130, 130, 130)
	end
	return Color3.fromRGB(242, 242, 242)
end
local function buildTerrain(heightAt) -- heightAt(x, z) returns 0..1
	for x = 1, SIZE do
		for z = 1, SIZE do
			local height = math.clamp(heightAt(x, z), 0, 1)
			local columnHeight = math.max(0.4, height * 20)
			makePart(
				Vector3.new(CELL, columnHeight, CELL),
				ORIGIN + Vector3.new((x - SIZE / 2) * CELL, columnHeight / 2, (z - SIZE / 2) * CELL),
				heightColor(height),
				{ Parent = folder }
			)
		end
		task.wait()
	end
end
local function fractalNoise(x, z, octaves, seed)
	local amplitude, frequency, total, totalAmplitude = 1, 1, 0, 0
	for i = 1, octaves do
		total += amplitude * math.noise(x * frequency, z * frequency, seed + i * 17.3)
		totalAmplitude += amplitude
		amplitude *= 0.5
		frequency *= 2
	end
	return total / totalAmplitude
end
`;
const MAZE = `local WIDTH, HEIGHT, CELL = 18, 14, 3
local walls = {}
local function cellKey(x, z)
	return x * 1000 + z
end
local function cellPosition(x, z)
	return ORIGIN + Vector3.new((x - WIDTH / 2) * CELL, 0, (z - HEIGHT / 2) * CELL)
end
local random = Random.new(7)
for x = 1, WIDTH do
	for z = 1, HEIGHT do
		makePart(
			Vector3.new(CELL - 0.2, 0.2, CELL - 0.2),
			cellPosition(x, z) + Vector3.new(0, 0.1, 0),
			Color3.fromRGB(200, 200, 205)
		)
		if
			random:NextNumber() < 0.22
			and not (x <= 2 and z <= 2)
			and not (x >= WIDTH - 1 and z >= HEIGHT - 1)
		then
			walls[cellKey(x, z)] = true
			makePart(
				Vector3.new(CELL, 3, CELL),
				cellPosition(x, z) + Vector3.new(0, 1.5, 0),
				Color3.fromRGB(50, 50, 60)
			)
		end
	end
end
local function isOpen(x, z)
	return x >= 1 and x <= WIDTH and z >= 1 and z <= HEIGHT and not walls[cellKey(x, z)]
end
local function neighbours(x, z)
	local list = {}
	for _, direction in { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } } do
		if isOpen(x + direction[1], z + direction[2]) then
			table.insert(list, { x + direction[1], z + direction[2] })
		end
	end
	return list
end
local function showPath(path, color)
	for _, cell in path do
		makePart(
			Vector3.new(1, 0.4, 1),
			cellPosition(cell[1], cell[2]) + Vector3.new(0, 0.4, 0),
			color or Color3.fromRGB(226, 133, 26),
			{ CanCollide = false }
		)
	end
end
`;
const SCATTER = `local random = Random.new()
local function scatter(count, area)
	local parts = {}
	for i = 1, count do
		parts[i] = makePart(
			Vector3.new(0.8, 0.8, 0.8),
			ORIGIN + Vector3.new(random:NextNumber(-area, area), 1, random:NextNumber(-area, area)),
			Color3.fromRGB(120, 120, 130),
			{ Shape = Enum.PartType.Ball, CanCollide = false }
		)
	end
	return parts
end
`;
Lab.ts({
/* ===== Geometry ===== */
'geo-raysphere':['S','A bubble shield made of pure maths: a scanner\'s ray is tested against the sphere with the quadratic formula (no part needed for the hit test).',`
local center, radius = ORIGIN + Vector3.new(0, 5, -6), 5
makePart(Vector3.new(radius * 2, radius * 2, radius * 2), center, Color3.fromRGB(90, 160, 255), {
	Shape = Enum.PartType.Ball,
	Transparency = 0.75,
	CanCollide = false,
	CanQuery = false,
	Material = Enum.Material.ForceField,
})
local scanner = makePart(Vector3.new(1, 1, 2), ORIGIN + Vector3.new(0, 5, 14), Color3.fromRGB(60, 60, 70))
local beam = makeLinePart(Color3.fromRGB(255, 60, 60))
local hitDot = makePart(
	Vector3.new(0.8, 0.8, 0.8),
	center,
	Color3.fromRGB(250, 200, 40),
	{ Shape = Enum.PartType.Ball, CanCollide = false, CanQuery = false }
)
local function raySphere(origin, direction, sphereCenter, sphereRadius)
	local fromCenter = origin - sphereCenter
	local halfB = fromCenter:Dot(direction)
	local discriminant = halfB * halfB - (fromCenter:Dot(fromCenter) - sphereRadius * sphereRadius)
	if discriminant < 0 then
		return nil
	end
	local hitDistance = -halfB - math.sqrt(discriminant)
	return hitDistance > 0 and hitDistance or nil
end
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	local direction = (Vector3.new(math.sin(now) * 9, math.cos(now * 0.7) * 5, -20)).Unit
	local hit = raySphere(scanner.Position, direction, center, radius)
	local endPoint = scanner.Position + direction * (hit or 40)
	drawLine(beam, scanner.Position, endPoint)
	hitDot.Transparency = hit and 0 or 1
	hitDot.Position = endPoint
end)`],

'geo-rayplane':['L','Move your mouse: a ray from the camera is intersected with an invisible floor 6 studs up (ray vs plane), and a block follows that spot.',`
local UserInputService = game:GetService("UserInputService")
local PLANE_POINT, NORMAL = Vector3.new(0, 6, 0), Vector3.yAxis
local block = makePart(
	Vector3.new(2, 2, 2),
	ORIGIN,
	Color3.fromRGB(226, 133, 26),
	{ CanCollide = false, CanQuery = false, Transparency = 0.3 }
)
local function rayPlane(origin, direction, point, normal)
	local denominator = direction:Dot(normal)
	if math.abs(denominator) < 1e-6 then
		return nil
	end
	local distance = (point - origin):Dot(normal) / denominator
	if distance < 0 then
		return nil
	end
	return origin + direction * distance
end
RunService.RenderStepped:Connect(function()
	local mouse = UserInputService:GetMouseLocation()
	local ray = camera:ViewportPointToRay(mouse.X, mouse.Y)
	local hit = rayPlane(ray.Origin, ray.Direction, PLANE_POINT, NORMAL)
	block.Transparency = hit and 0.3 or 1
	if hit then
		block.Position = Vector3.new(math.round(hit.X / 2) * 2, hit.Y + 1, math.round(hit.Z / 2) * 2)
	end
end)`],

'geo-polygon':['S','An irregular zone marked by neon edges. They turn green while any player stands inside (even-odd crossing test).',`
local ZONE = {
	Vector2.new(-14, -10),
	Vector2.new(-2, -12),
	Vector2.new(4, -4),
	Vector2.new(14, -10),
	Vector2.new(12, 8),
	Vector2.new(0, 2),
	Vector2.new(-10, 10),
}
local edges = {}
for i, cornerA in ZONE do
	local cornerB = ZONE[i % #ZONE + 1]
	local edge = makeLinePart(Color3.fromRGB(230, 80, 80))
	drawLine(
		edge,
		ORIGIN + Vector3.new(cornerA.X, 0.3, cornerA.Y),
		ORIGIN + Vector3.new(cornerB.X, 0.3, cornerB.Y)
	)
	edges[i] = edge
end
local function isInside(point, polygon)
	local inside, previousIndex = false, #polygon
	for i = 1, #polygon do
		local cornerA, cornerB = polygon[i], polygon[previousIndex]
		if
			(cornerA.Y > point.Y) ~= (cornerB.Y > point.Y)
			and point.X
				< cornerA.X + (point.Y - cornerA.Y) * (cornerB.X - cornerA.X) / (cornerB.Y - cornerA.Y)
		then
			inside = not inside
		end
		previousIndex = i
	end
	return inside
end
RunService.Heartbeat:Connect(function()
	local anyone = false
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local offset = root.Position - ORIGIN
			anyone = anyone or isInside(Vector2.new(offset.X, offset.Z), ZONE)
		end
	end
	for _, edgeLine in edges do
		edgeLine.Color = anyone and Color3.fromRGB(60, 220, 100) or Color3.fromRGB(230, 80, 80)
	end
end)`],

'geo-segments':['S','A laser fence between two posts. If a player\'s movement between two frames crosses it (2D segment intersection), the fence flashes and prints who crossed.',`
local FENCE_START, FENCE_END = Vector2.new(-12, -4), Vector2.new(12, 4)
makePart(
	Vector3.new(1, 5, 1),
	ORIGIN + Vector3.new(FENCE_START.X, 2.5, FENCE_START.Y),
	Color3.fromRGB(60, 60, 70)
)
makePart(
	Vector3.new(1, 5, 1),
	ORIGIN + Vector3.new(FENCE_END.X, 2.5, FENCE_END.Y),
	Color3.fromRGB(60, 60, 70)
)
local laser = makeLinePart(Color3.fromRGB(255, 60, 60))
drawLine(
	laser,
	ORIGIN + Vector3.new(FENCE_START.X, 3, FENCE_START.Y),
	ORIGIN + Vector3.new(FENCE_END.X, 3, FENCE_END.Y)
)
local function cross2D(vectorA, vectorB)
	return vectorA.X * vectorB.Y - vectorA.Y * vectorB.X
end
local function segmentsCross(startA, directionA, startB, directionB)
	local denominator = cross2D(directionA, directionB)
	if math.abs(denominator) < 1e-9 then
		return false
	end
	local alongA, alongB =
		cross2D(startB - startA, directionB) / denominator, cross2D(startB - startA, directionA) / denominator
	return alongA >= 0 and alongA <= 1 and alongB >= 0 and alongB <= 1
end
local lastPosition = {}
RunService.Heartbeat:Connect(function()
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local now = Vector2.new(root.Position.X - ORIGIN.X, root.Position.Z - ORIGIN.Z)
			if
				lastPosition[player]
				and segmentsCross(
					FENCE_START,
					FENCE_END - FENCE_START,
					lastPosition[player],
					now - lastPosition[player]
				)
			then
				print(player.Name .. " crossed the laser!")
				laser.Color = Color3.fromRGB(255, 255, 255)
				task.delay(0.2, function()
					laser.Color = Color3.fromRGB(255, 60, 60)
				end)
			end
			lastPosition[player] = now
		end
	end
end)`],

/* ===== Kinematics & IK ===== */
'ik-cosines':['S','Three posts form a triangle that changes shape; the angle at each corner is worked out from the three side lengths (law of cosines).',`
local cornerA =
	makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(217, 54, 62), { Shape = Enum.PartType.Ball })
local cornerB =
	makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(46, 158, 82), { Shape = Enum.PartType.Ball })
local cornerC =
	makePart(Vector3.new(1, 1, 1), ORIGIN, Color3.fromRGB(47, 111, 214), { Shape = Enum.PartType.Ball })
local sideAB, sideBC, sideCA = makeLinePart(), makeLinePart(), makeLinePart()
local labelA, labelB, labelC = makeLabel(cornerA), makeLabel(cornerB), makeLabel(cornerC)
local function angleOpposite(opposite, sideOne, sideTwo)
	return math.acos(math.clamp((sideOne ^ 2 + sideTwo ^ 2 - opposite ^ 2) / (2 * sideOne * sideTwo), -1, 1))
end
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	local positionA, positionB = ORIGIN + Vector3.new(-8, 2, 0), ORIGIN + Vector3.new(8, 2, 0)
	local positionC = ORIGIN + Vector3.new(math.sin(now * 0.5) * 6, 2 + 6 + math.sin(now) * 3, 0)
	cornerA.Position, cornerB.Position, cornerC.Position = positionA, positionB, positionC
	drawLine(sideAB, positionA, positionB)
	drawLine(sideBC, positionB, positionC)
	drawLine(sideCA, positionC, positionA)
	local lengthA, lengthB, lengthC =
		(positionB - positionC).Magnitude,
		(positionA - positionC).Magnitude,
		(positionA - positionB).Magnitude
	labelA.Text = string.format("A %.0f", math.deg(angleOpposite(lengthA, lengthB, lengthC)))
	labelB.Text = string.format("B %.0f", math.deg(angleOpposite(lengthB, lengthA, lengthC)))
	labelC.Text = string.format("C %.0f", math.deg(angleOpposite(lengthC, lengthA, lengthB)))
end)`],

'ik-twobone':['S','A two-bone arm on a pedestal reaches toward the nearest player (or an orbiting point), with the elbow bending upward toward a pole.',`
local UPPER_LENGTH, LOWER_LENGTH = 6, 5
local SHOULDER = ORIGIN + Vector3.new(0, 8, 0)
makePart(Vector3.new(3, 8, 3), SHOULDER - Vector3.new(0, 4, 0), Color3.fromRGB(80, 80, 90))
local upper = makePart(
	Vector3.new(0.8, 0.8, UPPER_LENGTH),
	SHOULDER,
	Color3.fromRGB(70, 130, 240),
	{ CanCollide = false }
)
local lower = makePart(
	Vector3.new(0.7, 0.7, LOWER_LENGTH),
	SHOULDER,
	Color3.fromRGB(230, 100, 160),
	{ CanCollide = false }
)
local function solve(shoulder, target, pole)
	local toTarget = target - shoulder
	local reach = math.clamp(
		toTarget.Magnitude,
		math.abs(UPPER_LENGTH - LOWER_LENGTH) + 0.01,
		UPPER_LENGTH + LOWER_LENGTH - 0.01
	)
	local direction = toTarget.Unit
	local shoulderAngle = math.acos(
		math.clamp(
			(UPPER_LENGTH * UPPER_LENGTH + reach * reach - LOWER_LENGTH * LOWER_LENGTH)
				/ (2 * UPPER_LENGTH * reach),
			-1,
			1
		)
	)
	local toPole = pole - shoulder
	local bend = toPole - direction * toPole:Dot(direction)
	bend = bend.Magnitude > 1e-3 and bend.Unit or Vector3.yAxis
	return shoulder
		+ direction * (math.cos(shoulderAngle) * UPPER_LENGTH)
		+ bend * (math.sin(shoulderAngle) * UPPER_LENGTH),
		shoulder + direction * reach
end
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	local root = nearestPlayerRoot(SHOULDER, 25)
	local target = root and root.Position
		or SHOULDER + Vector3.new(math.cos(now) * 7, math.sin(now * 1.3) * 3, math.sin(now) * 7)
	local elbow, hand = solve(SHOULDER, target, SHOULDER + Vector3.new(0, 10, 0))
	upper.CFrame = CFrame.lookAt((SHOULDER + elbow) / 2, elbow)
	lower.CFrame = CFrame.lookAt((elbow + hand) / 2, hand)
end)`],

'ik-fabrik':['S','A 10-segment tentacle reaches for the nearest player (or a wandering point) using FABRIK: drag the tip to the target, then drag the base back, a few times per frame.',`
local SEGMENTS, LENGTH, PASSES = 10, 1.3, 3
local BASE = ORIGIN + Vector3.new(0, 0.5, 0)
local points, segments = {}, {}
for i = 0, SEGMENTS do
	points[i] = BASE + Vector3.new(0, i * LENGTH, 0)
end
for i = 1, SEGMENTS do
	segments[i] = makePart(
		Vector3.new(0.8 - i * 0.05, 0.8 - i * 0.05, LENGTH),
		BASE,
		Color3.fromHSV(0.8 + i * 0.01, 0.6, 0.9),
		{ CanCollide = false }
	)
end
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	local root = nearestPlayerRoot(BASE, 20)
	local target = root and root.Position
		or BASE
			+ Vector3.new(math.sin(now * 0.7) * 8, 6 + math.sin(now * 1.3) * 3, math.cos(now * 0.7) * 6)
	for _ = 1, PASSES do
		points[SEGMENTS] = target
		for i = SEGMENTS - 1, 0, -1 do
			points[i] = points[i + 1] + (points[i] - points[i + 1]).Unit * LENGTH
		end
		points[0] = BASE
		for i = 0, SEGMENTS - 1 do
			points[i + 1] = points[i] + (points[i + 1] - points[i]).Unit * LENGTH
		end
	end
	for i = 1, SEGMENTS do
		segments[i].CFrame = CFrame.lookAt((points[i - 1] + points[i]) / 2, points[i])
	end
end)`],

/* ===== Physics ===== */
'ph-integrators':['S','Three balls orbit a sun with the same start but different update rules. Explicit Euler spirals outward; semi-implicit Euler and Verlet stay on orbit.',`
local GRAVITY_STRENGTH, TIME_STEP = 400, 1 / 20 -- a big time step makes the difference obvious
local SUN = ORIGIN + Vector3.new(0, 8, 0)
makePart(
	Vector3.new(3, 3, 3),
	SUN,
	Color3.fromRGB(255, 200, 60),
	{ Shape = Enum.PartType.Ball, Material = Enum.Material.Neon }
)
local function gravityAt(position)
	local offset = SUN - position
	return offset * (GRAVITY_STRENGTH / offset.Magnitude ^ 3)
end
local kinds = { "explicit Euler", "semi-implicit Euler", "velocity Verlet" }
local bodies = {}
local function reset()
	for i, name in kinds do
		local startPosition, startVelocity =
			SUN + Vector3.new(10, 0, 0), Vector3.new(0, 0, -math.sqrt(GRAVITY_STRENGTH / 10))
		if not bodies[i] then
			bodies[i] = {
				part = makePart(
					Vector3.new(1, 1, 1),
					startPosition,
					Color3.fromHSV(i / 4, 0.7, 1),
					{ Shape = Enum.PartType.Ball, CanCollide = false }
				),
			}
			makeLabel(bodies[i].part, name)
		end
		bodies[i].p, bodies[i].v = startPosition, startVelocity
	end
end
reset()
local accumulator, elapsed = 0, 0
RunService.Heartbeat:Connect(function(deltaTime)
	accumulator += deltaTime
	while accumulator >= TIME_STEP do
		accumulator -= TIME_STEP
		elapsed += TIME_STEP
		local euler, semiImplicit, verlet = bodies[1], bodies[2], bodies[3]
		local acceleration = gravityAt(euler.position)
		euler.position += euler.velocity * TIME_STEP
		euler.velocity += acceleration * TIME_STEP -- explicit
		semiImplicit.velocity += gravityAt(semiImplicit.position) * TIME_STEP
		semiImplicit.position += semiImplicit.velocity * TIME_STEP -- semi-implicit
		local accelerationBefore = gravityAt(verlet.position)
		verlet.position += verlet.velocity * TIME_STEP + accelerationBefore * (0.5 * TIME_STEP * TIME_STEP)
		verlet.velocity += (accelerationBefore + gravityAt(verlet.position)) * (0.5 * TIME_STEP) -- Verlet
		if elapsed > 25 or (euler.position - SUN).Magnitude > 40 then
			reset()
			elapsed = 0
		end
	end
	for _, body in bodies do
		body.part.Position = body.position
	end
end)`],

'ph-bounce':['S','Balls drop onto a tilted ramp and bounce with your own physics: split velocity along the normal, flip it × restitution, reduce the sliding part with friction.',`
local RESTITUTION, FRICTION, GRAVITY = 0.7, 0.2, Vector3.new(0, -60, 0)
local tilt = math.rad(20)
local normal = Vector3.new(math.sin(tilt), math.cos(tilt), 0)
local planePoint = ORIGIN + Vector3.new(0, 2, 0)
local ramp = makePart(Vector3.new(30, 0.6, 8), planePoint, Color3.fromRGB(90, 90, 100))
ramp.CFrame = CFrame.new(planePoint - normal * 0.3) * CFrame.Angles(0, 0, -tilt)
while true do
	local ball = makePart(
		Vector3.new(1.6, 1.6, 1.6),
		ORIGIN + Vector3.new(-8, 16, math.random(-2, 2)),
		Color3.fromHSV(math.random(), 0.7, 1),
		{ Shape = Enum.PartType.Ball, CanCollide = false }
	)
	task.spawn(function()
		local position, velocity = ball.Position, Vector3.new(3, 0, 0)
		local start = os.clock()
		while os.clock() - start < 6 do
			local deltaTime = RunService.Heartbeat:Wait()
			velocity += GRAVITY * deltaTime
			position += velocity * deltaTime
			local depth = (position - planePoint):Dot(normal) - 0.8
			if depth < 0 then
				position -= normal * depth
				local normalSpeed = velocity:Dot(normal)
				if normalSpeed < 0 then
					local normalPart = normal * normalSpeed
					local slidePart = velocity - normalPart
					local slide = slidePart.Magnitude
					if slide > 0 then
						slidePart *= math.max(
							0,
							1 - FRICTION * (1 + RESTITUTION) * math.abs(normalSpeed) / slide
						)
					end
					velocity = slidePart - normalPart * RESTITUTION
				end
			end
			ball.Position = position
		end
		ball:Destroy()
	end)
	task.wait(1.5)
end`],

'ph-collide':['S','A light ball hits a heavy one. The impulse along the line between them changes each velocity by its mass, and momentum is kept.',`
local RESTITUTION = 0.9
local function newBall(mass, position, velocity, color)
	local radius = 0.8 * mass ^ (1 / 3)
	return {
		mass = mass,
		radius = radius,
		position = position,
		velocity = velocity,
		part = makePart(
			Vector3.new(radius * 2, radius * 2, radius * 2),
			position,
			color,
			{ Shape = Enum.PartType.Ball, CanCollide = false }
		),
	}
end
while true do
	local ballA =
		newBall(1, ORIGIN + Vector3.new(-14, 1, 0.6), Vector3.new(10, 0, 0), Color3.fromRGB(18, 147, 154))
	local ballB = newBall(4, ORIGIN + Vector3.new(0, 1.6, 0), Vector3.zero, Color3.fromRGB(194, 65, 142))
	local label = makeLabel(ballB.part)
	local start = os.clock()
	while os.clock() - start < 4 do
		local deltaTime = RunService.Heartbeat:Wait()
		ballA.position += ballA.velocity * deltaTime
		ballB.position += ballB.velocity * deltaTime
		local offset = (ballB.position - ballA.position) * Vector3.new(1, 0, 1)
		local distance = offset.Magnitude
		if distance < ballA.radius + ballB.radius and distance > 0 then
			local normal = offset / distance
			local approaching = (ballA.velocity - ballB.velocity):Dot(normal)
			if approaching > 0 then
				local impulse = (1 + RESTITUTION) * approaching / (1 / ballA.mass + 1 / ballB.mass)
				ballA.velocity -= normal * (impulse / ballA.mass)
				ballB.velocity += normal * (impulse / ballB.mass)
			end
		end
		ballA.part.Position, ballB.part.Position = ballA.position, ballB.position
		local momentum = ballA.velocity * ballA.mass + ballB.velocity * ballB.mass
		label.Text = string.format("momentum (%.1f, %.1f)", momentum.X, momentum.Z)
	end
	ballA.part:Destroy()
	ballB.part:Destroy()
end`],

'ph-rope':['S','A rope bridge between two posts simulated with Verlet points and distance constraints; it sags and sways in the wind.',`
local SEGMENTS, PASSES = 20, 10
local LEFT_ANCHOR, RIGHT_ANCHOR = ORIGIN + Vector3.new(-12, 10, 0), ORIGIN + Vector3.new(12, 10, 0)
makePart(Vector3.new(1, 10, 1), LEFT_ANCHOR - Vector3.new(0, 5, 0), Color3.fromRGB(80, 60, 40))
makePart(Vector3.new(1, 10, 1), RIGHT_ANCHOR - Vector3.new(0, 5, 0), Color3.fromRGB(80, 60, 40))
local SEGMENT_LENGTH = (RIGHT_ANCHOR - LEFT_ANCHOR).Magnitude * 1.15 / SEGMENTS
local points, previous, planks = {}, {}, {}
for i = 0, SEGMENTS do
	points[i] = LEFT_ANCHOR:Lerp(RIGHT_ANCHOR, i / SEGMENTS)
	previous[i] = points[i]
end
for i = 1, SEGMENTS do
	planks[i] = makePart(
		Vector3.new(2.5, 0.3, SEGMENT_LENGTH),
		LEFT_ANCHOR,
		Color3.fromRGB(150, 110, 70),
		{ CanCollide = false }
	)
end
local STEP, accumulator = 1 / 60, 0
RunService.Heartbeat:Connect(function(deltaTime)
	accumulator += math.min(deltaTime, 0.1)
	while accumulator >= STEP do
		accumulator -= STEP
		local now = os.clock()
		local wind = Vector3.new(0, 0, math.sin(now * 0.8) * 15)
		for i = 1, SEGMENTS - 1 do
			local velocity = (points[i] - previous[i]) * 0.99
			previous[i] = points[i]
			points[i] += velocity + (Vector3.new(0, -60, 0) + wind) * STEP * STEP
		end
		for _ = 1, PASSES do
			points[0], points[SEGMENTS] = LEFT_ANCHOR, RIGHT_ANCHOR
			for i = 0, SEGMENTS - 1 do
				local delta = points[i + 1] - points[i]
				local correction = delta
					* ((delta.Magnitude - SEGMENT_LENGTH) / math.max(delta.Magnitude, 1e-4))
					* 0.5
				if i > 0 then
					points[i] += correction
				end
				if i + 1 < SEGMENTS then
					points[i + 1] -= correction
				end
			end
		end
	end
	for i = 1, SEGMENTS do
		planks[i].CFrame = CFrame.lookAt((points[i - 1] + points[i]) / 2, points[i])
	end
end)`],

/* ===== Procedural generation ===== */
'pg-fbm':['S','Generates terrain from 5 octaves of layered noise (fBm) and colours it by height.',NOISEGRID+`
buildTerrain(function(x, z)
	return 0.5 + 1.2 * fractalNoise(x * 0.06 + 0.31, z * 0.06 + 0.47, 5, 4)
end)`],
'pg-ridged':['S','Generates ridged mountains (1 − |noise|, squared) cut into flat terraces.',NOISEGRID+`
local STEPS = 6
buildTerrain(function(x, z)
	local total, amplitude, frequency, totalAmplitude = 0, 1, 1, 0
	for i = 1, 4 do
		local noise = math.clamp(
			math.noise(x * 0.06 * frequency + 0.3, z * 0.06 * frequency + 0.7, 5 + i * 11) * 1.6,
			-1,
			1
		)
		total += amplitude * (1 - math.abs(noise)) ^ 2
		totalAmplitude += amplitude
		amplitude *= 0.5
		frequency *= 2
	end
	return math.floor(total / totalAmplitude * STEPS) / STEPS -- terraces
end)`],
'pg-warp':['S','Generates swirly, eroded-looking terrain by nudging each sample point with another noise first (domain warping).',NOISEGRID+`
local WARP_STRENGTH = 2.5
buildTerrain(function(x, z)
	local warpX = math.noise(x * 0.05 + 0.1, z * 0.05 + 0.2, 1) * WARP_STRENGTH
	local warpZ = math.noise(x * 0.05 + 0.5, z * 0.05 + 0.9, 2) * WARP_STRENGTH
	return 0.5 + 1.2 * fractalNoise(x * 0.06 + warpX + 0.31, z * 0.06 + warpZ + 0.47, 4, 2)
end)`],
'pg-voronoi':['S','A 40 × 40 floor split into 12 Voronoi regions: each tile takes the colour of its nearest seed.',`
local random = Random.new(8)
local SIZE, CELL = 40, 1
local seeds = {}
for i = 1, 12 do
	seeds[i] = {
		position = Vector2.new(random:NextNumber(0, SIZE), random:NextNumber(0, SIZE)),
		color = Color3.fromHSV(i * 0.618 % 1, 0.55, 0.9),
	}
end
for x = 1, SIZE do
	for z = 1, SIZE do
		local point = Vector2.new(x, z)
		local best, nearest, secondNearest = seeds[1], math.huge, math.huge
		for _, seed in seeds do
			local distance = (point - seed.position).Magnitude
			if distance < nearest then
				secondNearest, nearest, best = nearest, distance, seed
			elseif distance < secondNearest then
				secondNearest = distance
			end
		end
		makePart(
			Vector3.new(CELL, 0.4, CELL),
			ORIGIN + Vector3.new(x - SIZE / 2, 0.2, z - SIZE / 2),
			secondNearest - nearest < 1 and Color3.fromRGB(40, 40, 45) or best.color
		) -- dark tiles on the borders
	end
	task.wait()
end`],
'pg-poisson':['S','Plants up to 150 trees that are never closer than 4 studs to each other (Poisson disc by rejection).',`
local MIN_DISTANCE, TARGET = 4, 150
local random = Random.new()
local trees = {}
for _ = 1, TARGET * 40 do
	if #trees >= TARGET then
		break
	end
	local candidate = Vector2.new(random:NextNumber(-30, 30), random:NextNumber(-30, 30))
	local farEnough = true
	for _, tree in trees do
		if (tree - candidate).Magnitude < MIN_DISTANCE then
			farEnough = false
			break
		end
	end
	if farEnough then
		table.insert(trees, candidate)
		makePart(
			Vector3.new(0.8, 3, 0.8),
			ORIGIN + Vector3.new(candidate.X, 1.5, candidate.Y),
			Color3.fromRGB(110, 80, 50)
		)
		makePart(
			Vector3.new(3, 3, 3),
			ORIGIN + Vector3.new(candidate.X, 4, candidate.Y),
			Color3.fromRGB(60, 150, 70),
			{ Shape = Enum.PartType.Ball }
		)
	end
end
print(#trees, "trees placed")`],
'pg-caves':['S','Generates a cave map: random walls, then 4 smoothing passes where a cell becomes wall if 5+ neighbours are walls.',`
local W, H, FILL = 48, 36, 0.46
local random = Random.new()
local grid = {}
for x = 1, W do
	grid[x] = {}
	for z = 1, H do
		grid[x][z] = x == 1 or z == 1 or x == W or z == H or random:NextNumber() < FILL
	end
end
for _ = 1, 4 do
	local nextGrid = {}
	for x = 1, W do
		nextGrid[x] = {}
		for z = 1, H do
			local walls = 0
			for offsetX = -1, 1 do
				for offsetZ = -1, 1 do
					if
						(offsetX ~= 0 or offsetZ ~= 0)
						and (not grid[x + offsetX] or grid[x + offsetX][z + offsetZ] ~= false)
					then
						walls += 1
					end
				end
			end
			nextGrid[x][z] = walls >= 5 or (walls >= 4 and grid[x][z])
		end
	end
	grid = nextGrid
end
for x = 1, W do
	for z = 1, H do
		if grid[x][z] then
			makePart(
				Vector3.new(1, 4, 1),
				ORIGIN + Vector3.new(x - W / 2, 2, z - H / 2),
				Color3.fromRGB(90, 85, 80)
			)
		end
	end
	task.wait()
end`],
'pg-walk':['S','Carves a cave with a random walk: 1500 random steps from the centre, building a floor tile wherever the digger has been.',`
local STEPS = 1500
local random = Random.new()
local visited = {}
local x, z = 0, 0
local DIRECTIONS = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }
for _ = 1, STEPS do
	local key = x .. "," .. z
	if not visited[key] then
		visited[key] = true
		makePart(Vector3.new(1, 0.4, 1), ORIGIN + Vector3.new(x, 0.2, z), Color3.fromRGB(226, 133, 26))
	end
	local direction = DIRECTIONS[random:NextInteger(1, 4)]
	x = math.clamp(x + direction[1], -25, 25)
	z = math.clamp(z + direction[2], -25, 25)
end`],
'pg-island':['S','Generates an island: layered noise multiplied by a round falloff mask, so the land always ends in a beach.',NOISEGRID+`
buildTerrain(function(x, z)
	local normalizedX, normalizedZ = (x - SIZE / 2) / (SIZE / 2), (z - SIZE / 2) / (SIZE / 2)
	local mask = math.clamp(1 - math.sqrt(normalizedX * normalizedX + normalizedZ * normalizedZ) ^ 2, 0, 1)
	return (0.5 + 1.2 * fractalNoise(x * 0.08 + 0.31, z * 0.08 + 0.47, 4, 11)) * mask
end)`],
'pg-lsystem':['S','Grows a bush from the L-system rule F → F[+F]F[−F]F, drawn with parts by a turtle that turns and branches.',`
local RULE, ITERATIONS, ANGLE, LENGTH = "F[+F]F[-F]F", 3, math.rad(25.7), 1.2
local sentence = "F"
for _ = 1, ITERATIONS do
	sentence = sentence:gsub("F", RULE)
end
local position, angle, stack = ORIGIN, math.rad(90), {}
for symbol in sentence:gmatch(".") do
	if symbol == "F" then
		local nextPos = position + Vector3.new(math.cos(angle), math.sin(angle), 0) * LENGTH
		local branch = makePart(Vector3.new(0.25, 0.25, LENGTH), position, Color3.fromRGB(90, 140, 60))
		branch.CFrame = CFrame.lookAt((position + nextPos) / 2, nextPos)
		position = nextPos
	elseif symbol == "+" then
		angle += ANGLE
	elseif symbol == "-" then
		angle -= ANGLE
	elseif symbol == "[" then
		table.insert(stack, { position, angle })
	elseif symbol == "]" then
		position, angle = table.unpack(table.remove(stack))
	end
end`],

/* ===== Graphs & pathfinding ===== */
'pf-bfs':['S','Builds a small maze and runs breadth-first search from one corner to the other, colouring cells as they are explored, then shows the path.',MAZE+`
local start, goal = { 1, 1 }, { WIDTH, HEIGHT }
local cameFrom = { [cellKey(1, 1)] = false }
local queue, head = { start }, 1
while head <= #queue do
	local cell = queue[head]
	head += 1
	if cell[1] == goal[1] and cell[2] == goal[2] then
		break
	end
	makePart(
		Vector3.new(CELL - 0.6, 0.3, CELL - 0.6),
		cellPosition(cell[1], cell[2]) + Vector3.new(0, 0.25, 0),
		Color3.fromHSV(0.5 + head / 600, 0.5, 0.9),
		{ CanCollide = false }
	)
	for _, neighbour in neighbours(cell[1], cell[2]) do
		if cameFrom[cellKey(neighbour[1], neighbour[2])] == nil then
			cameFrom[cellKey(neighbour[1], neighbour[2])] = cell
			table.insert(queue, neighbour)
		end
	end
	task.wait(0.01)
end
local path, cell = {}, cameFrom[cellKey(goal[1], goal[2])] ~= nil and goal or nil
while cell do
	table.insert(path, 1, cell)
	cell = cameFrom[cellKey(cell[1], cell[2])]
end
showPath(path)
print(#path > 0 and (#path - 1 .. " steps") or "no path")`],

'pf-dijkstra':['S','Dijkstra with costs: mud cells (brown) cost 5. The path detours around mud instead of taking the fewest steps.',MAZE+`
local mud = {}
for x = 1, WIDTH do
	for z = 1, HEIGHT do
		if isOpen(x, z) and math.noise(x * 0.25, z * 0.25, 3) > 0.1 then
			mud[cellKey(x, z)] = true
			makePart(
				Vector3.new(CELL - 0.2, 0.25, CELL - 0.2),
				cellPosition(x, z) + Vector3.new(0, 0.15, 0),
				Color3.fromRGB(110, 80, 50)
			)
		end
	end
end
local cost, cameFrom, openList = { [cellKey(1, 1)] = 0 }, {}, { { 1, 1 } }
while #openList > 0 do
	local bestIndex = 1
	for i = 2, #openList do
		if
			cost[cellKey(openList[i][1], openList[i][2])]
			< cost[cellKey(openList[bestIndex][1], openList[bestIndex][2])]
		then
			bestIndex = i
		end
	end
	local cell = table.remove(openList, bestIndex)
	if cell[1] == WIDTH and cell[2] == HEIGHT then
		break
	end
	for _, neighbour in neighbours(cell[1], cell[2]) do
		local neighbourKey = cellKey(neighbour[1], neighbour[2])
		local newCost = cost[cellKey(cell[1], cell[2])] + (mud[neighbourKey] and 5 or 1)
		if cost[neighbourKey] == nil or newCost < cost[neighbourKey] then
			cost[neighbourKey] = newCost
			cameFrom[neighbourKey] = cell
			table.insert(openList, neighbour)
		end
	end
end
local path, cell = {}, { WIDTH, HEIGHT }
while cell do
	table.insert(path, 1, cell)
	cell = cameFrom[cellKey(cell[1], cell[2])]
end
showPath(path)
print("total cost", cost[cellKey(WIDTH, HEIGHT)])`],

'pf-astar':['S','A* through a maze: the priority is cost so far plus a Manhattan estimate to the goal, so it explores far fewer cells than Dijkstra.',MAZE+`
local function estimate(x, z)
	return math.abs(x - WIDTH) + math.abs(z - HEIGHT)
end
local cost, cameFrom, openList, explored = { [cellKey(1, 1)] = 0 }, {}, { { 1, 1 } }, 0
while #openList > 0 do
	local bestIndex = 1
	for i = 2, #openList do
		local candidate, best = openList[i], openList[bestIndex]
		if
			cost[cellKey(candidate[1], candidate[2])] + estimate(candidate[1], candidate[2])
			< cost[cellKey(best[1], best[2])] + estimate(best[1], best[2])
		then
			bestIndex = i
		end
	end
	local cell = table.remove(openList, bestIndex)
	explored += 1
	makePart(
		Vector3.new(CELL - 0.8, 0.3, CELL - 0.8),
		cellPosition(cell[1], cell[2]) + Vector3.new(0, 0.25, 0),
		Color3.fromRGB(18, 147, 154),
		{ CanCollide = false }
	)
	if cell[1] == WIDTH and cell[2] == HEIGHT then
		break
	end
	for _, neighbour in neighbours(cell[1], cell[2]) do
		local neighbourKey = cellKey(neighbour[1], neighbour[2])
		local newCost = cost[cellKey(cell[1], cell[2])] + 1
		if cost[neighbourKey] == nil or newCost < cost[neighbourKey] then
			cost[neighbourKey] = newCost
			cameFrom[neighbourKey] = cell
			table.insert(openList, neighbour)
		end
	end
	task.wait(0.02)
end
local path, cell = {}, cameFrom[cellKey(WIDTH, HEIGHT)] and { WIDTH, HEIGHT } or nil
while cell do
	table.insert(path, 1, cell)
	cell = cameFrom[cellKey(cell[1], cell[2])]
end
showPath(path)
print("explored", explored, "cells")`],

'pf-heuristics':['S','Runs A* twice on the same maze with 8-way moves: with the octile heuristic (exact) and with none (Dijkstra), and prints how many cells each explored.',MAZE+`
local SQRT2 = math.sqrt(2)
local function run(useHeuristic)
	local function estimate(x, z)
		if not useHeuristic then
			return 0
		end
		local offsetX, offsetZ = math.abs(x - WIDTH), math.abs(z - HEIGHT)
		return offsetX + offsetZ + (SQRT2 - 2) * math.min(offsetX, offsetZ)
	end
	local cost, openList, closed, explored = { [cellKey(1, 1)] = 0 }, { { 1, 1 } }, {}, 0
	while #openList > 0 do
		local bestIndex = 1
		for i = 2, #openList do
			local candidate, best = openList[i], openList[bestIndex]
			if
				cost[cellKey(candidate[1], candidate[2])] + estimate(candidate[1], candidate[2])
				< cost[cellKey(best[1], best[2])] + estimate(best[1], best[2])
			then
				bestIndex = i
			end
		end
		local cell = table.remove(openList, bestIndex)
		if not closed[cellKey(cell[1], cell[2])] then
			closed[cellKey(cell[1], cell[2])] = true
			explored += 1
			if cell[1] == WIDTH and cell[2] == HEIGHT then
				return explored, cost[cellKey(WIDTH, HEIGHT)]
			end
			for offsetX = -1, 1 do
				for offsetZ = -1, 1 do
					local nextX, nextZ = cell[1] + offsetX, cell[2] + offsetZ
					if
						(offsetX ~= 0 or offsetZ ~= 0)
						and isOpen(nextX, nextZ)
						and (
							offsetX == 0
							or offsetZ == 0
							or (isOpen(nextX, cell[2]) and isOpen(cell[1], nextZ))
						)
					then
						local neighbourKey = cellKey(nextX, nextZ)
						local newCost = cost[cellKey(cell[1], cell[2])]
							+ ((offsetX ~= 0 and offsetZ ~= 0) and SQRT2 or 1)
						if cost[neighbourKey] == nil or newCost < cost[neighbourKey] then
							cost[neighbourKey] = newCost
							table.insert(openList, { nextX, nextZ })
						end
					end
				end
			end
		end
	end
	return explored, nil
end
local exploredOctile, lengthOctile = run(true)
local exploredDijkstra, lengthDijkstra = run(false)
print(string.format("A* with octile: explored %d cells, length %.2f", exploredOctile, lengthOctile or -1))
print(string.format("Dijkstra:       explored %d cells, length %.2f", exploredDijkstra, lengthDijkstra or -1))`],

'pf-flow':['S','A flow field: one BFS from the goal gives every cell a distance; 30 balls just step to their lowest neighbour each tick and all reach the goal.',MAZE+`
local goal = { WIDTH, HEIGHT }
local distance = { [cellKey(WIDTH, HEIGHT)] = 0 }
local queue, head = { goal }, 1
while head <= #queue do
	local cell = queue[head]
	head += 1
	for _, neighbour in neighbours(cell[1], cell[2]) do
		if distance[cellKey(neighbour[1], neighbour[2])] == nil then
			distance[cellKey(neighbour[1], neighbour[2])] = distance[cellKey(cell[1], cell[2])] + 1
			table.insert(queue, neighbour)
		end
	end
end
makePart(
	Vector3.new(2, 2, 2),
	cellPosition(WIDTH, HEIGHT) + Vector3.new(0, 1, 0),
	Color3.fromRGB(230, 60, 60),
	{ Material = Enum.Material.Neon }
)
local units = {}
local random = Random.new()
while #units < 30 do
	local x, z = random:NextInteger(1, WIDTH), random:NextInteger(1, HEIGHT)
	if distance[cellKey(x, z)] then
		table.insert(units, {
			x = x,
			z = z,
			part = makePart(
				Vector3.new(1, 1, 1),
				cellPosition(x, z) + Vector3.new(0, 1, 0),
				Color3.fromRGB(226, 133, 26),
				{ Shape = Enum.PartType.Ball, CanCollide = false }
			),
		})
	end
end
while true do
	for _, unit in units do
		local best, bestDistance = nil, distance[cellKey(unit.x, unit.z)]
		for _, neighbour in neighbours(unit.x, unit.z) do
			local neighbourDistance = distance[cellKey(neighbour[1], neighbour[2])]
			if neighbourDistance and neighbourDistance < bestDistance then
				best, bestDistance = neighbour, neighbourDistance
			end
		end
		if best then
			unit.x, unit.z = best[1], best[2]
		end
		TweenService:Create(
			unit.part,
			TweenInfo.new(0.25, Enum.EasingStyle.Linear),
			{ Position = cellPosition(unit.x, unit.z) + Vector3.new(0, 1, 0) }
		):Play()
	end
	task.wait(0.25)
end`],

'pf-smooth':['S','Finds a grid path with BFS, then string-pulls it: from each kept point, skip to the furthest point with clear line of sight. Grey = raw, orange = smoothed.',MAZE+`
local cameFrom = { [cellKey(1, 1)] = false }
local queue, head = { { 1, 1 } }, 1
while head <= #queue do
	local cell = queue[head]
	head += 1
	for _, neighbour in neighbours(cell[1], cell[2]) do
		if cameFrom[cellKey(neighbour[1], neighbour[2])] == nil then
			cameFrom[cellKey(neighbour[1], neighbour[2])] = cell
			table.insert(queue, neighbour)
		end
	end
end
local path, cell = {}, cameFrom[cellKey(WIDTH, HEIGHT)] ~= nil and { WIDTH, HEIGHT } or nil
while cell do
	table.insert(path, 1, cell)
	cell = cameFrom[cellKey(cell[1], cell[2])]
end
showPath(path, Color3.fromRGB(140, 140, 150))
local function lineOfSight(fromCell, toCell)
	local startX, startZ, endX, endZ = fromCell[1], fromCell[2], toCell[1], toCell[2]
	local deltaX, deltaZ = math.abs(endX - startX), -math.abs(endZ - startZ)
	local stepX, stepZ = startX < endX and 1 or -1, startZ < endZ and 1 or -1
	local errorTerm = deltaX + deltaZ
	while true do
		if not isOpen(startX, startZ) then
			return false
		end
		if startX == endX and startZ == endZ then
			return true
		end
		local doubledError = 2 * errorTerm
		if doubledError >= deltaZ then
			errorTerm += deltaZ
			startX += stepX
		end
		if doubledError <= deltaX then
			errorTerm += deltaX
			startZ += stepZ
		end
	end
end
local kept, i = { path[1] }, 1
while path[i] and i < #path do
	local j = #path
	while j > i + 1 and not lineOfSight(path[i], path[j]) do
		j -= 1
	end
	table.insert(kept, path[j])
	i = j
end
for index = 1, #kept - 1 do
	drawLine(
		makeLinePart(),
		cellPosition(kept[index][1], kept[index][2]) + Vector3.new(0, 1, 0),
		cellPosition(kept[index + 1][1], kept[index + 1][2]) + Vector3.new(0, 1, 0)
	)
end
print(#path, "waypoints ->", #kept)`],

'pf-waypoints':['S','A small graph of waypoint pads joined by edges. Dijkstra finds the shortest route from pad 1 to pad 8 and a ball walks it.',`
local NODES = {
	Vector3.new(-14, 0, -8),
	Vector3.new(-6, 0, -12),
	Vector3.new(2, 0, -8),
	Vector3.new(12, 0, -10),
	Vector3.new(-12, 0, 4),
	Vector3.new(-2, 0, 2),
	Vector3.new(6, 0, 6),
	Vector3.new(14, 0, 8),
}
local EDGES = {
	{ 1, 2 },
	{ 2, 3 },
	{ 3, 4 },
	{ 1, 5 },
	{ 2, 6 },
	{ 3, 6 },
	{ 3, 7 },
	{ 4, 8 },
	{ 5, 6 },
	{
		6,
		7,
	},
	{
		7,
		8,
	},
}
local graph = {}
for i, point in NODES do
	graph[i] = {}
	makeLabel(makePart(Vector3.new(2, 0.4, 2), ORIGIN + point, Color3.fromRGB(18, 147, 154)), tostring(i))
end
for _, edge in EDGES do
	local length = (NODES[edge[1]] - NODES[edge[2]]).Magnitude
	table.insert(graph[edge[1]], { edge[2], length })
	table.insert(graph[edge[2]], { edge[1], length })
	drawLine(
		makeLinePart(Color3.fromRGB(120, 120, 130)),
		ORIGIN + NODES[edge[1]] + Vector3.new(0, 0.3, 0),
		ORIGIN + NODES[edge[2]] + Vector3.new(0, 0.3, 0)
	)
end
local distance, previousNode, visited = {}, {}, {}
for i = 1, #NODES do
	distance[i] = math.huge
end
distance[1] = 0
for _ = 1, #NODES do
	local current
	for i = 1, #NODES do
		if not visited[i] and (not current or distance[i] < distance[current]) then
			current = i
		end
	end
	visited[current] = true
	for _, edge in graph[current] do
		local neighbour, weight = edge[1], edge[2]
		if distance[current] + weight < distance[neighbour] then
			distance[neighbour] = distance[current] + weight
			previousNode[neighbour] = current
		end
	end
end
local route, node = {}, 8
while node do
	table.insert(route, 1, node)
	node = previousNode[node]
end
print("route:", table.concat(route, " -> "), string.format("(%.1f studs)", distance[8]))
local walker = makePart(
	Vector3.new(1.5, 1.5, 1.5),
	ORIGIN + NODES[1] + Vector3.new(0, 1, 0),
	Color3.fromRGB(226, 133, 26),
	{ Shape = Enum.PartType.Ball }
)
while true do
	for _, i in route do
		local tween = TweenService:Create(
			walker,
			TweenInfo.new(0.8, Enum.EasingStyle.Linear),
			{ Position = ORIGIN + NODES[i] + Vector3.new(0, 1, 0) }
		)
		tween:Play()
		tween.Completed:Wait()
	end
	walker.Position = ORIGIN + NODES[1] + Vector3.new(0, 1, 0)
end`],

'pf-follow':['S','A ball follows a list of waypoints, moving on to the next one when it gets within an arrive radius instead of touching it exactly.',`
local WAYPOINTS = {
	Vector3.new(-12, 1, -8),
	Vector3.new(-12, 1, 6),
	Vector3.new(-2, 1, 6),
	Vector3.new(-2, 1, -4),
	Vector3.new(8, 1, -4),
	Vector3.new(8, 1, 8),
	Vector3.new(14, 1, 8),
}
local RADIUS, SPEED = 1.5, 10
for _, waypoint in WAYPOINTS do
	makePart(
		Vector3.new(RADIUS * 2, 0.2, RADIUS * 2),
		ORIGIN + waypoint - Vector3.new(0, 0.9, 0),
		Color3.fromRGB(18, 147, 154),
		{
			Shape = Enum.PartType.Cylinder,
			Orientation = Vector3.new(0, 0, 90),
			Transparency = 0.5,
			CanCollide = false,
		}
	)
end
local walker = makePart(
	Vector3.new(1.4, 1.4, 1.4),
	ORIGIN + WAYPOINTS[1],
	Color3.fromRGB(226, 133, 26),
	{ Shape = Enum.PartType.Ball, CanCollide = false }
)
local index = 2
RunService.Heartbeat:Connect(function(deltaTime)
	local goal = ORIGIN + WAYPOINTS[index]
	local offset = goal - walker.Position
	if offset.Magnitude < RADIUS then
		index += 1
		if index > #WAYPOINTS then
			index = 2
			walker.Position = ORIGIN + WAYPOINTS[1]
		end
		return
	end
	walker.Position += offset.Unit * math.min(SPEED * deltaTime, offset.Magnitude)
end)`],

/* ===== Matrices ===== */
'mx-columns':['S','Prints a turning part\'s 12 CFrame components and shows that the rotation columns are its Right, Up and Back vectors.',`
local part = makePart(Vector3.new(2, 1, 4), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(226, 133, 26))
local label = makeLabel(part)
RunService.Heartbeat:Connect(function()
	part.CFrame = CFrame.new(part.Position)
		* CFrame.fromEulerAnglesYXZ(math.sin(os.clock()) * 0.4, os.clock() * 0.5, 0)
	local x, y, z, R00, R01, R02, R10, R11, R12, R20, R21, R22 = part.CFrame:GetComponents()
	label.Text =
		string.format("Right (%.2f, %.2f, %.2f)  Look (%.2f, %.2f, %.2f)", R00, R10, R20, -R02, -R12, -R22)
end)`],
'mx-mulvec':['S','A marker sits at a fixed local offset from a spinning part, worked out as Position + Right·x + Up·y − Look·z (the same as cf * v).',`
local part = makePart(Vector3.new(2, 1, 4), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(163, 162, 165))
local marker = makePart(
	Vector3.new(1, 1, 1),
	ORIGIN,
	Color3.fromRGB(226, 133, 26),
	{ Shape = Enum.PartType.Ball, CanCollide = false }
)
local localOffset = Vector3.new(3, 2, -2)
RunService.Heartbeat:Connect(function()
	part.CFrame = CFrame.new(part.Position) * CFrame.Angles(0, os.clock(), 0)
	local frame = part.CFrame
	marker.Position = frame.Position
		+ frame.RightVector * localOffset.X
		+ frame.UpVector * localOffset.Y
		- frame.LookVector * localOffset.Z -- = cf * v
end)`],
'mx-fk':['S','A three-joint robot arm animated with forward kinematics: each joint is parent × rotation × offset along the bone.',`
local LENGTHS = { 4, 3.5, 2.5 }
local BASE = CFrame.new(ORIGIN + Vector3.new(0, 1, 0))
local bones = {}
for i, boneLength in LENGTHS do
	bones[i] = makePart(
		Vector3.new(0.9, boneLength, 0.9),
		ORIGIN,
		Color3.fromHSV(i / 4, 0.6, 0.9),
		{ CanCollide = false }
	)
end
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	local angles = { math.sin(now * 0.8) * 0.8, math.sin(now * 1.1) * 1.2 - 0.6, math.sin(now * 1.7) * 0.9 }
	local frame = BASE * CFrame.Angles(0, now * 0.3, 0)
	for i, boneLength in LENGTHS do
		frame = frame * CFrame.Angles(0, 0, angles[i])
		bones[i].CFrame = frame * CFrame.new(0, boneLength / 2, 0)
		frame = frame * CFrame.new(0, boneLength, 0)
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
RunService.Heartbeat:Connect(function(deltaTime)
	part.CFrame = part.CFrame * CFrame.Angles(deltaTime * 0.7, deltaTime * 1.1, deltaTime * 0.3)
	frames += 1
	if frames % 100 == 0 then
		part.CFrame = part.CFrame:Orthonormalize()
	end
	local frame = part.CFrame
	local skew = math.abs(frame.RightVector:Dot(frame.UpVector))
		+ math.abs(frame.UpVector:Dot(frame.LookVector))
	label.Text = string.format("frames %d  skew %.1e", frames, skew)
end)`],
'mx-basis':['L','A marker moves in front of you in camera-relative directions as you hold WASD: the input is turned into world space with the camera\'s flattened axes.',`
local marker = makePart(
	Vector3.new(1.5, 1.5, 1.5),
	ORIGIN,
	Color3.fromRGB(226, 133, 26),
	{ Shape = Enum.PartType.Ball, CanCollide = false, CanQuery = false }
)
local UserInputService = game:GetService("UserInputService")
local offset = Vector3.zero
RunService.RenderStepped:Connect(function(deltaTime)
	local root = getMyRootPart()
	if not root then
		return
	end
	local input = Vector2.new(
		(UserInputService:IsKeyDown(Enum.KeyCode.D) and 1 or 0)
			- (UserInputService:IsKeyDown(Enum.KeyCode.A) and 1 or 0),
		(UserInputService:IsKeyDown(Enum.KeyCode.W) and 1 or 0)
			- (UserInputService:IsKeyDown(Enum.KeyCode.S) and 1 or 0)
	)
	local look = camera.CFrame.LookVector
	local forward = Vector3.new(look.X, 0, look.Z).Unit
	local right = Vector3.new(-forward.Z, 0, forward.X)
	local move = right * input.X + forward * input.Y
	offset = offset:Lerp(move * 6, 1 - math.exp(-6 * deltaTime))
	marker.Position = root.Position + Vector3.new(0, 3, 0) + offset
end)`],
'mx-scale':['S','A small house model grows and shrinks around its base: each part\'s size and its offset from the pivot are scaled by the same factor.',`
local pivot = ORIGIN
local layout = {
	{ Vector3.new(0, 2, 0), Vector3.new(6, 4, 6), Color3.fromRGB(220, 200, 170) },
	{ Vector3.new(0, 5, 0), Vector3.new(7, 2, 7), Color3.fromRGB(170, 60, 50) },
	{ Vector3.new(0, 1.2, -3.05), Vector3.new(1.5, 2.4, 0.2), Color3.fromRGB(100, 70, 40) },
}
local parts = {}
for i, entry in layout do
	parts[i] = makePart(entry[2], pivot + entry[1], entry[3])
end
RunService.Heartbeat:Connect(function()
	local scale = 1 + 0.5 * math.sin(os.clock())
	for i, entry in layout do
		parts[i].Size = entry[2] * scale
		parts[i].Position = pivot + entry[1] * scale -- offset from the pivot grows too
	end
end)`],
'mx-mirror':['S','A spinning arrow and its mirror twin across a glass plane. Positions and axes are reflected, then the frame is rebuilt with CFrame.lookAt.',`
local MIRROR_X = ORIGIN.X
makePart(
	Vector3.new(0.2, 10, 16),
	ORIGIN + Vector3.new(0, 5, 0),
	Color3.fromRGB(150, 200, 255),
	{ Transparency = 0.7, CanCollide = false }
)
local original = makePart(Vector3.new(1, 1, 4), ORIGIN, Color3.fromRGB(226, 133, 26))
local twin = makePart(Vector3.new(1, 1, 4), ORIGIN, Color3.fromRGB(226, 133, 26), { Transparency = 0.4 })
local function reflect(vector)
	return Vector3.new(-vector.X, vector.Y, vector.Z)
end
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	original.CFrame = CFrame.new(ORIGIN + Vector3.new(5 + math.sin(now) * 2, 4, math.cos(now) * 4))
		* CFrame.fromEulerAnglesYXZ(math.sin(now) * 0.5, now, 0)
	local originalPosition = original.Position
	local mirroredPosition =
		Vector3.new(2 * MIRROR_X - originalPosition.X, originalPosition.Y, originalPosition.Z)
	twin.CFrame = CFrame.lookAt(
		mirroredPosition,
		mirroredPosition + reflect(original.CFrame.LookVector),
		reflect(original.CFrame.UpVector)
	)
end)`],

/* ===== Calculus ===== */
'cl-derivative':['S','A ball moves up and down; its speed is measured with a numeric derivative of the position function and shown as an arrow.',`
local function height(now)
	return 6 + 3 * math.sin(now * 1.5)
end
local ball = makePart(
	Vector3.new(1.5, 1.5, 1.5),
	ORIGIN,
	Color3.fromRGB(226, 133, 26),
	{ Shape = Enum.PartType.Ball, CanCollide = false }
)
local arrow = makeLinePart(Color3.fromRGB(18, 147, 154))
local label = makeLabel(ball)
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	local step = 0.001
	local velocity = (height(now + step) - height(now - step)) / (2 * step) -- slope of the height curve
	ball.Position = ORIGIN + Vector3.new(0, height(now), 0)
	drawLine(arrow, ball.Position, ball.Position + Vector3.new(0, velocity * 0.5, 0))
	label.Text = string.format("speed %.2f", velocity)
end)`],
'cl-velocity':['S','A label over each player shows their speed measured from position samples over the last 8 frames (Δposition ÷ Δtime).',`
local history, labels = {}, {}
RunService.Heartbeat:Connect(function()
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local playerHistory = history[player] or {}
			history[player] = playerHistory
			table.insert(playerHistory, { os.clock(), root.Position })
			if #playerHistory > 9 then
				table.remove(playerHistory, 1)
			end
			if not labels[player] or not labels[player].Parent or labels[player].Parent.Parent ~= root then
				labels[player] = makeLabel(root)
			end
			if #playerHistory >= 2 then
				local oldest, newest = playerHistory[1], playerHistory[#playerHistory]
				local velocity = (newest[2] - oldest[2]) / (newest[1] - oldest[1])
				labels[player].Text = string.format("%.1f studs/s", velocity.Magnitude)
			end
		end
	end
end)`],
'cl-integral':['S','A car accelerates, cruises and brakes. Distance is the running sum of speed × dt (an integral), and the odometer shows it.',`
local car = makePart(Vector3.new(4, 2, 2), ORIGIN + Vector3.new(-25, 1, 0), Color3.fromRGB(230, 60, 60))
local label = makeLabel(car)
local function speedAt(elapsed)
	if elapsed < 3 then
		return 4 * elapsed
	elseif elapsed < 7 then
		return 12
	else
		return math.max(0, 12 - 4 * (elapsed - 7))
	end
end
while true do
	local elapsed, distance = 0, 0
	while elapsed < 10 do
		local deltaTime = RunService.Heartbeat:Wait()
		elapsed += deltaTime
		distance += speedAt(elapsed) * deltaTime -- add up speed × time
		car.Position = ORIGIN + Vector3.new(-25 + distance * 0.6, 1, 0)
		label.Text = string.format("speed %.1f   travelled %.1f", speedAt(elapsed), distance)
	end
	task.wait(1)
end`],
'cl-newton':['S','Solves "when does a ball thrown up at 18 studs/s reach height 6?" with Newton\'s method and prints each guess.',`
local GRAVITY = 20
local function heightError(guess)
	return 18 * guess - 0.5 * GRAVITY * guess * guess - 6
end
local function heightErrorSlope(guess)
	return 18 - GRAVITY * guess
end
local guess = 0.1
for i = 1, 6 do
	guess = guess - heightError(guess) / heightErrorSlope(guess)
	print(string.format("guess %d: t = %.6f  (f = %.2e)", i, guess, heightError(guess)))
end
local ball = makePart(
	Vector3.new(1, 1, 1),
	ORIGIN,
	Color3.fromRGB(226, 133, 26),
	{ Shape = Enum.PartType.Ball, CanCollide = false }
)
local mark = makePart(
	Vector3.new(4, 0.2, 4),
	ORIGIN + Vector3.new(0, 6, 0),
	Color3.fromRGB(18, 147, 154),
	{ Transparency = 0.5, CanCollide = false }
)
makeLabel(mark, string.format("height 6 at t = %.3f s", guess))
while true do
	local start = os.clock()
	while os.clock() - start < 1.8 do
		local elapsed = os.clock() - start
		ball.Position = ORIGIN
			+ Vector3.new(0, math.max(0, 18 * elapsed - 0.5 * GRAVITY * elapsed * elapsed), 0)
		RunService.Heartbeat:Wait()
	end
end`],
'cl-bisection':['S','Uses bisection to find the distance where a falling-off light reaches exactly 25% brightness, and places a marker there.',`
local function brightness(distance)
	return 1 / (1 + 0.02 * distance * distance)
end
local function brightnessError(distance)
	return brightness(distance) - 0.25
end
local low, high = 0, 40
for i = 1, 25 do
	local middle = (low + high) / 2
	if math.sign(brightnessError(low)) ~= math.sign(brightnessError(middle)) then
		high = middle
	else
		low = middle
	end
end
local distance = (low + high) / 2
print(string.format("25%% brightness at %.4f studs", distance))
local lamp = makePart(
	Vector3.new(1.5, 1.5, 1.5),
	ORIGIN + Vector3.new(0, 2, 0),
	Color3.fromRGB(255, 220, 120),
	{ Material = Enum.Material.Neon }
)
local light = Instance.new("PointLight")
light.Range = 40
light.Parent = lamp
local mark =
	makePart(Vector3.new(1, 4, 1), ORIGIN + Vector3.new(distance, 2, 0), Color3.fromRGB(226, 133, 26))
makeLabel(mark, string.format("25%% here (%.2f studs)", distance))`],
'cl-gradient':['S','Balls roll downhill on noise terrain using gradient descent: measure the slope numerically, step against it, repeat.',`
local SIZE, CELL, STEP_SIZE = 24, 2, 3
local function height(x, z)
	return 4 + 3 * math.noise(x * 0.06 + 0.3, z * 0.06 + 0.7, 3) + 0.01 * ((x - 24) ^ 2 + (z - 24) ^ 2)
end
for i = 1, SIZE do
	for j = 1, SIZE do
		local x, z = i * CELL, j * CELL
		local columnHeight = height(x, z)
		makePart(
			Vector3.new(CELL, columnHeight, CELL),
			ORIGIN + Vector3.new(x - SIZE, columnHeight / 2, z - SIZE),
			Color3.fromRGB(70, 150, 90)
				:Lerp(Color3.fromRGB(240, 230, 200), math.clamp((columnHeight - 2) / 8, 0, 1))
		)
	end
	task.wait()
end
local function gradient(x, z)
	local epsilon = 0.05
	return (height(x + epsilon, z) - height(x - epsilon, z)) / (2 * epsilon),
		(height(x, z + epsilon) - height(x, z - epsilon)) / (2 * epsilon)
end
local random = Random.new()
for _ = 1, 5 do
	task.spawn(function()
		local ball = makePart(
			Vector3.new(1.4, 1.4, 1.4),
			ORIGIN,
			Color3.fromHSV(random:NextNumber(), 0.7, 1),
			{ Shape = Enum.PartType.Ball, CanCollide = false, Material = Enum.Material.Neon }
		)
		while true do
			local x, z = random:NextNumber(CELL, SIZE * CELL), random:NextNumber(CELL, SIZE * CELL)
			for _ = 1, 100 do
				local slopeX, slopeZ = gradient(x, z)
				x = math.clamp(x - STEP_SIZE * slopeX, CELL, SIZE * CELL)
				z = math.clamp(z - STEP_SIZE * slopeZ, CELL, SIZE * CELL)
				ball.Position = ORIGIN + Vector3.new(x - SIZE, height(x, z) + 1, z - SIZE)
				task.wait(0.05)
			end
		end
	end)
end`],
'cl-arclength':['S','Measures the length of a curved path by adding up straight pieces, printing the estimate for 2, 8, 32 and 128 pieces.',`
local function pointAt(t)
	return ORIGIN + Vector3.new(-12 + 24 * t, 3 + 3 * math.sin(t * math.pi * 3), 0)
end
local function arcLength(pieces)
	local total, previous = 0, pointAt(0)
	for i = 1, pieces do
		local point = pointAt(i / pieces)
		total += (point - previous).Magnitude
		previous = point
	end
	return total
end
for _, pieces in { 2, 8, 32, 128 } do
	print(pieces, "pieces:", string.format("%.3f", arcLength(pieces)))
end
for i = 0, 128 do
	makePart(
		Vector3.new(0.3, 0.3, 0.3),
		pointAt(i / 128),
		Color3.fromRGB(226, 133, 26),
		{ CanCollide = false }
	)
end
local sign = makePart(Vector3.new(1, 1, 1), ORIGIN + Vector3.new(0, 9, 0), Color3.new(1, 1, 1))
makeLabel(sign, string.format("length about %.2f studs", arcLength(256)))`],
'cl-continuity':['S','Two blocks go through the same waypoints: linear legs (speed jumps at each point) vs a Catmull-Rom spline (smooth speed).',`
local WAYPOINTS =
	{ Vector3.new(-14, 2, 0), Vector3.new(-5, 6, -6), Vector3.new(4, 2, 6), Vector3.new(14, 6, 0) }
for _, point in WAYPOINTS do
	makePart(Vector3.new(0.8, 0.8, 0.8), ORIGIN + point, Color3.fromRGB(194, 65, 142), { CanCollide = false })
end
local linear =
	makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(230, 60, 60), { CanCollide = false })
local smooth =
	makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false })
makeLabel(linear, "linear")
makeLabel(smooth, "spline")
local function waypoint(i)
	return ORIGIN + WAYPOINTS[math.clamp(i, 1, #WAYPOINTS)]
end
local function catmullRom(p0, p1, p2, p3, alpha)
	return 0.5
		* (
			(2 * p1)
			+ (p2 - p0) * alpha
			+ (2 * p0 - 5 * p1 + 4 * p2 - p3) * alpha ^ 2
			+ (3 * p1 - p0 - 3 * p2 + p3) * alpha ^ 3
		)
end
RunService.Heartbeat:Connect(function()
	local progress = (os.clock() * 0.6) % 3
	local i, alpha = math.floor(progress) + 1, progress % 1
	linear.Position = waypoint(i):Lerp(waypoint(i + 1), alpha)
	smooth.Position = catmullRom(waypoint(i - 1), waypoint(i), waypoint(i + 1), waypoint(i + 2), alpha)
		+ Vector3.new(0, 0, 2)
end)`],

/* ===== Spatial partitioning ===== */
'sp-brute':['S','Counts how many pair checks "everyone vs everyone" needs as the object count grows, and prints the table.',`
for _, count in { 10, 50, 100, 400, 1000 } do
	print(string.format("%5d objects -> %7d pair checks", count, count * (count - 1) / 2))
end
local parts = {}
for i = 1, 20 do
	parts[i] = makePart(
		Vector3.new(1, 1, 1),
		ORIGIN + Vector3.new(math.random(-10, 10), 1, math.random(-10, 10)),
		Color3.fromRGB(18, 147, 154),
		{ Shape = Enum.PartType.Ball }
	)
end
local checks = 0
for i = 1, #parts do
	for j = i + 1, #parts do
		checks += 1
		if (parts[i].Position - parts[j].Position).Magnitude < 4 then
			drawLine(makeLinePart(Color3.fromRGB(230, 60, 60)), parts[i].Position, parts[j].Position)
		end
	end
end
print("20 objects took", checks, "checks")`],
'sp-hash':['S','300 dots in a spatial hash. Every frame the dots within 10 studs of you are found by checking only the nearby grid cells, and turn orange.',SCATTER+`
local dots = scatter(300, 40)
local CELL, RADIUS = 8, 10
local function cellKey(position)
	return math.floor(position.X / CELL) .. "," .. math.floor(position.Z / CELL)
end
local buckets = {}
for _, dot in dots do
	local key = cellKey(dot.Position)
	buckets[key] = buckets[key] or {}
	table.insert(buckets[key], dot)
end
local litDots = {}
RunService.Heartbeat:Connect(function()
	for _, dot in litDots do
		dot.Color = Color3.fromRGB(120, 120, 130)
	end
	table.clear(litDots)
	local root = nearestPlayerRoot(ORIGIN)
	if not root then
		return
	end
	local center = root.Position
	for cellX = math.floor((center.X - RADIUS) / CELL), math.floor((center.X + RADIUS) / CELL) do
		for cellZ = math.floor((center.Z - RADIUS) / CELL), math.floor((center.Z + RADIUS) / CELL) do
			for _, dot in buckets[cellX .. "," .. cellZ] or {} do
				if (dot.Position - center).Magnitude <= RADIUS then
					dot.Color = Color3.fromRGB(226, 133, 26)
					table.insert(litDots, dot)
				end
			end
		end
	end
end)`],
'sp-quadtree':['S','Builds a quadtree over 200 clumped points (splitting any square with more than 4 points) and draws the squares as outlines.',`
local random = Random.new(5)
local points = {}
local centers = { Vector2.new(-15, -10), Vector2.new(12, 10), Vector2.new(15, -14) }
for i = 1, 200 do
	local center = centers[i % 3 + 1]
	local angle, distance = random:NextNumber(0, 2 * math.pi), random:NextNumber() ^ 2 * 8
	points[i] = Vector2.new(
		math.clamp(center.X + math.cos(angle) * distance, -24.9, 24.9),
		math.clamp(center.Y + math.sin(angle) * distance, -24.9, 24.9)
	)
	makePart(
		Vector3.new(0.4, 0.4, 0.4),
		ORIGIN + Vector3.new(points[i].X, 0.4, points[i].Y),
		Color3.fromRGB(18, 147, 154),
		{ CanCollide = false }
	)
end
local function outline(x, z, size)
	for _, edge in
		{
			{ Vector3.new(size, 0.2, 0.2), Vector3.new(size / 2, 0, 0) },
			{ Vector3.new(size, 0.2, 0.2), Vector3.new(size / 2, 0, size) },
			{ Vector3.new(0.2, 0.2, size), Vector3.new(0, 0, size / 2) },
			{ Vector3.new(0.2, 0.2, size), Vector3.new(size, 0, size / 2) },
		}
	do
		makePart(
			edge[1],
			ORIGIN + Vector3.new(x, 0.1, z) + edge[2],
			Color3.fromRGB(226, 133, 26),
			{ CanCollide = false }
		)
	end
end
local function build(cellPoints, x, z, size, depth)
	outline(x, z, size)
	if #cellPoints <= 4 or depth >= 6 then
		return
	end
	local half = size / 2
	for _, quadrant in { { 0, 0 }, { half, 0 }, { 0, half }, { half, half } } do
		local inside = {}
		for _, point in cellPoints do
			if
				point.X >= x + quadrant[1]
				and point.X < x + quadrant[1] + half
				and point.Y >= z + quadrant[2]
				and point.Y < z + quadrant[2] + half
			then
				table.insert(inside, point)
			end
		end
		build(inside, x + quadrant[1], z + quadrant[2], half, depth + 1)
	end
end
build(points, -25, -25, 50, 0)`],
'sp-octree':['S','Builds an octree over 150 points in a 3D shell and draws each cube that holds more than 4 points as see-through boxes.',`
local random = Random.new(19)
local points = {}
for i = 1, 150 do
	local direction =
		Vector3.new(random:NextNumber(-1, 1), random:NextNumber(-1, 1), random:NextNumber(-1, 1)).Unit
	points[i] = Vector3.new(0, 10, 0) + direction * random:NextNumber(6, 9)
	makePart(
		Vector3.new(0.4, 0.4, 0.4),
		ORIGIN + points[i],
		Color3.fromRGB(18, 147, 154),
		{ CanCollide = false }
	)
end
local function build(cellPoints, corner, size, depth)
	if #cellPoints <= 4 or depth >= 4 then
		return
	end
	makePart(
		Vector3.new(size, size, size),
		ORIGIN + corner + Vector3.new(size, size, size) / 2,
		Color3.fromRGB(226, 133, 26),
		{ Transparency = 0.9, CanCollide = false }
	)
	local half = size / 2
	for _, offsetX in { 0, half } do
		for _, offsetY in { 0, half } do
			for _, offsetZ in { 0, half } do
				local childCorner = corner + Vector3.new(offsetX, offsetY, offsetZ)
				local inside = {}
				for _, point in cellPoints do
					if
						point.X >= childCorner.X
						and point.X < childCorner.X + half
						and point.Y >= childCorner.Y
						and point.Y < childCorner.Y + half
						and point.Z >= childCorner.Z
						and point.Z < childCorner.Z + half
					then
						table.insert(inside, point)
					end
				end
				build(inside, childCorner, half, depth + 1)
			end
		end
	end
end
build(points, Vector3.new(-10, 0, -10), 20, 0)`],
'sp-nearest':['S','Finds the dot nearest to you each frame by searching grid rings outward and stopping once the next ring is further than the best found. A beam points to it.',SCATTER+`
local dots = scatter(250, 40)
local CELL = 6
local buckets = {}
local function cellOf(position)
	return math.floor(position.X / CELL), math.floor(position.Z / CELL)
end
for _, dot in dots do
	local cellX, cellZ = cellOf(dot.Position)
	local key = cellX .. "," .. cellZ
	buckets[key] = buckets[key] or {}
	table.insert(buckets[key], dot)
end
local beam = makeLinePart()
RunService.Heartbeat:Connect(function()
	local root = nearestPlayerRoot(ORIGIN)
	if not root then
		return
	end
	local position = root.Position
	local playerCellX, playerCellZ = cellOf(position)
	local best, bestDistance = nil, math.huge
	for ring = 0, 15 do
		if best and (ring - 1) * CELL > bestDistance then
			break
		end
		for offsetX = -ring, ring do
			for offsetZ = -ring, ring do
				if math.max(math.abs(offsetX), math.abs(offsetZ)) == ring then
					for _, dot in buckets[(playerCellX + offsetX) .. "," .. (playerCellZ + offsetZ)] or {} do
						local distance = (dot.Position - position).Magnitude
						if distance < bestDistance then
							best, bestDistance = dot, distance
						end
					end
				end
			end
		end
	end
	if best then
		drawLine(beam, position, best.Position)
	end
end)`],
'sp-sweep':['S','Sweep and prune: 40 boxes sorted by their left edge; only boxes whose X ranges overlap are tested, and touching pairs turn red.',`
local random = Random.new(6)
local boxes = {}
for i = 1, 40 do
	local size = Vector3.new(random:NextNumber(1.5, 4), 1, random:NextNumber(1.5, 4))
	local part = makePart(
		size,
		ORIGIN + Vector3.new(random:NextNumber(-20, 20), 0.5, random:NextNumber(-12, 12)),
		Color3.fromRGB(18, 147, 154),
		{ Transparency = 0.3 }
	)
	table.insert(boxes, {
		part = part,
		minX = part.Position.X - size.X / 2,
		maxX = part.Position.X + size.X / 2,
		minZ = part.Position.Z - size.Z / 2,
		maxZ = part.Position.Z + size.Z / 2,
	})
end
table.sort(boxes, function(first, second)
	return first.minX < second.minX
end)
local active, tests, hits = {}, 0, 0
for _, box in boxes do
	for i = #active, 1, -1 do
		if active[i].maxX < box.minX then
			table.remove(active, i)
		end
	end
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
local NEAR_SQUARED, FAR_SQUARED = 15 ^ 2, 35 ^ 2
local frame = 0
RunService.Heartbeat:Connect(function(deltaTime)
	frame += 1
	local root = nearestPlayerRoot(ORIGIN)
	if not root then
		return
	end
	for i, gem in gems do
		local offset = gem.Position - root.Position
		local distanceSquared = offset:Dot(offset) -- squared distance: no square root
		if distanceSquared < NEAR_SQUARED then
			gem.Color = Color3.fromRGB(226, 133, 26)
			gem.CFrame *= CFrame.Angles(0, deltaTime * 3, 0)
		elseif distanceSquared < FAR_SQUARED then
			gem.Color = Color3.fromRGB(18, 147, 154)
			if (frame + i) % 4 == 0 then
				gem.CFrame *= CFrame.Angles(0, deltaTime * 12, 0)
			end
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
RunService.RenderStepped:Connect(function(deltaTime)
	table.insert(samples, deltaTime)
	sum += deltaTime
	if #samples > WINDOW then
		sum -= table.remove(samples, 1)
	end
	label.Text = string.format("%.0f FPS (avg)", #samples / sum)
end)`],
'sg-ema':['S','A needle follows a noisy signal smoothly using exponential smoothing: smoothed += (raw − smoothed) × alpha.',`
local raw =
	makePart(Vector3.new(0.6, 0.6, 0.6), ORIGIN, Color3.fromRGB(120, 120, 130), { CanCollide = false })
local smooth =
	makePart(Vector3.new(1.2, 1.2, 1.2), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false })
makeLabel(raw, "raw")
makeLabel(smooth, "smoothed")
local value = 0
RunService.Heartbeat:Connect(function(deltaTime)
	local now = os.clock()
	local noisy = 4 * math.sin(now * 0.8) + (math.random() - 0.5) * 3
	value += (noisy - value) * (1 - math.exp(-deltaTime / 0.3)) -- about 0.3 s reaction time
	raw.Position = ORIGIN + Vector3.new(-3, 6 + noisy, 0)
	smooth.Position = ORIGIN + Vector3.new(3, 6 + value, 0)
end)`],
'sg-deadzone':['L','Shows your gamepad left stick (or WASD) as a dot: tiny input inside the dead zone is ignored and the rest is rescaled and curved.',`
local UserInputService = game:GetService("UserInputService")
local DEAD_ZONE, CURVE_POWER = 0.2, 2
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
	if input.KeyCode == Enum.KeyCode.Thumbstick1 then
		stick = Vector2.new(input.Position.X, -input.Position.Y)
	end
end)
local function shape(stickVector)
	local magnitude = math.min(stickVector.Magnitude, 1)
	if magnitude <= DEAD_ZONE then
		return Vector2.zero
	end
	return stickVector.Unit * ((magnitude - DEAD_ZONE) / (1 - DEAD_ZONE)) ^ CURVE_POWER
end
RunService.RenderStepped:Connect(function()
	local keys = Vector2.new(
		(UserInputService:IsKeyDown(Enum.KeyCode.D) and 1 or 0)
			- (UserInputService:IsKeyDown(Enum.KeyCode.A) and 1 or 0),
		(UserInputService:IsKeyDown(Enum.KeyCode.S) and 1 or 0)
			- (UserInputService:IsKeyDown(Enum.KeyCode.W) and 1 or 0)
	)
	local shaped = shape(stick.Magnitude > 0.01 and stick or keys)
	dot.Position = UDim2.fromScale(0.5 + shaped.X * 0.45, 0.5 + shaped.Y * 0.45)
end)`],
'sg-shake':['L','Press E for camera shake: trauma rises on each press and drains over time; the shake is trauma² × noise.',`
local UserInputService = game:GetService("UserInputService")
local trauma = 0
UserInputService.InputBegan:Connect(function(input, processed)
	if not processed and input.KeyCode == Enum.KeyCode.E then
		trauma = math.min(1, trauma + 0.5)
	end
end)
RunService:BindToRenderStep("Shake", Enum.RenderPriority.Camera.Value + 1, function(deltaTime)
	trauma = math.max(0, trauma - 1.2 * deltaTime)
	if trauma <= 0 then
		return
	end
	local shake, noiseTime = trauma * trauma, os.clock() * 15
	local offset = Vector3.new(math.noise(noiseTime, 1.3), math.noise(noiseTime, 7.1), 0) * 2.4 * shake
	camera.CFrame = camera.CFrame
		* CFrame.new(offset)
		* CFrame.Angles(0, 0, math.noise(noiseTime, 3.3) * 0.14 * shake)
end)`],
'sg-alias':['S','A wheel with 8 spokes spins faster and faster. Watch it on screen: at some speeds it looks frozen or spinning backwards (aliasing).',`
local wheel = makePart(
	Vector3.new(0.4, 8, 8),
	ORIGIN + Vector3.new(0, 5, 0),
	Color3.fromRGB(60, 60, 70),
	{ Shape = Enum.PartType.Cylinder, CanCollide = false }
)
local spokes = {}
for i = 1, 4 do
	spokes[i] = makePart(
		Vector3.new(0.5, 7.6, 0.4),
		wheel.Position,
		Color3.fromRGB(226, 133, 26),
		{ CanCollide = false }
	)
end
local label = makeLabel(wheel)
local angle = 0
RunService.Heartbeat:Connect(function(deltaTime)
	local turnsPerSecond = (os.clock() % 30) * 0.5 -- slowly speeds up, then resets
	angle += turnsPerSecond * 2 * math.pi * deltaTime
	for i, spoke in spokes do
		spoke.CFrame = CFrame.new(wheel.Position) * CFrame.Angles(angle + i * math.pi / 4, 0, 0)
	end
	label.Text = string.format("%.1f turns per second", turnsPerSecond)
end)`],
'sg-interp':['S','The server sends a moving target\'s position only 5 times a second. One copy snaps to each update; the other renders 0.3 s in the past and interpolates smoothly.',`
local real = makePart(
	Vector3.new(1.5, 1.5, 1.5),
	ORIGIN,
	Color3.fromRGB(163, 162, 165),
	{ Transparency = 0.6, CanCollide = false }
)
local snapped =
	makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(230, 60, 60), { CanCollide = false })
local smooth =
	makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false })
makeLabel(snapped, "snap")
makeLabel(smooth, "interpolated")
local function truePositionAt(atTime)
	return ORIGIN + Vector3.new(math.sin(atTime * 0.9) * 12, 3, math.sin(atTime * 1.8) * 6)
end
local buffer, RENDER_DELAY, UPDATES_PER_SECOND = {}, 0.3, 5
task.spawn(function()
	while true do
		table.insert(buffer, { time = os.clock(), position = truePositionAt(os.clock()) }) -- "network update"
		if #buffer > 20 then
			table.remove(buffer, 1)
		end
		snapped.Position = buffer[#buffer].pos + Vector3.new(0, 2, 0)
		task.wait(1 / UPDATES_PER_SECOND)
	end
end)
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	real.Position = truePositionAt(now)
	local renderTime = now - RENDER_DELAY
	for i = #buffer, 2, -1 do
		local older, newer = buffer[i - 1], buffer[i]
		if older.time <= renderTime and renderTime <= newer.time then
			smooth.Position = older.position:Lerp(
				newer.position,
				(renderTime - older.time) / (newer.time - older.time)
			) + Vector3.new(0, 4, 0)
			break
		end
	end
end)`],
'sg-extrap':['S','With only 4 updates a second, a copy predicts where the target is now from its last position and velocity (dead reckoning), blending smoothly to corrections.',`
local real = makePart(
	Vector3.new(1.5, 1.5, 1.5),
	ORIGIN,
	Color3.fromRGB(163, 162, 165),
	{ Transparency = 0.6, CanCollide = false }
)
local predicted =
	makePart(Vector3.new(1.5, 1.5, 1.5), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false })
makeLabel(predicted, "predicted")
local function truePositionAt(atTime)
	return ORIGIN + Vector3.new(math.sin(atTime * 0.9) * 12, 3, math.sin(atTime * 1.8) * 6)
end
local last = { time = os.clock(), position = truePositionAt(os.clock()), velocity = Vector3.zero }
task.spawn(function()
	while true do
		local atTime = os.clock()
		last = {
			time = atTime,
			position = truePositionAt(atTime),
			velocity = (truePositionAt(atTime + 0.01) - truePositionAt(atTime)) / 0.01,
		}
		task.wait(0.25)
	end
end)
local shown = last.position
RunService.Heartbeat:Connect(function(deltaTime)
	local now = os.clock()
	real.Position = truePositionAt(now)
	local guess = last.position + last.velocity * (now - last.time)
	shown = shown:Lerp(guess, 1 - math.exp(-8 * deltaTime))
	predicted.Position = shown
end)`],
'sg-hysteresis':['S','An NPC starts chasing when you come within 10 studs and only gives up past 16, so it doesn\'t flicker at the edge.',`
local START_CHASE, STOP_CHASE = 10, 16
local npc = makePart(Vector3.new(2, 4, 2), ORIGIN + Vector3.new(0, 2, 0), Color3.fromRGB(90, 160, 230))
local label = makeLabel(npc)
local home = npc.Position
local chasing = false
RunService.Heartbeat:Connect(function(deltaTime)
	local root = nearestPlayerRoot(npc.Position)
	local distance = root and (root.Position - npc.Position).Magnitude or math.huge
	if not chasing and distance < START_CHASE then
		chasing = true
	elseif chasing and distance > STOP_CHASE then
		chasing = false
	end
	local goal = chasing and root and root.Position * Vector3.new(1, 0, 1) + Vector3.new(0, 2, 0) or home
	local offset = goal - npc.Position
	if offset.Magnitude > 0.1 then
		npc.Position += offset.Unit * math.min(8 * deltaTime, offset.Magnitude)
	end
	npc.Color = chasing and Color3.fromRGB(230, 60, 60) or Color3.fromRGB(90, 160, 230)
	label.Text = string.format("%s (%.0f studs)", chasing and "CHASING" or "idle", distance)
end)`],
'sg-ratelimit':['S','A button anyone can click, protected by a token bucket per player: bursts of 3, then 1 per second. Spam clicks are rejected.',`
local CAPACITY, REFILL_PER_SECOND = 3, 1
local buckets = {}
local button = makePart(Vector3.new(4, 1, 4), ORIGIN + Vector3.new(0, 0.5, 0), Color3.fromRGB(226, 133, 26))
local label = makeLabel(button, "click fast!")
local clickDetector = Instance.new("ClickDetector")
clickDetector.Parent = button
clickDetector.MouseClick:Connect(function(player)
	local now = os.clock()
	local bucket = buckets[player] or { tokens = CAPACITY, last = now }
	buckets[player] = bucket
	bucket.tokens = math.min(CAPACITY, bucket.tokens + (now - bucket.last) * REFILL_PER_SECOND)
	bucket.last = now
	if bucket.tokens < 1 then
		label.Text = player.Name .. ": too fast (rejected)"
		button.Color = Color3.fromRGB(230, 60, 60)
		return
	end
	bucket.tokens -= 1
	label.Text = string.format("%s: accepted (%.1f tokens left)", player.Name, bucket.tokens)
	button.Color = Color3.fromRGB(60, 200, 90)
end)
Players.PlayerRemoving:Connect(function(player)
	buckets[player] = nil
end)`],
});
})();
