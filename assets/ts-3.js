(function(){
"use strict";
const GUI = `local gui = Instance.new("ScreenGui")
gui.Name = "MathLabGui"
gui.IgnoreGuiInset = true
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")
local function makeFrame(properties)
	local newFrame = Instance.new("Frame")
	newFrame.BorderSizePixel = 0
	for key, value in properties do
		newFrame[key] = value
	end
	newFrame.Parent = properties.Parent or gui
	return newFrame
end
`;
const GRID = `local WIDTH, HEIGHT, CELL = 12, 10, 3
local function cellPosition(x, z)
	return ORIGIN + Vector3.new((x - WIDTH / 2 - 0.5) * CELL, 0, (z - HEIGHT / 2 - 0.5) * CELL)
end
local tiles = {}
for x = 1, WIDTH do
	tiles[x] = {}
	for z = 1, HEIGHT do
		tiles[x][z] = makePart(
			Vector3.new(CELL - 0.2, 0.4, CELL - 0.2),
			cellPosition(x, z) + Vector3.new(0, 0.2, 0),
			Color3.fromRGB(200, 200, 205)
		)
	end
end
local function paint(x, z, color)
	if tiles[x] and tiles[x][z] then
		tiles[x][z].Color = color
	end
end
local function clear()
	for x = 1, WIDTH do
		for z = 1, HEIGHT do
			tiles[x][z].Color = Color3.fromRGB(200, 200, 205)
		end
	end
end
local function cellOf(worldPosition)
	local gridPosition = (worldPosition - ORIGIN) / CELL
	return math.floor(gridPosition.X + WIDTH / 2 + 1), math.floor(gridPosition.Z + HEIGHT / 2 + 1)
end
`;
Lab.ts({
/* ===== Trigonometry ===== */
'trig-unit':['S','A point runs around a circle at (cos, sin) × radius in a vertical plane, with its cos and sin legs drawn and labelled.',`
local CENTER, RADIUS = ORIGIN + Vector3.new(0, 8, 0), 6
local marker = makePart(
	Vector3.new(1, 1, 1),
	CENTER,
	Color3.fromRGB(226, 133, 26),
	{ Shape = Enum.PartType.Ball, CanCollide = false }
)
local cosLeg, sinLeg = makeLinePart(Color3.fromRGB(217, 54, 62)), makeLinePart(Color3.fromRGB(46, 158, 82))
local label = makeLabel(marker)
RunService.Heartbeat:Connect(function()
	local angle = os.clock() * 0.8
	local cosine, sine = math.cos(angle), math.sin(angle)
	local position = CENTER + Vector3.new(cosine * RADIUS, sine * RADIUS, 0)
	marker.Position = position
	drawLine(cosLeg, CENTER, CENTER + Vector3.new(cosine * RADIUS, 0, 0))
	drawLine(sinLeg, CENTER + Vector3.new(cosine * RADIUS, 0, 0), position)
	label.Text = string.format("cos %.2f  sin %.2f", cosine, sine)
end)`],

'trig-radians':['S','A wheel of radius 3 rolls along the ground. It turns by distance ÷ radius radians, so it never slips.',`
local RADIUS = 3
local wheel = makePart(
	Vector3.new(1, RADIUS * 2, RADIUS * 2),
	ORIGIN + Vector3.new(-15, RADIUS, 0),
	Color3.fromRGB(60, 60, 70),
	{ Shape = Enum.PartType.Cylinder, CanCollide = false }
)
local spoke = makePart(
	Vector3.new(1.1, RADIUS * 1.8, 0.4),
	wheel.Position,
	Color3.fromRGB(226, 133, 26),
	{ CanCollide = false }
)
local label = makeLabel(wheel)
RunService.Heartbeat:Connect(function()
	local x = (os.clock() * 4) % 30 - 15 -- distance rolled
	local angle = -(x + 15) / RADIUS -- radians = distance / radius
	local rollingFrame = CFrame.new(ORIGIN + Vector3.new(x, RADIUS, 0))
		* CFrame.Angles(0, math.rad(90), 0)
		* CFrame.Angles(angle, 0, 0)
	wheel.CFrame = rollingFrame * CFrame.Angles(0, math.rad(90), 0)
	spoke.CFrame = rollingFrame
	label.Text = string.format("%.2f rad = %.0f degrees", -angle, math.deg(-angle))
end)`],

'trig-sohcahtoa':['S','Builds a 12-stud ramp at an angle that changes over time; sin gives its height and cos the floor it covers.',`
local LENGTH = 12
local ramp = makePart(Vector3.new(LENGTH, 0.6, 4), ORIGIN, Color3.fromRGB(150, 110, 70))
local label = makeLabel(ramp)
RunService.Heartbeat:Connect(function()
	local angle = math.rad(20 + 15 * math.sin(os.clock() * 0.5))
	local height = LENGTH * math.sin(angle) -- opposite
	local run = LENGTH * math.cos(angle) -- adjacent
	ramp.CFrame = CFrame.new(ORIGIN + Vector3.new(run / 2, height / 2, 0)) * CFrame.Angles(0, 0, angle)
	label.Text = string.format("%.0f degrees: height %.1f, run %.1f", math.deg(angle), height, run)
end)`],

'trig-tan':['S','Three ramps of different rise and run; each label shows its slope angle from math.atan(rise / run) and whether it is walkable.',`
local LIMIT = 45
for i, riseAndRun in { { 2, 10 }, { 6, 8 }, { 10, 5 } } do
	local rise, run = riseAndRun[1], riseAndRun[2]
	local angle = math.atan(rise / run)
	local length = math.sqrt(rise * rise + run * run)
	local base = ORIGIN + Vector3.new((i - 2) * 12, 0, 0)
	local ramp = makePart(Vector3.new(length, 0.6, 4), base, Color3.fromRGB(150, 110, 70))
	ramp.CFrame = CFrame.new(base + Vector3.new(0, rise / 2, 0)) * CFrame.Angles(0, 0, angle)
	makeLabel(
		ramp,
		string.format(
			"%.0f degrees %s",
			math.deg(angle),
			math.deg(angle) <= LIMIT and "walkable" or "too steep"
		)
	)
end`],

'trig-wave':['S','A row of 20 posts rises and falls as a travelling wave: each post is a little behind the one before (phase).',`
local posts = {}
for i = 1, 20 do
	posts[i] = makePart(Vector3.new(1.2, 1, 1.2), ORIGIN, Color3.fromHSV(i / 20, 0.6, 1))
end
local AMPLITUDE, FREQUENCY, STEP = 2, 0.6, math.rad(25)
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	for i, post in posts do
		local y = AMPLITUDE * math.sin(2 * math.pi * FREQUENCY * now - (i - 1) * STEP)
		post.Position = ORIGIN + Vector3.new((i - 10.5) * 1.5, 3 + y, 0)
	end
end)`],

'trig-polar':['S','Builds a spiral staircase: each step turns 20°, moves out a little and climbs (polar coordinates).',`
local STEPS = 40
makePart(
	Vector3.new(2, STEPS * 0.5 + 1, 2),
	ORIGIN + Vector3.new(0, (STEPS * 0.5 + 1) / 2, 0),
	Color3.fromRGB(90, 90, 100)
)
for i = 0, STEPS - 1 do
	local angle = math.rad(i * 20)
	local radius = 3 + i * 0.05
	makePart(Vector3.new(4, 0.4, 1.6), ORIGIN, Color3.fromHSV(i / STEPS, 0.4, 0.9), {
		CFrame = CFrame.new(ORIGIN + Vector3.new(0, 0.5 + i * 0.5, 0))
			* CFrame.Angles(0, -angle, 0)
			* CFrame.new(radius, 0, 0),
	})
end`],

'trig-lissajous':['S','A drone flies a figure-eight forever: x = sin(t), z = sin(2t).',`
local drone = makePart(Vector3.new(1.5, 1, 2.5), ORIGIN, Color3.fromRGB(226, 133, 26), { CanCollide = false })
local function pathAt(t)
	return ORIGIN + Vector3.new(12 * math.sin(t + math.pi / 2), 4, 8 * math.sin(2 * t))
end
for i = 0, 80 do
	makePart(
		Vector3.new(0.3, 0.3, 0.3),
		pathAt(i / 80 * math.pi * 2),
		Color3.fromRGB(90, 90, 100),
		{ CanCollide = false }
	)
end
RunService.Heartbeat:Connect(function()
	local t = os.clock() * 0.6
	drone.CFrame = CFrame.lookAt(pathAt(t), pathAt(t + 0.01))
end)`],

'trig-rotate2d':['S','A triangle of three markers spins around a pivot using the 2D rotation formula on X and Z.',`
local pivot = ORIGIN + Vector3.new(0, 2, 0)
makePart(Vector3.new(1, 1, 1), pivot, Color3.new(1, 1, 1))
local shape = { Vector2.new(4, 0), Vector2.new(7, 2), Vector2.new(5, 4) }
local markers = {}
for i = 1, 3 do
	markers[i] = makePart(Vector3.new(1, 1, 1), pivot, Color3.fromRGB(226, 133, 26), { CanCollide = false })
end
local function rotate2D(vector, angle)
	local cosine, sine = math.cos(angle), math.sin(angle)
	return Vector2.new(vector.X * cosine - vector.Y * sine, vector.X * sine + vector.Y * cosine)
end
RunService.Heartbeat:Connect(function()
	local angle = os.clock() * 0.8
	for i, corner in shape do
		local rotated = rotate2D(corner, angle)
		markers[i].Position = pivot + Vector3.new(rotated.X, 0, rotated.Y)
	end
end)`],

'trig-height':['S','A tower and a turret: the turret tilts up exactly enough to aim at the top, using math.atan2(rise, flat distance).',`
local tower = makePart(Vector3.new(3, 16, 3), ORIGIN + Vector3.new(14, 8, 0), Color3.fromRGB(90, 90, 100))
local turret = makePart(Vector3.new(1, 1, 4), ORIGIN + Vector3.new(-6, 1.5, 0), Color3.fromRGB(226, 133, 26))
local label = makeLabel(turret)
local top = tower.Position + Vector3.new(0, tower.Size.Y / 2, 0)
local flat = Vector3.new(top.X - turret.Position.X, 0, top.Z - turret.Position.Z)
local elevation = math.atan2(top.Y - turret.Position.Y, flat.Magnitude)
local yaw = math.atan2(-flat.X, -flat.Z)
turret.CFrame = CFrame.new(turret.Position) * CFrame.fromEulerAnglesYXZ(elevation, yaw, 0)
label.Text = string.format("aim up %.1f degrees", math.deg(elevation))`],

/* ===== Animation & timing ===== */
'an-duration':['S','Two blocks race 20 studs: one always takes exactly 2 seconds (duration), the other moves at 6 studs/s (speed).',`
local fixedDuration =
	makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(-10, 1, -2), Color3.fromRGB(226, 133, 26))
local fixedSpeed =
	makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(-10, 1, 2), Color3.fromRGB(18, 147, 154))
makeLabel(fixedDuration, "fixed duration 2 s")
makeLabel(fixedSpeed, "fixed speed 6 studs/s")
while true do
	local start = os.clock()
	while true do
		local elapsed = os.clock() - start
		local alpha = math.clamp(elapsed / 2, 0, 1)
		fixedDuration.Position = ORIGIN + Vector3.new(-10 + 20 * alpha, 1, -2)
		fixedSpeed.Position = ORIGIN + Vector3.new(-10 + math.min(20, 6 * elapsed), 1, 2)
		if elapsed > 4.5 then
			break
		end
		RunService.Heartbeat:Wait()
	end
	task.wait(1)
end`],

'an-pingpong':['S','A platform moves back and forth forever with a smooth cosine ping-pong built straight from the clock.',`
local A, B = ORIGIN + Vector3.new(-10, 3, 0), ORIGIN + Vector3.new(10, 3, 0)
local platform = makePart(Vector3.new(6, 1, 6), A, Color3.fromRGB(70, 130, 240))
RunService.Heartbeat:Connect(function()
	local DURATION = 3
	local alpha = 0.5 - 0.5 * math.cos(os.clock() / DURATION * math.pi) -- 0 → 1 → 0, slowing at the ends
	platform.Position = A:Lerp(B, alpha)
end)`],

'an-tweeninfo':['S','Three tweens show TweenInfo options: repeat forever with reverses, play twice, and a delayed start.',`
local loopingBlock =
	makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(-8, 1, -4), Color3.fromRGB(226, 133, 26))
local twiceBlock =
	makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(-8, 1, 0), Color3.fromRGB(18, 147, 154))
local delayedBlock =
	makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(-8, 1, 4), Color3.fromRGB(194, 65, 142))
makeLabel(loopingBlock, "RepeatCount -1, Reverses")
makeLabel(twiceBlock, "RepeatCount 1 (plays twice)")
makeLabel(delayedBlock, "DelayTime 2")
TweenService:Create(
	loopingBlock,
	TweenInfo.new(1.5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
	{ Position = loopingBlock.Position + Vector3.new(16, 0, 0) }
):Play()
TweenService:Create(
	twiceBlock,
	TweenInfo.new(1.5, Enum.EasingStyle.Quad, Enum.EasingDirection.Out, 1, false),
	{ Position = twiceBlock.Position + Vector3.new(16, 0, 0) }
):Play()
TweenService:Create(
	delayedBlock,
	TweenInfo.new(1.5, Enum.EasingStyle.Back, Enum.EasingDirection.Out, 0, false, 2),
	{ Position = delayedBlock.Position + Vector3.new(16, 0, 0) }
):Play()`],

'an-sequence':['S','A crate slides, then lifts, then spins, each tween waiting for the last with Completed:Wait(). Then it resets and repeats.',`
local crate = makePart(Vector3.new(3, 3, 3), ORIGIN + Vector3.new(-8, 1.5, 0), Color3.fromRGB(140, 90, 40))
local function playTween(goal, duration)
	local tween = TweenService:Create(crate, TweenInfo.new(duration, Enum.EasingStyle.Quad), goal)
	tween:Play()
	tween.Completed:Wait()
end
while true do
	crate.CFrame = CFrame.new(ORIGIN + Vector3.new(-8, 1.5, 0))
	playTween({ CFrame = CFrame.new(ORIGIN + Vector3.new(8, 1.5, 0)) }, 1)
	playTween({ CFrame = CFrame.new(ORIGIN + Vector3.new(8, 6, 0)) }, 0.6)
	playTween({ CFrame = CFrame.new(ORIGIN + Vector3.new(8, 6, 0)) * CFrame.Angles(0, math.pi, 0) }, 0.8)
	task.wait(1)
end`],

'an-stagger':['S','A row of 12 cubes pops in one after another with a 0.08 s stagger, then repeats.',`
local cubes = {}
for i = 1, 12 do
	cubes[i] = makePart(
		Vector3.new(0.05, 0.05, 0.05),
		ORIGIN + Vector3.new((i - 6.5) * 2.5, 1.5, 0),
		Color3.fromHSV(i / 12, 0.6, 1)
	)
end
local tweenInfo = TweenInfo.new(0.4, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
while true do
	for i, cube in cubes do
		cube.Size = Vector3.new(0.05, 0.05, 0.05)
		task.delay((i - 1) * 0.08, function()
			TweenService:Create(cube, tweenInfo, { Size = Vector3.new(2, 2, 2) }):Play()
		end)
	end
	task.wait(3)
end`],

'an-keyframes':['S','A light changes height through five keyframes over 4 seconds, interpolating between the two keys around the current time.',`
local KEYS = { { 0, 1 }, { 1, 6 }, { 2, 3 }, { 3, 8 }, { 4, 1 } } -- { time, height }
local orb = makePart(
	Vector3.new(1.5, 1.5, 1.5),
	ORIGIN,
	Color3.fromRGB(255, 220, 120),
	{ Shape = Enum.PartType.Ball, Material = Enum.Material.Neon }
)
local function sample(currentTime)
	for i = 1, #KEYS - 1 do
		local before, after = KEYS[i], KEYS[i + 1]
		if currentTime <= after[1] then
			local alpha = (currentTime - before[1]) / (after[1] - before[1])
			alpha = alpha * alpha * (3 - 2 * alpha) -- smooth in and out of each key
			return before[2] + (after[2] - before[2]) * alpha
		end
	end
	return KEYS[#KEYS][2]
end
RunService.Heartbeat:Connect(function()
	orb.Position = ORIGIN + Vector3.new(0, sample(os.clock() % 4), 0)
end)`],

'an-squash':['S','A ball bounces and squashes on landing while keeping its volume (wider as it gets flatter).',`
local ball =
	makePart(Vector3.new(3, 3, 3), ORIGIN, Color3.fromRGB(226, 133, 26), { Shape = Enum.PartType.Ball })
RunService.Heartbeat:Connect(function()
	local phase = (os.clock() * 0.9) % 1
	local height = 8 * math.abs(math.sin(phase * math.pi))
	local squash = math.max(0, 1 - height / 1.2) * 0.35
	local scaleY = 1 - squash
	local scaleXZ = 1 / math.sqrt(scaleY)
	ball.Size = Vector3.new(3 * scaleXZ, 3 * scaleY, 3 * scaleXZ)
	ball.Position = ORIGIN + Vector3.new(0, 1.5 * scaleY + height, 0)
end)`],

'an-idle':['S','A simple figure breathes, sways and glances around using layered sines and math.noise.',`
local body = makePart(Vector3.new(2, 3, 1), ORIGIN + Vector3.new(0, 1.5, 0), Color3.fromRGB(90, 160, 230))
local head = makePart(Vector3.new(1.4, 1.4, 1.4), ORIGIN, Color3.fromRGB(250, 210, 160))
local face = makePart(Vector3.new(0.8, 0.3, 0.1), ORIGIN, Color3.fromRGB(40, 40, 40))
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	local breath = 1 + 0.05 * math.sin(now * 2 * math.pi / 3.5)
	local sway = math.rad(3) * (0.6 * math.sin(now * 0.9) + 0.4 * math.noise(now * 0.5, 1.3))
	local look = math.rad(30) * math.noise(now * 0.35, 4.1) * 2
	local base = CFrame.new(ORIGIN + Vector3.new(0, 1.5 * breath, 0)) * CFrame.Angles(0, 0, sway)
	body.Size = Vector3.new(2, 3 * breath, 1)
	body.CFrame = base
	head.CFrame = base * CFrame.new(0, 1.5 * breath + 0.8, 0) * CFrame.Angles(0, look, 0)
	face.CFrame = head.CFrame * CFrame.new(0, 0, -0.75)
end)`],

'an-counter':['S','A floating counter eases from 0 up to a new random total every 3 seconds, rounding down for display.',`
local board = makePart(Vector3.new(6, 3, 0.5), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(30, 30, 35))
local label = makeLabel(board)
local shown = 0
while true do
	local from, to = shown, math.random(100, 50000)
	local start = os.clock()
	while true do
		local alpha = math.clamp((os.clock() - start) / 1.2, 0, 1)
		local eased = TweenService:GetValue(alpha, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
		shown = math.floor(from + (to - from) * eased)
		label.Text = tostring(shown) .. " coins"
		if alpha >= 1 then
			break
		end
		RunService.Heartbeat:Wait()
	end
	task.wait(3)
end`],

/* ===== Colors ===== */
'col-rgb':['S','Three cubes show pure red, green and blue, and a fourth mixes them with Color3.fromRGB from values that drift over time.',`
makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(-6, 1, 0), Color3.fromRGB(255, 0, 0))
makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(-3, 1, 0), Color3.fromRGB(0, 255, 0))
makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new(0, 1, 0), Color3.fromRGB(0, 0, 255))
local mix = makePart(Vector3.new(3, 3, 3), ORIGIN + Vector3.new(5, 1.5, 0), Color3.new(1, 1, 1))
local label = makeLabel(mix)
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	local red, green, blue =
		math.floor(127 + 127 * math.sin(now)),
		math.floor(127 + 127 * math.sin(now * 1.3)),
		math.floor(127 + 127 * math.sin(now * 0.7))
	mix.Color = Color3.fromRGB(red, green, blue)
	label.Text = string.format("fromRGB(%d, %d, %d)", red, green, blue)
end)`],

'col-lerp':['S','A health bar whose colour blends from green to red with Color3:Lerp as the pretend health drains and refills.',`
local back = makePart(Vector3.new(10, 1, 1), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(40, 40, 45))
local fill = makePart(Vector3.new(10, 1.1, 1.1), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(60, 200, 90))
local FULL, EMPTY = Color3.fromRGB(60, 200, 90), Color3.fromRGB(230, 60, 60)
RunService.Heartbeat:Connect(function()
	local health = 0.5 + 0.5 * math.sin(os.clock() * 0.6)
	fill.Size = Vector3.new(math.max(0.05, 10 * health), 1.1, 1.1)
	fill.Position = back.Position - Vector3.new(5 - 5 * health, 0, 0)
	fill.Color = EMPTY:Lerp(FULL, health)
end)`],

'col-hsv':['S','A ring of 24 cubes shows every hue with Color3.fromHSV; the centre cube cycles brightness (value) on a fixed hue.',`
for i = 0, 23 do
	local angle = i / 24 * math.pi * 2
	makePart(
		Vector3.new(1.5, 1.5, 1.5),
		ORIGIN + Vector3.new(math.cos(angle) * 8, 1, math.sin(angle) * 8),
		Color3.fromHSV(i / 24, 0.8, 1)
	)
end
local centre = makePart(Vector3.new(3, 3, 3), ORIGIN + Vector3.new(0, 1.5, 0), Color3.new(1, 1, 1))
local label = makeLabel(centre)
RunService.Heartbeat:Connect(function()
	local brightness = 0.5 + 0.5 * math.sin(os.clock())
	centre.Color = Color3.fromHSV(0.08, 0.85, brightness)
	label.Text = string.format("fromHSV(0.08, 0.85, %.2f)", brightness)
end)`],

'col-rainbow':['S','A row of neon tiles flows through the rainbow: hue = (time × speed + index × spread) % 1.',`
local tiles = {}
for i = 1, 24 do
	tiles[i] = makePart(
		Vector3.new(1.8, 0.5, 4),
		ORIGIN + Vector3.new((i - 12.5) * 2, 0.25, 0),
		Color3.new(1, 1, 1),
		{ Material = Enum.Material.Neon }
	)
end
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	for i, tile in tiles do
		tile.Color = Color3.fromHSV((now * 0.2 + i * 0.04) % 1, 0.8, 1)
	end
end)`],

'col-gradient':['S','A pillar shows a three-stop gradient (red → yellow → green), evaluated by finding the two stops around the value.',`
local KEYS = {
	{ 0, Color3.fromRGB(230, 50, 50) },
	{ 0.5, Color3.fromRGB(250, 210, 40) },
	{ 1, Color3.fromRGB(40, 200, 90) },
}
local function evaluate(value)
	for i = 1, #KEYS - 1 do
		local stopBefore, stopAfter = KEYS[i], KEYS[i + 1]
		if value <= stopAfter[1] then
			return stopBefore[2]:Lerp(stopAfter[2], (value - stopBefore[1]) / (stopAfter[1] - stopBefore[1]))
		end
	end
	return KEYS[#KEYS][2]
end
for i = 0, 20 do
	makePart(Vector3.new(1, 1, 1), ORIGIN + Vector3.new(i - 10, 0.5, -4), evaluate(i / 20))
end
local pillar = makePart(Vector3.new(3, 1, 3), ORIGIN, Color3.new(1, 1, 1))
RunService.Heartbeat:Connect(function()
	local value = 0.5 + 0.5 * math.sin(os.clock() * 0.7)
	pillar.Size = Vector3.new(3, 1 + value * 9, 3)
	pillar.Position = ORIGIN + Vector3.new(0, pillar.Size.Y / 2, 2)
	pillar.Color = evaluate(value)
end)`],

'col-contrast':['S','Ten coloured signs each pick black or white text, whichever has more contrast with the background (luminance).',`
local function channel(value)
	if value <= 0.03928 then
		return value / 12.92
	end
	return ((value + 0.055) / 1.055) ^ 2.4
end
local function luminance(color)
	return 0.2126 * channel(color.R) + 0.7152 * channel(color.G) + 0.0722 * channel(color.B)
end
local function contrast(colorA, colorB)
	local luminanceA, luminanceB = luminance(colorA), luminance(colorB)
	return (math.max(luminanceA, luminanceB) + 0.05) / (math.min(luminanceA, luminanceB) + 0.05)
end
for i = 1, 10 do
	local background = Color3.fromHSV(i / 10, 0.8, 0.9)
	local sign = makePart(Vector3.new(2.5, 2.5, 0.4), ORIGIN + Vector3.new((i - 5.5) * 3, 2, 0), background)
	local label = makeLabel(sign, "Text")
	local black, white = Color3.new(0, 0, 0), Color3.new(1, 1, 1)
	label.TextColor3 = contrast(background, black) > contrast(background, white) and black or white
	label.Parent.StudsOffset = Vector3.zero
	label.Parent.AlwaysOnTop = false
end`],

'col-hex':['S','Reads a palette of hex codes with Color3.fromHex into a row of cubes, and prints each one back with :ToHex().',`
local PALETTE = { "#E2851A", "#12939A", "#C2418E", "#2F6FD6", "#2E9E52", "#D9363E" }
for i, code in PALETTE do
	local color = Color3.fromHex(code)
	local cube = makePart(Vector3.new(2, 2, 2), ORIGIN + Vector3.new((i - 3.5) * 3, 1, 0), color)
	makeLabel(cube, code)
	print(code, "->", color:ToHex())
end`],

'col-flash':['S','Click the dummy: it flashes red and fades back to its own colour, without drifting after many hits.',`
local BASE = Color3.fromRGB(90, 160, 230)
local dummy = makePart(Vector3.new(3, 5, 2), ORIGIN + Vector3.new(0, 2.5, 0), BASE)
makeLabel(dummy, "click to hit")
local clickDetector = Instance.new("ClickDetector")
clickDetector.Parent = dummy
local hitAt = -1
clickDetector.MouseClick:Connect(function()
	hitAt = os.clock()
end)
RunService.Heartbeat:Connect(function()
	local pulse = math.clamp(1 - (os.clock() - hitAt) / 0.3, 0, 1)
	dummy.Color = BASE:Lerp(Color3.fromRGB(255, 40, 40), pulse) -- always from the stored base colour
end)`],

'col-distinct':['S','Twelve team flags coloured by stepping the hue by the golden ratio each time, so neighbours always look different.',`
for i = 0, 11 do
	local hue = (i * 0.618034) % 1
	local flag = makePart(
		Vector3.new(0.2, 3, 4),
		ORIGIN + Vector3.new((i - 5.5) * 2.5, 4, 0),
		Color3.fromHSV(hue, 0.75, 0.95)
	)
	makePart(Vector3.new(0.3, 6, 0.3), flag.Position - Vector3.new(0, 1.5, 2), Color3.fromRGB(80, 80, 80))
	makeLabel(flag, "team " .. (i + 1))
end`],

/* ===== Grids & tiles ===== */
'gr-coords':['S','A tile grid lights the cell under the nearest player, found with math.floor((pos − origin) / size).',GRID+`
local lastX, lastZ
RunService.Heartbeat:Connect(function()
	local root = nearestPlayerRoot(ORIGIN)
	if not root then
		return
	end
	local x, z = cellOf(root.Position)
	if x ~= lastX or z ~= lastZ then
		clear()
		paint(x, z, Color3.fromRGB(226, 133, 26))
		lastX, lastZ = x, z
	end
end)`],

'gr-neighbors':['S','Lights the tile under you in orange and its 8 neighbours in teal (corners darker), skipping tiles off the board.',GRID+`
local DIRECTIONS = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 }, { 1, 1 }, { 1, -1 }, { -1, 1 }, { -1, -1 } }
RunService.Heartbeat:Connect(function()
	local root = nearestPlayerRoot(ORIGIN)
	if not root then
		return
	end
	local x, z = cellOf(root.Position)
	clear()
	for _, direction in DIRECTIONS do
		local corner = direction[1] ~= 0 and direction[2] ~= 0
		paint(
			x + direction[1],
			z + direction[2],
			corner and Color3.fromRGB(10, 100, 110) or Color3.fromRGB(18, 147, 154)
		)
	end
	paint(x, z, Color3.fromRGB(226, 133, 26))
end)`],

'gr-distance':['S','Colours every tile by its Manhattan distance from the tile you stand on: a diamond-shaped range.',GRID+`
local RANGE = 4
RunService.Heartbeat:Connect(function()
	local root = nearestPlayerRoot(ORIGIN)
	if not root then
		return
	end
	local playerX, playerZ = cellOf(root.Position)
	for x = 1, WIDTH do
		for z = 1, HEIGHT do
			local distance = math.abs(x - playerX) + math.abs(z - playerZ) -- Manhattan
			paint(
				x,
				z,
				distance <= RANGE and Color3.fromHSV(0.08 + distance * 0.06, 0.8, 1)
					or Color3.fromRGB(200, 200, 205)
			)
		end
	end
end)`],

'gr-index':['S','Stores the grid in a flat list with index = (z − 1) × W + x and labels each tile with its index.',GRID+`
local flat = {}
for x = 1, WIDTH do
	for z = 1, HEIGHT do
		local index = (z - 1) * WIDTH + x
		flat[index] = tiles[x][z]
		makeLabel(tiles[x][z], tostring(index)).Parent.StudsOffset = Vector3.new(0, 1, 0)
	end
end
local chosenIndex = 37
local x, z = (chosenIndex - 1) % WIDTH + 1, (chosenIndex - 1) // WIDTH + 1
flat[chosenIndex].Color = Color3.fromRGB(226, 133, 26)
print("index", chosenIndex, "is cell", x, z)`],

'gr-flood':['S','Click a tile: a flood fill spreads from it ring by ring, around randomly placed walls.',GRID+`
local walls = {}
for x = 1, WIDTH do
	for z = 1, HEIGHT do
		if math.random() < 0.2 then
			walls[x .. "," .. z] = true
			tiles[x][z].Size = Vector3.new(CELL - 0.2, 3, CELL - 0.2)
			tiles[x][z].Color = Color3.fromRGB(50, 50, 60)
		end
	end
end
local generation = 0
for x = 1, WIDTH do
	for z = 1, HEIGHT do
		if not walls[x .. "," .. z] then
			local clickDetector = Instance.new("ClickDetector")
			clickDetector.Parent = tiles[x][z]
			clickDetector.MouseClick:Connect(function()
				generation += 1
				local myGeneration = generation
				for cellX = 1, WIDTH do
					for cellZ = 1, HEIGHT do
						if not walls[cellX .. "," .. cellZ] then
							tiles[cellX][cellZ].Color = Color3.fromRGB(200, 200, 205)
						end
					end
				end
				local distance, queue, head = { [x .. "," .. z] = 0 }, { { x, z } }, 1
				while head <= #queue and generation == myGeneration do
					local cellX, cellZ = queue[head][1], queue[head][2]
					head += 1
					tiles[cellX][cellZ].Color =
						Color3.fromHSV(0.08 + distance[cellX .. "," .. cellZ] * 0.03, 0.75, 1)
					for _, direction in { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } } do
						local nextX, nextZ = cellX + direction[1], cellZ + direction[2]
						local nextKey = nextX .. "," .. nextZ
						if
							tiles[nextX]
							and tiles[nextX][nextZ]
							and not walls[nextKey]
							and distance[nextKey] == nil
						then
							distance[nextKey] = distance[cellX .. "," .. cellZ] + 1
							table.insert(queue, { nextX, nextZ })
						end
					end
					task.wait(0.03)
				end
			end)
		end
	end
end`],

'gr-line':['S','Draws the Bresenham line of tiles from a fixed corner to the tile under you.',GRID+`
local function cellsOnLine(startX, startZ, endX, endZ)
	local cells = {}
	local deltaX, deltaZ = math.abs(endX - startX), -math.abs(endZ - startZ)
	local stepX, stepZ = startX < endX and 1 or -1, startZ < endZ and 1 or -1
	local errorTerm = deltaX + deltaZ
	while true do
		table.insert(cells, { startX, startZ })
		if startX == endX and startZ == endZ then
			break
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
	return cells
end
RunService.Heartbeat:Connect(function()
	local root = nearestPlayerRoot(ORIGIN)
	if not root then
		return
	end
	local x, z = cellOf(root.Position)
	x, z = math.clamp(x, 1, WIDTH), math.clamp(z, 1, HEIGHT)
	clear()
	for _, cell in cellsOnLine(1, 1, x, z) do
		paint(cell[1], cell[2], Color3.fromRGB(226, 133, 26))
	end
end)`],

'gr-rotate':['S','An L-shaped piece turns 90° every second around its pivot block: (x, z) → (−z, x).',GRID+`
local piece = { { 0, -1 }, { 0, 0 }, { 0, 1 }, { 1, 1 } } -- offsets from the pivot (second block)
local pivotX, pivotZ = 6, 5
while true do
	clear()
	for i, offset in piece do
		paint(
			pivotX + offset[1],
			pivotZ + offset[2],
			i == 2 and Color3.fromRGB(194, 65, 142) or Color3.fromRGB(226, 133, 26)
		)
	end
	task.wait(1)
	for i, offset in piece do
		piece[i] = { -offset[2], offset[1] }
	end -- rotate 90 degrees
end`],

'gr-hex':['S','Builds a hex grid with axial coordinates and highlights the hex distance rings around the centre.',`
local SIZE, RADIUS = 2.2, 5
local function hexToWorld(q, r)
	return ORIGIN + Vector3.new(SIZE * math.sqrt(3) * (q + r / 2), 0.3, SIZE * 1.5 * r)
end
local function hexDistance(q, r)
	return (math.abs(q) + math.abs(r) + math.abs(q + r)) / 2
end
for q = -RADIUS, RADIUS do
	for r = math.max(-RADIUS, -q - RADIUS), math.min(RADIUS, -q + RADIUS) do
		local distance = hexDistance(q, r)
		local hex = makePart(
			Vector3.new(0.6, SIZE * 1.9, SIZE * 1.9),
			hexToWorld(q, r),
			Color3.fromHSV(distance / (RADIUS + 1), 0.5, 0.95),
			{ Shape = Enum.PartType.Cylinder, Orientation = Vector3.new(0, 0, 90) }
		)
		if distance == 0 then
			makeLabel(hex, "0")
		end
	end
end`],

'gr-chunks':['S','A floor of 8 × 8 chunks: the ones within 1 chunk of the player light up (chunk = cell // chunk size).',`
local CELLS_PER_CHUNK, CELL, CHUNK_COUNT = 8, 1, 8
local CHUNK_STUDS = CELLS_PER_CHUNK * CELL
local chunks = {}
for chunkX = 0, CHUNK_COUNT - 1 do
	for chunkZ = 0, CHUNK_COUNT - 1 do
		chunks[chunkX * 100 + chunkZ] = makePart(
			Vector3.new(CHUNK_STUDS - 0.3, 0.4, CHUNK_STUDS - 0.3),
			ORIGIN
				+ Vector3.new(
					(chunkX - CHUNK_COUNT / 2 + 0.5) * CHUNK_STUDS,
					0.2,
					(chunkZ - CHUNK_COUNT / 2 + 0.5) * CHUNK_STUDS
				),
			Color3.fromRGB(70, 70, 80)
		)
	end
end
RunService.Heartbeat:Connect(function()
	local root = nearestPlayerRoot(ORIGIN)
	if not root then
		return
	end
	local offset = root.Position
		- ORIGIN
		+ Vector3.new(CHUNK_COUNT / 2 * CHUNK_STUDS, 0, CHUNK_COUNT / 2 * CHUNK_STUDS)
	local playerChunkX, playerChunkZ =
		math.floor(offset.X / CELL) // CELLS_PER_CHUNK, math.floor(offset.Z / CELL) // CELLS_PER_CHUNK
	for chunkX = 0, CHUNK_COUNT - 1 do
		for chunkZ = 0, CHUNK_COUNT - 1 do
			local loaded = math.abs(chunkX - playerChunkX) <= 1 and math.abs(chunkZ - playerChunkZ) <= 1
			chunks[chunkX * 100 + chunkZ].Color = (chunkX == playerChunkX and chunkZ == playerChunkZ)
					and Color3.fromRGB(226, 133, 26)
				or loaded and Color3.fromRGB(18, 147, 154)
				or Color3.fromRGB(70, 70, 80)
		end
	end
end)`],

/* ===== UI & screen maths ===== */
'ui-udim':['L','Two frames side by side: one sized with Scale (grows with the screen), one with Offset (fixed pixels). Resize the Studio window to compare.',GUI+`
local scaled = makeFrame({
	Size = UDim2.fromScale(0.3, 0.2),
	Position = UDim2.fromScale(0.05, 0.1),
	BackgroundColor3 = Color3.fromRGB(226, 133, 26),
})
local fixed = makeFrame({
	Size = UDim2.fromOffset(300, 120),
	Position = UDim2.new(0.5, 0, 0.1, 0),
	BackgroundColor3 = Color3.fromRGB(18, 147, 154),
})
for _, box in { scaled, fixed } do
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.TextScaled = true
	label.TextColor3 = Color3.new(1, 1, 1)
	label.Parent = box
	box:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
		label.Text = string.format(
			"%s: %.0f x %.0f px",
			box == scaled and "Scale" or "Offset",
			box.AbsoluteSize.X,
			box.AbsoluteSize.Y
		)
	end)
	label.Text = string.format("%.0f x %.0f px", box.AbsoluteSize.X, box.AbsoluteSize.Y)
end`],

'ui-anchor':['L','Four frames pinned to the screen corners and one centred, each using AnchorPoint so no maths is needed.',GUI+`
local spots = {
	{ Vector2.new(0, 0), UDim2.new(0, 16, 0, 16) },
	{ Vector2.new(1, 0), UDim2.new(1, -16, 0, 16) },
	{ Vector2.new(0, 1), UDim2.new(0, 16, 1, -16) },
	{ Vector2.new(1, 1), UDim2.new(1, -16, 1, -16) },
	{ Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.5) },
}
for i, spot in spots do
	makeFrame({
		AnchorPoint = spot[1],
		Position = spot[2],
		Size = UDim2.fromOffset(140, 60),
		BackgroundColor3 = Color3.fromHSV(i / 6, 0.6, 0.9),
	})
end`],

'ui-aspect':['L','A 16:9 panel that keeps its shape on any screen using UIAspectRatioConstraint.',GUI+`
local panel = makeFrame({
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.fromScale(0.7, 0.7),
	BackgroundColor3 = Color3.fromRGB(18, 147, 154),
})
local ratio = Instance.new("UIAspectRatioConstraint")
ratio.AspectRatio = 16 / 9
ratio.Parent = panel
local label = Instance.new("TextLabel")
label.Size = UDim2.fromScale(1, 0.2)
label.BackgroundTransparency = 1
label.TextScaled = true
label.Text = "always 16:9"
label.TextColor3 = Color3.new(1, 1, 1)
label.Parent = panel`],

'ui-worldtoscreen':['L','A screen marker sits over a 3D part using camera:WorldToViewportPoint, and hides when the part is off screen.',GUI+`
local target = makePart(
	Vector3.new(2, 2, 2),
	ORIGIN + Vector3.new(0, 4, 0),
	Color3.fromRGB(226, 133, 26),
	{ Material = Enum.Material.Neon }
)
local marker = makeFrame({
	AnchorPoint = Vector2.new(0.5, 1),
	Size = UDim2.fromOffset(120, 30),
	BackgroundColor3 = Color3.fromRGB(30, 30, 35),
})
local label = Instance.new("TextLabel")
label.Size = UDim2.fromScale(1, 1)
label.BackgroundTransparency = 1
label.TextColor3 = Color3.new(1, 1, 1)
label.Text = "Objective"
label.Parent = marker
RunService.RenderStepped:Connect(function()
	local screenPosition, onScreen = camera:WorldToViewportPoint(target.Position + Vector3.new(0, 1.5, 0))
	marker.Visible = onScreen
	marker.Position = UDim2.fromOffset(screenPosition.X, screenPosition.Y)
end)`],

'ui-offscreen':['L','An arrow at the screen edge points to an objective whenever it is off screen.',GUI+`
local objective = makePart(
	Vector3.new(3, 3, 3),
	Vector3.new(150, 6, 150),
	Color3.fromRGB(250, 200, 40),
	{ Material = Enum.Material.Neon }
)
local arrow = Instance.new("TextLabel")
arrow.AnchorPoint = Vector2.new(0.5, 0.5)
arrow.Size = UDim2.fromOffset(44, 44)
arrow.BackgroundTransparency = 1
arrow.TextScaled = true
arrow.TextColor3 = Color3.fromRGB(250, 200, 40)
arrow.Text = utf8.char(0x27A4)
arrow.Parent = gui
RunService.RenderStepped:Connect(function()
	local screenPosition, onScreen = camera:WorldToViewportPoint(objective.Position)
	arrow.Visible = not onScreen
	if onScreen then
		return
	end
	local centre = camera.ViewportSize / 2
	local direction = Vector2.new(screenPosition.X, screenPosition.Y) - centre
	if screenPosition.Z < 0 then
		direction = -direction
	end
	local half = centre - Vector2.new(50, 50)
	local scale = math.min(
		half.X / math.max(math.abs(direction.X), 1e-3),
		half.Y / math.max(math.abs(direction.Y), 1e-3)
	)
	local edge = centre + direction * math.min(1, scale)
	arrow.Position = UDim2.fromOffset(edge.X, edge.Y)
	arrow.Rotation = math.deg(math.atan2(direction.Y, direction.X))
end)`],

'ui-bars':['L','Your health bar with a delayed damage trail. Click anywhere to take 15 damage and watch it.',GUI+`
local UserInputService = game:GetService("UserInputService")
local background = makeFrame({
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 1, -30),
	Size = UDim2.new(0.35, 0, 0, 20),
	BackgroundColor3 = Color3.fromRGB(30, 30, 35),
})
local trail = makeFrame({
	Parent = background,
	Size = UDim2.fromScale(1, 1),
	BackgroundColor3 = Color3.fromRGB(250, 230, 200),
})
local fill = makeFrame({
	Parent = background,
	Size = UDim2.fromScale(1, 1),
	BackgroundColor3 = Color3.fromRGB(60, 200, 90),
})
local health, maxHealth = 100, 100
UserInputService.InputBegan:Connect(function(input, processed)
	if processed or input.UserInputType ~= Enum.UserInputType.MouseButton1 then
		return
	end
	health = health - 15 <= 0 and maxHealth or health - 15
	local fraction = health / maxHealth
	fill.Size = UDim2.fromScale(fraction, 1)
	fill.BackgroundColor3 = Color3.fromRGB(230, 60, 60):Lerp(Color3.fromRGB(60, 200, 90), fraction)
	if fraction == 1 then
		trail.Size = UDim2.fromScale(1, 1)
	end
	task.delay(0.4, function()
		TweenService:Create(trail, TweenInfo.new(0.5), { Size = UDim2.fromScale(health / maxHealth, 1) })
			:Play()
	end)
end)`],

'ui-radial':['L','Press Q to use an ability with a 4-second cooldown; a bar drains and the remaining seconds count down.',GUI+`
local UserInputService = game:GetService("UserInputService")
local COOLDOWN = 4
local readyAt = 0
local button = makeFrame({
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 1, -70),
	Size = UDim2.fromOffset(80, 80),
	BackgroundColor3 = Color3.fromRGB(18, 147, 154),
})
local shade = makeFrame({
	Parent = button,
	AnchorPoint = Vector2.new(0, 1),
	Position = UDim2.fromScale(0, 1),
	Size = UDim2.fromScale(1, 0),
	BackgroundColor3 = Color3.new(0, 0, 0),
	BackgroundTransparency = 0.4,
})
local label = Instance.new("TextLabel")
label.Size = UDim2.fromScale(1, 1)
label.BackgroundTransparency = 1
label.TextScaled = true
label.TextColor3 = Color3.new(1, 1, 1)
label.Parent = button
UserInputService.InputBegan:Connect(function(input, processed)
	if not processed and input.KeyCode == Enum.KeyCode.Q and os.clock() >= readyAt then
		readyAt = os.clock() + COOLDOWN
	end
end)
RunService.RenderStepped:Connect(function()
	local remaining = math.clamp((readyAt - os.clock()) / COOLDOWN, 0, 1)
	shade.Size = UDim2.fromScale(1, remaining) -- angle would be remaining * 360
	label.Text = remaining > 0 and string.format("%.1f", remaining * COOLDOWN) or "Q"
end)`],

'ui-layout':['L','Lays out 14 inventory slots in a grid by hand: column = (i − 1) % 5, row = (i − 1) // 5.',GUI+`
local COLUMNS, SIZE, PADDING = 5, 70, 10
local panel = makeFrame({
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.fromOffset(COLUMNS * (SIZE + PADDING) + PADDING, 3 * (SIZE + PADDING) + PADDING),
	BackgroundColor3 = Color3.fromRGB(30, 30, 35),
})
for i = 1, 14 do
	local column, row = (i - 1) % COLUMNS, (i - 1) // COLUMNS
	local slot = makeFrame({
		Parent = panel,
		Size = UDim2.fromOffset(SIZE, SIZE),
		Position = UDim2.fromOffset(PADDING + column * (SIZE + PADDING), PADDING + row * (SIZE + PADDING)),
		BackgroundColor3 = Color3.fromHSV(i / 14, 0.5, 0.85),
	})
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = tostring(i)
	label.TextScaled = true
	label.Parent = slot
end`],

'ui-drag':['L','A window you can drag with the mouse. It moves by the mouse delta and is clamped inside the screen.',GUI+`
local UserInputService = game:GetService("UserInputService")
local window = makeFrame({
	Size = UDim2.fromOffset(280, 180),
	Position = UDim2.fromOffset(100, 100),
	BackgroundColor3 = Color3.fromRGB(18, 147, 154),
})
local dragging, mouseStart, frameStart = false, nil, nil
window.InputBegan:Connect(function(input)
	if
		input.UserInputType == Enum.UserInputType.MouseButton1
		or input.UserInputType == Enum.UserInputType.Touch
	then
		dragging, mouseStart, frameStart = true, input.Position, window.AbsolutePosition
	end
end)
UserInputService.InputChanged:Connect(function(input)
	if not dragging then
		return
	end
	if
		input.UserInputType ~= Enum.UserInputType.MouseMovement
		and input.UserInputType ~= Enum.UserInputType.Touch
	then
		return
	end
	local delta = input.Position - mouseStart
	local screen = gui.AbsoluteSize
	local x = math.clamp(frameStart.X + delta.X, 0, screen.X - window.AbsoluteSize.X)
	local y = math.clamp(frameStart.Y + delta.Y, 0, screen.Y - window.AbsoluteSize.Y)
	window.Position = UDim2.fromOffset(x, y)
end)
UserInputService.InputEnded:Connect(function(input)
	if
		input.UserInputType == Enum.UserInputType.MouseButton1
		or input.UserInputType == Enum.UserInputType.Touch
	then
		dragging = false
	end
end)`],

/* ===== Numbers & formatting ===== */
'num-round':['S','Prints rounding to 0–3 decimals with math.round(x × 10^d) / 10^d and with string.format, and labels a sign.',`
local value = 3.14159
for places = 0, 3 do
	local multiplier = 10 ^ places
	print(
		places,
		"places:",
		math.round(value * multiplier) / multiplier,
		math.floor(value * multiplier) / multiplier,
		math.ceil(value * multiplier) / multiplier,
		string.format("%." .. places .. "f", value)
	)
end
local sign = makePart(Vector3.new(4, 2, 0.4), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(30, 30, 35))
makeLabel(sign, "pi to 2 places: " .. string.format("%.2f", value))`],

'num-abbrev':['S','A counter grows exponentially and is shown abbreviated (1.2K, 3.4M, ...), rounding down and fixing the 1000K edge case.',`
local SUFFIX = { "", "K", "M", "B", "T", "Qa", "Qi" }
local function abbreviate(number)
	if number < 1000 then
		return tostring(math.floor(number))
	end
	local tier = math.floor(math.log10(number) / 3)
	local value = math.floor(number / 1000 ^ tier * 10) / 10
	if value >= 1000 then
		tier += 1
		value /= 1000
	end
	local text = string.format("%.1f", value):gsub("%.0$", "")
	return text .. (SUFFIX[tier + 1] or "e" .. tier * 3)
end
local board = makePart(Vector3.new(6, 3, 0.5), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(30, 30, 35))
local label = makeLabel(board)
local amount = 1
while true do
	amount = amount * 1.4 + 3
	label.Text = abbreviate(amount) .. " coins"
	task.wait(0.4)
end`],

'num-time':['S','A round timer counts down from 2:30 shown as mm:ss using // and % with string.format("%02d").',`
local board = makePart(Vector3.new(6, 3, 0.5), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(30, 30, 35))
local label = makeLabel(board)
local function formatTime(seconds)
	return string.format("%02d:%02d", seconds // 60, seconds % 60)
end
while true do
	local endsAt = os.clock() + 150
	while os.clock() < endsAt do
		label.Text = formatTime(math.ceil(endsAt - os.clock()))
		task.wait(0.2)
	end
	label.Text = "TIME!"
	task.wait(2)
end`],

'num-percent':['S','Prints why +50% then −50% does not return to the start, and how to undo a boost by dividing.',`
local function changeBy(value, percent)
	return value * (1 + percent / 100)
end
local price = 100
local up = changeBy(price, 50)
local down = changeBy(up, -50)
print("start", price, "+50% ->", up, "then -50% ->", down)
print("undo +50% properly:", up / 1.5)
print("stacked buffs, adding: +20% +30% ->", 100 * (1 + 0.2 + 0.3), "  multiplying ->", 100 * 1.2 * 1.3)
local sign = makePart(Vector3.new(6, 2, 0.4), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(30, 30, 35))
makeLabel(sign, string.format("100 +50%% -50%% = %g", down))`],

'num-float':['S','Prints floating-point surprises (0.1 + 0.2), adds 0.1 a thousand times, and compares safely with a tolerance.',`
print("0.1 + 0.2 == 0.3 ?", 0.1 + 0.2 == 0.3)
print(string.format("0.1 + 0.2 = %.17g", 0.1 + 0.2))
local total = 0
for _ = 1, 1000 do
	total += 0.1
end
print(string.format("1000 x 0.1 = %.17g", total))
local function nearlyEqual(first, second)
	return math.abs(first - second) < 1e-9
end
print("nearlyEqual(0.1 + 0.2, 0.3) ->", nearlyEqual(0.1 + 0.2, 0.3))
local sign = makePart(Vector3.new(6, 2, 0.4), ORIGIN + Vector3.new(0, 3, 0), Color3.fromRGB(30, 30, 35))
makeLabel(sign, "see the Output window")`],

'num-bignum':['S','Prints where whole numbers stop being exact (2^53) and keeps a simulator total as mantissa + exponent instead.',`
print("2^53     =", string.format("%.0f", 2 ^ 53))
print("2^53 + 1 == 2^53 ?", 2 ^ 53 + 1 == 2 ^ 53)
local money = { mantissa = 1.5, exponent = 0 } -- 1.5 x 10^e
local function grow(value, factor)
	local mantissa, exponent = value.mantissa * factor, value.exponent
	while mantissa >= 10 do
		mantissa /= 10
		exponent += 1
	end
	return { mantissa = mantissa, exponent = exponent }
end
local board = makePart(Vector3.new(6, 3, 0.5), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(30, 30, 35))
local label = makeLabel(board)
while true do
	money = grow(money, 7.3)
	label.Text = string.format("%.2f x 10^%d", money.mantissa, money.exponent)
	task.wait(0.3)
end`],

'num-commas':['S','Formats numbers with thousands separators using the reverse-gsub-reverse trick.',`
local function withCommas(number)
	local text = tostring(math.floor(number))
	return (text:reverse():gsub("(%d%d%d)", "%1,"):reverse():gsub("^,", ""))
end
for _, number in { 7, 1234, 123456, 1234567, 9876543210 } do
	print(number, "->", withCommas(number))
end
local board = makePart(Vector3.new(6, 3, 0.5), ORIGIN + Vector3.new(0, 4, 0), Color3.fromRGB(30, 30, 35))
local label = makeLabel(board)
local number = 0
while true do
	number = number * 3 + math.random(1, 9)
	if number > 1e13 then
		number = 0
	end
	label.Text = withCommas(number)
	task.wait(0.3)
end`],

'num-intdiv':['S','Splits 157 items into stacks of 64 with // and %, and builds the stacks as piles of blocks.',`
local TOTAL, STACK = 157, 64
local full, leftover = TOTAL // STACK, TOTAL % STACK
print(TOTAL, "items =", full, "full stacks +", leftover, "left over")
for stack = 0, full do
	local count = stack < full and STACK or leftover
	for i = 0, count - 1 do
		makePart(
			Vector3.new(0.9, 0.4, 0.9),
			ORIGIN + Vector3.new(stack * 4 + (i % 4) - 1.5, 0.2 + (i // 16) * 0.45, (i // 4) % 4 - 1.5),
			stack < full and Color3.fromRGB(18, 147, 154) or Color3.fromRGB(226, 133, 26)
		)
	end
end`],

'num-stats':['S','Records fake ping samples with one big spike and prints the mean and median: the median ignores the spike.',`
local samples = {}
for i = 1, 15 do
	samples[i] = 40 + math.random() * 30
end
samples[8] = 600 -- one lag spike
local function mean(list)
	local sum = 0
	for _, sample in list do
		sum += sample
	end
	return sum / #list
end
local function median(list)
	local sorted = table.clone(list)
	table.sort(sorted)
	local middle = #sorted // 2
	if #sorted % 2 == 1 then
		return sorted[middle + 1]
	end
	return (sorted[middle] + sorted[middle + 1]) / 2
end
for i, sample in samples do
	makePart(
		Vector3.new(1, sample / 40, 1),
		ORIGIN + Vector3.new((i - 8) * 1.5, sample / 80, 0),
		i == 8 and Color3.fromRGB(230, 60, 60) or Color3.fromRGB(163, 162, 165)
	)
end
local sign = makePart(Vector3.new(1, 1, 1), ORIGIN + Vector3.new(0, 18, 0), Color3.new(1, 1, 1))
makeLabel(sign, string.format("mean %.0f ms   median %.0f ms", mean(samples), median(samples)))`],
});
})();
