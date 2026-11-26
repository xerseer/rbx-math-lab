/* Ready-to-run Studio scripts, one per subject. Each builds its own parts, so it works in an empty Baseplate. */
(function(){
"use strict";
const SS = 'Script → ServerScriptService', LS = 'LocalScript → StarterPlayer › StarterPlayerScripts';
Lab.STUDIO = {

vector3:{where:SS, title:'Chaser orb', what:'A glowing orb chases the nearest player within 40 studs at a steady speed, using subtraction, Magnitude and .Unit, and never overshoots.', code:
`-- Chaser orb: follows the nearest player in range at a fixed speed
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local RANGE, SPEED = 40, 12

local orb = Instance.new("Part")
orb.Shape = Enum.PartType.Ball
orb.Size = Vector3.new(2, 2, 2)
orb.Material = Enum.Material.Neon
orb.Anchored = true
orb.CanCollide = false
orb.Position = Vector3.new(0, 4, -15)
orb.Parent = workspace

local function nearestRoot()
	local best, bestDist = nil, RANGE
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local dist = (root.Position - orb.Position).Magnitude
			if dist < bestDist then
				best, bestDist = root, dist
			end
		end
	end
	return best
end

RunService.Heartbeat:Connect(function(dt)
	local root = nearestRoot()
	if not root then
		orb.Color = Color3.fromRGB(60, 200, 90)       -- nobody in range
		return
	end
	orb.Color = Color3.fromRGB(230, 60, 60)
	local offset = (root.Position + Vector3.new(0, 3, 0)) - orb.Position
	local distance = offset.Magnitude
	if distance > 0.05 then
		local step = math.min(SPEED * dt, distance)   -- never overshoot
		orb.Position += offset.Unit * step
	end
end)`},

vecmath:{where:SS, title:'Guard with a vision cone', what:'A guard sweeps left and right. Players inside its 90° cone, within range and not behind a wall are spotted (dot product + raycast). The sign of a cross product says which side they are on.', code:
`-- Guard with a vision cone: dot product for the cone, raycast for walls, cross product for left/right
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local FOV, RANGE = 90, 60
local BASE = Vector3.new(0, 2.5, -25)

local guard = Instance.new("Part")
guard.Size = Vector3.new(3, 5, 2)
guard.Anchored = true
guard.Parent = workspace

local visor = Instance.new("Part")             -- marks the front
visor.Size = Vector3.new(2.4, 0.6, 0.2)
visor.Material = Enum.Material.Neon
visor.Anchored = true
visor.CanCollide = false
visor.Parent = workspace

local wall = Instance.new("Part")              -- something to hide behind
wall.Size = Vector3.new(8, 8, 1)
wall.Anchored = true
wall.Position = BASE + Vector3.new(6, 1.5, 12)
wall.Parent = workspace

local billboard = Instance.new("BillboardGui")
billboard.Size = UDim2.fromOffset(220, 40)
billboard.StudsOffset = Vector3.new(0, 4.5, 0)
billboard.Parent = guard
local label = Instance.new("TextLabel")
label.Size = UDim2.fromScale(1, 1)
label.BackgroundTransparency = 1
label.TextScaled = true
label.TextColor3 = Color3.new(1, 1, 1)
label.Parent = billboard

local params = RaycastParams.new()
params.FilterType = Enum.RaycastFilterType.Exclude

RunService.Heartbeat:Connect(function()
	local yaw = math.rad(70) * math.sin(os.clock() * 0.6)
	guard.CFrame = CFrame.new(BASE) * CFrame.Angles(0, yaw, 0)
	visor.CFrame = guard.CFrame * CFrame.new(0, 1.5, -1.05)

	local spotted = nil
	for _, player in Players:GetPlayers() do
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart")
		if root then
			local offset = root.Position - guard.Position
			if offset.Magnitude < RANGE then
				local dot = guard.CFrame.LookVector:Dot(offset.Unit)
				if dot > math.cos(math.rad(FOV / 2)) then
					params.FilterDescendantsInstances = { guard, visor, character }
					if workspace:Raycast(guard.Position, offset, params) == nil then
						local side = guard.CFrame.LookVector:Cross(offset.Unit).Y > 0 and "left" or "right"
						spotted = player.Name .. " (" .. side .. ")"
					end
				end
			end
		end
	end

	guard.Color = spotted and Color3.fromRGB(230, 60, 60) or Color3.fromRGB(90, 160, 230)
	label.Text = spotted and ("Spotted: " .. spotted) or "Watching..."
end)`},

cframe:{where:SS, title:'Orbiting moons and a hinged door', what:'Six moons orbit a spinning planet (CFrame multiplication order) and a door swings around its hinge edge (pivot * rotation * pivot:Inverse()).', code:
`-- Orbits and a hinged door, all with CFrame maths
local RunService = game:GetService("RunService")

local function makePart(size, color, cframe)
	local p = Instance.new("Part")
	p.Size = size
	p.Color = color
	p.Anchored = true
	p.CFrame = cframe
	p.Parent = workspace
	return p
end

local planet = makePart(Vector3.new(4, 4, 4), Color3.fromRGB(240, 180, 60), CFrame.new(0, 8, -20))
planet.Shape = Enum.PartType.Ball

local moons = {}
for i = 1, 6 do
	moons[i] = makePart(Vector3.new(1.5, 1.5, 2.5), Color3.fromHSV(i / 6, 0.6, 1), CFrame.new())
end

local hinge = CFrame.new(14, 4.5, -20)                          -- the door's left edge
local door = makePart(Vector3.new(6, 9, 0.5), Color3.fromRGB(150, 110, 70), hinge * CFrame.new(3, 0, 0))
local closed = door.CFrame

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	planet.CFrame = CFrame.new(0, 8, -20) * CFrame.Angles(0, t * 0.5, 0)

	for i, moon in moons do
		local angle = t * 0.8 + (i - 1) / #moons * math.pi * 2
		-- rotate first, then step out: an orbit
		moon.CFrame = planet.CFrame * CFrame.Angles(0, angle, 0) * CFrame.new(7, math.sin(t * 2 + i), 0)
	end

	-- swing around the hinge instead of the door's centre
	local open = math.rad(100) * (0.5 - 0.5 * math.cos(t))
	door.CFrame = hinge * CFrame.Angles(0, open, 0) * hinge:Inverse() * closed
end)`},

math:{where:SS, title:'Ring of bobbing coins', what:'Ten coins placed evenly around a circle with cos and sin, bobbing with math.sin, drifting with math.noise and spinning. Touch one to collect it; it comes back after 3 seconds.', code:
`-- Coins on a circle: cos/sin placement, sine bobbing, noise drift
local RunService = game:GetService("RunService")

local COUNT, RADIUS = 10, 14
local CENTER = Vector3.new(0, 4, -30)
local coins = {}

for i = 1, COUNT do
	local coin = Instance.new("Part")
	coin.Shape = Enum.PartType.Cylinder               -- round faces point along X
	coin.Size = Vector3.new(0.4, 3, 3)
	coin.Color = Color3.fromRGB(250, 200, 40)
	coin.Material = Enum.Material.Neon
	coin.Anchored = true
	coin.CanCollide = false
	coin.Parent = workspace
	coins[i] = coin

	coin.Touched:Connect(function(hit)
		if coin.Transparency == 0 and hit.Parent:FindFirstChildOfClass("Humanoid") then
			coin.Transparency = 1
			task.delay(3, function() coin.Transparency = 0 end)
		end
	end)
end

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	for i, coin in coins do
		local angle = (i - 1) / COUNT * math.pi * 2 + t * 0.2
		local ring = Vector3.new(math.cos(angle), 0, math.sin(angle)) * RADIUS
		local bob = math.sin(t * 2 + i) * 0.6
		local drift = math.noise(i * 0.37, t * 0.5) * 1.5
		coin.CFrame = CFrame.new(CENTER + ring + Vector3.new(0, bob + drift, 0)) * CFrame.Angles(0, t * 2, 0)
	end
end)`},

bezier:{where:SS, title:'Grenade launcher with Bézier arcs', what:'Every couple of seconds a ball is lobbed from a launcher and lands exactly on a random target, following a quadratic Bézier arc. The landing makes a harmless explosion.', code:
`-- Lobbed projectiles that always land on target, using a quadratic Bézier
local RunService = game:GetService("RunService")

local function makePart(size, color, position, shape)
	local p = Instance.new("Part")
	p.Size = size
	p.Color = color
	p.Position = position
	p.Anchored = true
	p.CanCollide = false
	if shape then p.Shape = shape end
	p.Parent = workspace
	return p
end

local function quadBezier(p0, p1, p2, t)
	return p0:Lerp(p1, t):Lerp(p1:Lerp(p2, t), t)
end

local launcher = makePart(Vector3.new(3, 3, 3), Color3.fromRGB(80, 80, 90), Vector3.new(-25, 1.5, -30))
local rng = Random.new()

while true do
	local target = Vector3.new(rng:NextNumber(-10, 15), 0.6, rng:NextNumber(-45, -15))
	local marker = makePart(Vector3.new(0.2, 4, 4), Color3.fromRGB(230, 60, 60), target, Enum.PartType.Cylinder)
	marker.CFrame = CFrame.new(target) * CFrame.Angles(0, 0, math.rad(90))   -- lie flat

	local p0 = launcher.Position + Vector3.new(0, 2, 0)
	local p1 = (p0 + target) / 2 + Vector3.new(0, rng:NextNumber(12, 25), 0)   -- control point above the middle
	local ball = makePart(Vector3.new(1.4, 1.4, 1.4), Color3.fromRGB(60, 60, 60), p0, Enum.PartType.Ball)

	local FLIGHT_TIME = 1.4
	local start = os.clock()
	while true do
		local t = (os.clock() - start) / FLIGHT_TIME
		if t >= 1 then break end
		ball.Position = quadBezier(p0, p1, target, t)
		RunService.Heartbeat:Wait()
	end

	local boom = Instance.new("Explosion")
	boom.Position = target
	boom.BlastPressure = 0                 -- visual only: no knockback
	boom.DestroyJointRadiusPercent = 0     -- and no broken joints
	boom.Parent = workspace

	ball:Destroy()
	task.delay(1, function() marker:Destroy() end)
	task.wait(1.2)
end`},

probability:{where:SS, title:'Loot chest with weights and pity', what:'Click the chest to roll a weighted loot table. Every 20 rolls without a Legendary guarantees one (pity). The result and its real percentage show above the chest.', code:
`-- Weighted loot chest with a pity counter (click it)
local Players = game:GetService("Players")

local LOOT = {
	{ name = "Common",    weight = 60, color = Color3.fromRGB(200, 200, 200) },
	{ name = "Uncommon",  weight = 25, color = Color3.fromRGB(60, 200, 90) },
	{ name = "Rare",      weight = 10, color = Color3.fromRGB(70, 130, 240) },
	{ name = "Legendary", weight = 5,  color = Color3.fromRGB(250, 170, 40) },
}
local PITY = 20

local total = 0
for _, item in LOOT do total += item.weight end

local chest = Instance.new("Part")
chest.Size = Vector3.new(4, 3, 3)
chest.Color = Color3.fromRGB(140, 90, 40)
chest.Anchored = true
chest.Position = Vector3.new(10, 1.5, -15)
chest.Parent = workspace

local click = Instance.new("ClickDetector")
click.Parent = chest

local billboard = Instance.new("BillboardGui")
billboard.Size = UDim2.fromOffset(260, 60)
billboard.StudsOffset = Vector3.new(0, 4, 0)
billboard.Parent = chest
local label = Instance.new("TextLabel")
label.Size = UDim2.fromScale(1, 1)
label.BackgroundTransparency = 1
label.TextScaled = true
label.Text = "Click to open"
label.TextColor3 = Color3.new(1, 1, 1)
label.Parent = billboard

local rng = Random.new()
local sinceLegendary = {}

local function roll(player)
	sinceLegendary[player] = (sinceLegendary[player] or 0) + 1
	if sinceLegendary[player] >= PITY then
		sinceLegendary[player] = 0
		return LOOT[#LOOT], true
	end
	local pick = rng:NextNumber(0, total)
	for _, item in LOOT do
		pick -= item.weight
		if pick <= 0 then
			if item.name == "Legendary" then sinceLegendary[player] = 0 end
			return item, false
		end
	end
	return LOOT[1], false
end

click.MouseClick:Connect(function(player)
	local item, fromPity = roll(player)
	label.Text = string.format("%s got %s (%.0f%%)%s", player.Name, item.name, item.weight / total * 100, fromPity and " - pity!" or "")
	label.TextColor3 = item.color
end)

Players.PlayerRemoving:Connect(function(player) sinceLegendary[player] = nil end)`},

raycast:{where:SS, title:'Bouncing laser room', what:'A rotating emitter fires a laser that bounces off walls up to 6 times: raycast, reflect off the Normal, repeat. The beam is drawn with neon parts.', code:
`-- A laser that ricochets around a room: raycast + reflect in a loop
local RunService = game:GetService("RunService")

local CENTER = Vector3.new(0, 3, -45)
local folder = Instance.new("Folder")
folder.Name = "LaserRoom"
folder.Parent = workspace

local function makePart(size, cframe, color, parent)
	local p = Instance.new("Part")
	p.Size = size
	p.CFrame = cframe
	p.Color = color
	p.Anchored = true
	p.Parent = parent or folder
	return p
end

-- walls and a couple of angled pillars
makePart(Vector3.new(40, 6, 1), CFrame.new(CENTER + Vector3.new(0, 0, -20)), Color3.fromRGB(90, 90, 100))
makePart(Vector3.new(40, 6, 1), CFrame.new(CENTER + Vector3.new(0, 0, 20)), Color3.fromRGB(90, 90, 100))
makePart(Vector3.new(1, 6, 40), CFrame.new(CENTER + Vector3.new(20, 0, 0)), Color3.fromRGB(90, 90, 100))
makePart(Vector3.new(1, 6, 40), CFrame.new(CENTER + Vector3.new(-20, 0, 0)), Color3.fromRGB(90, 90, 100))
makePart(Vector3.new(4, 6, 4), CFrame.new(CENTER + Vector3.new(7, 0, -6)) * CFrame.Angles(0, math.rad(30), 0), Color3.fromRGB(150, 80, 160))
makePart(Vector3.new(3, 6, 6), CFrame.new(CENTER + Vector3.new(-8, 0, 7)) * CFrame.Angles(0, math.rad(-20), 0), Color3.fromRGB(150, 80, 160))

local emitter = makePart(Vector3.new(1.5, 1.5, 2.5), CFrame.new(CENTER), Color3.fromRGB(40, 40, 40))

local beams = Instance.new("Folder")
beams.Parent = folder
local segments = {}
local MAX_BOUNCES = 6
for i = 1, MAX_BOUNCES do
	local seg = makePart(Vector3.new(0.2, 0.2, 1), CFrame.new(), Color3.fromRGB(255, 60, 60), beams)
	seg.Material = Enum.Material.Neon
	seg.CanCollide = false
	seg.CanQuery = false                  -- rays ignore the beam itself
	segments[i] = seg
end

local params = RaycastParams.new()
params.FilterType = Enum.RaycastFilterType.Exclude
params.FilterDescendantsInstances = { emitter, beams }

RunService.Heartbeat:Connect(function()
	emitter.CFrame = CFrame.new(CENTER) * CFrame.Angles(0, os.clock() * 0.4, 0)
	local origin, direction = emitter.Position, emitter.CFrame.LookVector
	local used = 0
	for i = 1, MAX_BOUNCES do
		local result = workspace:Raycast(origin, direction * 100, params)
		local hit = result and result.Position or origin + direction * 100
		local seg = segments[i]
		seg.Size = Vector3.new(0.2, 0.2, (hit - origin).Magnitude)
		seg.CFrame = CFrame.lookAt((origin + hit) / 2, hit)
		seg.Transparency = 0
		used = i
		if not result then break end
		local n = result.Normal
		direction = direction - 2 * direction:Dot(n) * n      -- reflect
		origin = result.Position + n * 0.01                    -- step off the wall
	end
	for i = used + 1, MAX_BOUNCES do segments[i].Transparency = 1 end
end)`},

bitwise:{where:SS, title:'Status flags with buttons', what:'A dummy stores four status effects as bits in one number attribute. Click the buttons to flip flags with bit32.bxor; its look updates with bit32.btest.', code:
`-- Status effects stored as bits in one number
local FLAGS = { Stunned = 1, OnFire = 2, Shielded = 4, Invisible = 8 }
local ORDER = { "Stunned", "OnFire", "Shielded", "Invisible" }
local ORIGIN = Vector3.new(-15, 0, -20)

local dummy = Instance.new("Part")
dummy.Size = Vector3.new(3, 5, 2)
dummy.Anchored = true
dummy.Position = ORIGIN + Vector3.new(0, 2.5, 0)
dummy:SetAttribute("Status", 0)
dummy.Parent = workspace

local billboard = Instance.new("BillboardGui")
billboard.Size = UDim2.fromOffset(240, 50)
billboard.StudsOffset = Vector3.new(0, 4, 0)
billboard.Parent = dummy
local label = Instance.new("TextLabel")
label.Size = UDim2.fromScale(1, 1)
label.BackgroundTransparency = 1
label.TextScaled = true
label.TextColor3 = Color3.new(1, 1, 1)
label.Parent = billboard

local function binary(n)
	local s = ""
	for bit = 3, 0, -1 do s ..= tostring(bit32.extract(n, bit)) end
	return s
end

local function refresh()
	local status = dummy:GetAttribute("Status")
	dummy.Color = bit32.btest(status, FLAGS.OnFire) and Color3.fromRGB(255, 120, 30) or Color3.fromRGB(160, 160, 170)
	dummy.Material = bit32.btest(status, FLAGS.Shielded) and Enum.Material.ForceField or Enum.Material.SmoothPlastic
	dummy.Transparency = bit32.btest(status, FLAGS.Invisible) and 0.8 or 0
	dummy.Orientation = bit32.btest(status, FLAGS.Stunned) and Vector3.new(0, 0, 15) or Vector3.zero
	label.Text = string.format("Status = %d (0b%s)", status, binary(status))
end
dummy:GetAttributeChangedSignal("Status"):Connect(refresh)
refresh()

for i, name in ORDER do
	local button = Instance.new("Part")
	button.Size = Vector3.new(3, 1, 3)
	button.Anchored = true
	button.Position = ORIGIN + Vector3.new(-6 + (i - 1) * 4, 0.5, 6)
	button.Color = Color3.fromHSV(i / 5, 0.6, 0.9)
	button.Parent = workspace

	local tag = billboard:Clone()
	tag.StudsOffset = Vector3.new(0, 2, 0)
	tag.TextLabel.Text = name .. " (" .. FLAGS[name] .. ")"
	tag.Parent = button

	local click = Instance.new("ClickDetector")
	click.Parent = button
	click.MouseClick:Connect(function()
		dummy:SetAttribute("Status", bit32.bxor(dummy:GetAttribute("Status"), FLAGS[name]))   -- flip this flag
	end)
end`},

trig:{where:LS, title:'Ripple pool', what:'A 16 × 16 grid of columns rises and falls in a ripple: height = sin(distance from the centre − time). Runs on the client so it stays smooth.', code:
`-- A ripple: each column's height is a sine of its distance from the centre
local RunService = game:GetService("RunService")

local SIZE, GAP = 16, 2
local CENTER = Vector3.new(0, 0, -40)
local columns = {}

for x = 1, SIZE do
	for z = 1, SIZE do
		local p = Instance.new("Part")
		p.Size = Vector3.new(1.8, 1, 1.8)
		p.Anchored = true
		p.CanCollide = false
		p.Material = Enum.Material.SmoothPlastic
		p.Parent = workspace
		local offset = Vector3.new((x - SIZE / 2 - 0.5) * GAP, 0, (z - SIZE / 2 - 0.5) * GAP)
		table.insert(columns, { part = p, offset = offset, dist = offset.Magnitude })
	end
end

RunService.RenderStepped:Connect(function()
	local t = os.clock()
	for _, c in columns do
		local wave = math.sin(c.dist * 0.5 - t * 3)               -- -1 .. 1
		local height = 3 + wave * 2
		c.part.Size = Vector3.new(1.8, height, 1.8)
		c.part.Position = CENTER + c.offset + Vector3.new(0, height / 2, 0)
		c.part.Color = Color3.fromHSV(0.55 + wave * 0.08, 0.7, 0.75 + wave * 0.2)
	end
end)`},

anim:{where:SS, title:'Tween showcase', what:'A platform ping-pongs forever (TweenInfo with -1 repeats and reverses), a row of cubes pops in with staggered delays, and a ball bounces with squash and stretch.', code:
`-- TweenInfo loops, staggered pop-ins and squash & stretch
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")

local function makePart(size, color, position)
	local p = Instance.new("Part")
	p.Size = size
	p.Color = color
	p.Position = position
	p.Anchored = true
	p.Parent = workspace
	return p
end

-- 1. a platform that moves back and forth forever
local platform = makePart(Vector3.new(8, 1, 8), Color3.fromRGB(70, 130, 240), Vector3.new(-20, 4, -20))
TweenService:Create(platform,
	TweenInfo.new(3, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),   -- forever, back and forth
	{ Position = Vector3.new(-20, 4, 10) }):Play()

-- 2. cubes that pop in one after another
local cubes = {}
for i = 1, 10 do
	cubes[i] = makePart(Vector3.new(0.05, 0.05, 0.05), Color3.fromHSV(i / 10, 0.6, 1), Vector3.new(-8 + i * 2.5, 2, -35))
end
local popInfo = TweenInfo.new(0.4, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
task.spawn(function()
	while true do
		for i, cube in cubes do
			cube.Size = Vector3.new(0.05, 0.05, 0.05)
			task.delay((i - 1) * 0.08, function()
				TweenService:Create(cube, popInfo, { Size = Vector3.new(2, 2, 2) }):Play()
			end)
		end
		task.wait(3)
	end
end)

-- 3. a ball that squashes when it lands
local ball = makePart(Vector3.new(3, 3, 3), Color3.fromRGB(250, 160, 40), Vector3.new(15, 1.5, -20))
ball.Shape = Enum.PartType.Ball
RunService.Heartbeat:Connect(function()
	local phase = (os.clock() * 0.9) % 1
	local height = 8 * math.abs(math.sin(phase * math.pi))
	local squash = math.max(0, 1 - height / 1.2) * 0.35           -- only near the ground
	local sy = 1 - squash
	local sxz = 1 / math.sqrt(sy)                                 -- keep the volume
	ball.Size = Vector3.new(3 * sxz, 3 * sy, 3 * sxz)
	ball.Position = Vector3.new(15, 1.5 * sy + height, -20)
end)`},

color:{where:LS, title:'Rainbow dance floor', what:'A 12 × 12 floor ripples through the rainbow with Color3.fromHSV, and a health pillar fades green → yellow → red through a three-stop gradient. Client-side for smooth colour updates.', code:
`-- Rainbow floor (HSV) and a three-stop health gradient
local RunService = game:GetService("RunService")

local SIZE = 12
local ORIGIN = Vector3.new(30, 0.25, -30)
local tiles = {}
for x = 1, SIZE do
	for z = 1, SIZE do
		local tile = Instance.new("Part")
		tile.Size = Vector3.new(3.8, 0.5, 3.8)
		tile.Position = ORIGIN + Vector3.new(x * 4, 0, z * 4)
		tile.Anchored = true
		tile.Material = Enum.Material.Neon
		tile.Parent = workspace
		table.insert(tiles, { part = tile, x = x, z = z })
	end
end

local pillar = Instance.new("Part")
pillar.Size = Vector3.new(3, 10, 3)
pillar.Anchored = true
pillar.Position = ORIGIN + Vector3.new(-4, 5, 26)
pillar.Parent = workspace

local GRADIENT = {
	{ 0,   Color3.fromRGB(230, 50, 50) },
	{ 0.5, Color3.fromRGB(250, 210, 40) },
	{ 1,   Color3.fromRGB(40, 200, 90) },
}
local function evaluate(t)
	for i = 1, #GRADIENT - 1 do
		local a, b = GRADIENT[i], GRADIENT[i + 1]
		if t <= b[1] then
			return a[2]:Lerp(b[2], (t - a[1]) / (b[1] - a[1]))
		end
	end
	return GRADIENT[#GRADIENT][2]
end

RunService.RenderStepped:Connect(function()
	local t = os.clock()
	for _, tile in tiles do
		local hue = (t * 0.15 + (tile.x + tile.z) * 0.03) % 1
		tile.part.Color = Color3.fromHSV(hue, 0.75, 1)
	end
	local health = 0.5 + 0.5 * math.sin(t * 0.7)                  -- pretend health 0..1
	pillar.Size = Vector3.new(3, 1 + health * 9, 3)
	pillar.Position = ORIGIN + Vector3.new(-4, pillar.Size.Y / 2, 26)
	pillar.Color = evaluate(health)
end)`},

grid:{where:SS, title:'Flood-fill floor', what:'A 12 × 12 tile floor with random walls. Click any tile: a flood fill spreads outward from it, colouring each tile by how many steps away it is.', code:
`-- Click a tile to flood fill from it (breadth-first, coloured by distance)
local W, H, CELL = 12, 12, 4
local ORIGIN = Vector3.new(-30, 0.5, -60)
local rng = Random.new()

local tiles, walls = {}, {}
local generation = 0

local function key(x, z) return x .. "," .. z end

local function fillFrom(sx, sz)
	generation += 1
	local myGen = generation
	for _, tile in tiles do tile.Color = Color3.fromRGB(200, 200, 205) end
	local dist = { [key(sx, sz)] = 0 }
	local queue, head = { { sx, sz } }, 1
	while head <= #queue do
		if generation ~= myGen then return end                 -- a newer click took over
		local x, z = queue[head][1], queue[head][2]
		head += 1
		local d = dist[key(x, z)]
		tiles[key(x, z)].Color = Color3.fromHSV(0.1 + d * 0.035, 0.7, 1)
		for _, dir in { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } } do
			local nx, nz = x + dir[1], z + dir[2]
			local k = key(nx, nz)
			if tiles[k] and not walls[k] and dist[k] == nil then
				dist[k] = d + 1
				table.insert(queue, { nx, nz })
			end
		end
		task.wait(0.03)
	end
end

for x = 1, W do
	for z = 1, H do
		local isWall = rng:NextNumber() < 0.2
		local tile = Instance.new("Part")
		tile.Anchored = true
		tile.Size = isWall and Vector3.new(CELL - 0.2, 4, CELL - 0.2) or Vector3.new(CELL - 0.2, 1, CELL - 0.2)
		tile.Position = ORIGIN + Vector3.new(x * CELL, tile.Size.Y / 2, z * CELL)
		tile.Color = isWall and Color3.fromRGB(50, 50, 60) or Color3.fromRGB(200, 200, 205)
		tile.Parent = workspace
		if isWall then
			walls[key(x, z)] = true
		else
			tiles[key(x, z)] = tile
			local click = Instance.new("ClickDetector")
			click.Parent = tile
			click.MouseClick:Connect(function() fillFrom(x, z) end)
		end
	end
end`},

ui:{where:LS, title:'Health bar and objective arrow', what:'Builds a scaled health bar with a delayed damage trail, plus an arrow that sticks to the screen edge and points at an off-screen objective (WorldToViewportPoint).', code:
`-- Health bar with a damage trail + an edge arrow pointing at an objective
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local camera = workspace.CurrentCamera

local objective = Instance.new("Part")             -- something to point at
objective.Size = Vector3.new(4, 4, 4)
objective.Material = Enum.Material.Neon
objective.Color = Color3.fromRGB(250, 200, 40)
objective.Anchored = true
objective.Position = Vector3.new(120, 6, 120)
objective.Parent = workspace

local gui = Instance.new("ScreenGui")
gui.IgnoreGuiInset = true                          -- matches WorldToViewportPoint
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

local back = Instance.new("Frame")
back.AnchorPoint = Vector2.new(0.5, 1)
back.Position = UDim2.new(0.5, 0, 1, -30)
back.Size = UDim2.new(0.3, 0, 0, 18)
back.BackgroundColor3 = Color3.fromRGB(30, 30, 35)
back.Parent = gui
local trail = Instance.new("Frame")
trail.Size = UDim2.fromScale(1, 1)
trail.BackgroundColor3 = Color3.fromRGB(250, 230, 200)
trail.BorderSizePixel = 0
trail.Parent = back
local fill = trail:Clone()
fill.BackgroundColor3 = Color3.fromRGB(60, 200, 90)
fill.Parent = back

local arrow = Instance.new("TextLabel")
arrow.AnchorPoint = Vector2.new(0.5, 0.5)
arrow.Size = UDim2.fromOffset(44, 44)
arrow.BackgroundTransparency = 1
arrow.Text = utf8.char(0x27A4)                     -- a right-pointing arrow
arrow.TextScaled = true
arrow.TextColor3 = Color3.fromRGB(250, 200, 40)
arrow.Parent = gui

local function watch(character)
	local humanoid = character:WaitForChild("Humanoid")
	local function update()
		local f = math.clamp(humanoid.Health / humanoid.MaxHealth, 0, 1)
		fill.Size = UDim2.fromScale(f, 1)
		fill.BackgroundColor3 = Color3.fromRGB(230, 60, 60):Lerp(Color3.fromRGB(60, 200, 90), f)
		task.delay(0.4, function()
			TweenService:Create(trail, TweenInfo.new(0.5), { Size = UDim2.fromScale(f, 1) }):Play()
		end)
	end
	humanoid.HealthChanged:Connect(update)
	update()
end
player.CharacterAdded:Connect(watch)
if player.Character then watch(player.Character) end

RunService.RenderStepped:Connect(function()
	local pos, onScreen = camera:WorldToViewportPoint(objective.Position)
	arrow.Visible = not onScreen
	if onScreen then return end
	local centre = camera.ViewportSize / 2
	local d = Vector2.new(pos.X, pos.Y) - centre
	if pos.Z < 0 then d = -d end                    -- behind the camera: flip
	local half = centre - Vector2.new(50, 50)
	local scale = math.min(half.X / math.max(math.abs(d.X), 1e-3), half.Y / math.max(math.abs(d.Y), 1e-3))
	local edge = centre + d * math.min(1, scale)
	arrow.Position = UDim2.fromOffset(edge.X, edge.Y)
	arrow.Rotation = math.deg(math.atan2(d.Y, d.X))
end)
-- test the bar: in Studio's command bar (server), run
-- workspace.YourName.Humanoid:TakeDamage(25)`},

num:{where:SS, title:'Growing coins leaderboard', what:'Adds leaderstats with a fast-growing Coins value and a short "1.2M"-style display, a play-time timer formatted as mm:ss, and prints formatting examples to the Output.', code:
`-- Number formatting: abbreviations, commas and timers on the leaderboard
local Players = game:GetService("Players")

local SUFFIX = { "", "K", "M", "B", "T", "Qa", "Qi" }
local function abbreviate(n)
	if n < 1000 then return tostring(math.floor(n)) end
	local tier = math.floor(math.log10(n) / 3)
	local value = math.floor(n / 1000 ^ tier * 10) / 10        -- round down to 1 decimal
	if value >= 1000 then tier += 1; value /= 1000 end
	local text = string.format("%.1f", value):gsub("%.0$", "")
	return text .. (SUFFIX[tier + 1] or "e" .. tier * 3)
end

local function withCommas(n)
	local s = tostring(math.floor(n))
	return (s:reverse():gsub("(%d%d%d)", "%1,"):reverse():gsub("^,", ""))
end

local function formatTime(seconds)
	return string.format("%02d:%02d", seconds // 60, seconds % 60)
end

print(abbreviate(999950), abbreviate(1234567), withCommas(1234567), formatTime(754))

Players.PlayerAdded:Connect(function(player)
	local stats = Instance.new("Folder")
	stats.Name = "leaderstats"
	stats.Parent = player
	local coins = Instance.new("StringValue")
	coins.Name = "Coins"
	coins.Parent = stats
	local played = Instance.new("StringValue")
	played.Name = "Time"
	played.Parent = stats

	local amount, seconds = 10, 0
	while player.Parent do
		amount = amount * 1.35 + 10                              -- grows fast, like a simulator
		seconds += 1
		coins.Value = abbreviate(amount)
		played.Value = formatTime(seconds)
		task.wait(1)
	end
end)`},

geometry:{where:SS, title:'Odd-shaped safe zone', what:'Posts mark an irregular zone on the ground. Every 0.2 s the server checks each player with the point-in-polygon crossing test; posts glow green while anyone is inside.', code:
`-- An irregular zone: point-in-polygon on the X/Z plane
local Players = game:GetService("Players")

local ORIGIN = Vector3.new(40, 0, 0)
local ZONE = {                                       -- corners in order around the edge
	Vector2.new(-14, -10), Vector2.new(-2, -12), Vector2.new(4, -4), Vector2.new(14, -10),
	Vector2.new(12, 8), Vector2.new(0, 2), Vector2.new(-10, 10),
}

local posts = {}
for i, corner in ZONE do
	local nextCorner = ZONE[i % #ZONE + 1]
	local a = ORIGIN + Vector3.new(corner.X, 0, corner.Y)
	local b = ORIGIN + Vector3.new(nextCorner.X, 0, nextCorner.Y)
	local edge = Instance.new("Part")                 -- a low wall along each edge
	edge.Anchored = true
	edge.CanCollide = false
	edge.Size = Vector3.new(0.4, 0.6, (b - a).Magnitude)
	edge.CFrame = CFrame.lookAt((a + b) / 2 + Vector3.new(0, 0.3, 0), b + Vector3.new(0, 0.3, 0))
	edge.Material = Enum.Material.Neon
	edge.Parent = workspace
	table.insert(posts, edge)
end

local function isInside(point, polygon)
	local inside = false
	local j = #polygon
	for i = 1, #polygon do
		local a, b = polygon[i], polygon[j]
		if (a.Y > point.Y) ~= (b.Y > point.Y) then
			local crossX = a.X + (point.Y - a.Y) * (b.X - a.X) / (b.Y - a.Y)
			if point.X < crossX then inside = not inside end
		end
		j = i
	end
	return inside
end

local wasInside = {}
while true do
	local anyone = false
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local p = root.Position - ORIGIN
			local inside = isInside(Vector2.new(p.X, p.Z), ZONE)
			if inside ~= (wasInside[player] or false) then
				print(player.Name, inside and "entered the zone" or "left the zone")
				wasInside[player] = inside
			end
			anyone = anyone or inside
		end
	end
	for _, post in posts do
		post.Color = anyone and Color3.fromRGB(60, 220, 100) or Color3.fromRGB(230, 80, 80)
	end
	task.wait(0.2)
end`},

ik:{where:SS, title:'Robot arm that reaches for you', what:'A two-bone arm on a pedestal reaches for the nearest player (or an orbiting ball when nobody is near), solved with the law of cosines and a pole to choose the elbow side.', code:
`-- Two-bone IK: an arm that reaches toward the nearest player
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local L1, L2 = 6, 5
local SHOULDER = Vector3.new(-40, 8, -10)

local function makePart(size, color)
	local p = Instance.new("Part")
	p.Size = size
	p.Color = color
	p.Anchored = true
	p.CanCollide = false
	p.Parent = workspace
	return p
end

local pedestal = makePart(Vector3.new(3, 8, 3), Color3.fromRGB(80, 80, 90))
pedestal.Position = SHOULDER - Vector3.new(0, 4, 0)
local upper = makePart(Vector3.new(0.8, 0.8, L1), Color3.fromRGB(70, 130, 240))
local lower = makePart(Vector3.new(0.7, 0.7, L2), Color3.fromRGB(230, 100, 160))
local hand = makePart(Vector3.new(1.2, 1.2, 1.2), Color3.fromRGB(250, 180, 40))
hand.Shape = Enum.PartType.Ball

local function solve(shoulder, target, pole)
	local toTarget = target - shoulder
	local d = math.clamp(toTarget.Magnitude, math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01)
	local dir = toTarget.Unit
	local a = math.acos(math.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1))
	local toPole = pole - shoulder
	local bend = toPole - dir * toPole:Dot(dir)
	bend = bend.Magnitude > 1e-3 and bend.Unit or Vector3.yAxis
	local elbow = shoulder + dir * (math.cos(a) * L1) + bend * (math.sin(a) * L1)
	return elbow, shoulder + dir * d
end

local function nearestHead()
	local best, bestDist = nil, 30
	for _, player in Players:GetPlayers() do
		local head = player.Character and player.Character:FindFirstChild("Head")
		if head and (head.Position - SHOULDER).Magnitude < bestDist then
			best, bestDist = head, (head.Position - SHOULDER).Magnitude
		end
	end
	return best
end

RunService.Heartbeat:Connect(function()
	local head = nearestHead()
	local t = os.clock()
	local target = head and head.Position
		or SHOULDER + Vector3.new(math.cos(t) * 7, math.sin(t * 1.3) * 3, math.sin(t) * 7)
	local elbow, tip = solve(SHOULDER, target, SHOULDER + Vector3.new(0, 10, 0))   -- elbow points up
	upper.CFrame = CFrame.lookAt((SHOULDER + elbow) / 2, elbow)
	lower.CFrame = CFrame.lookAt((elbow + tip) / 2, tip)
	hand.Position = tip
end)`},

physics:{where:SS, title:'Swinging Verlet rope', what:'A 16-segment rope hangs from an anchor and swings in the wind, simulated with Verlet integration and distance constraints at a fixed time step, drawn with parts.', code:
`-- Verlet rope: points + distance constraints, fixed time step
local RunService = game:GetService("RunService")

local SEGMENTS, SEG_LENGTH, PASSES = 16, 1.2, 8
local ANCHOR = Vector3.new(-30, 25, 15)
local GRAVITY = Vector3.new(0, -60, 0)
local STEP = 1 / 60

local anchorPart = Instance.new("Part")
anchorPart.Size = Vector3.new(2, 2, 2)
anchorPart.Anchored = true
anchorPart.Position = ANCHOR
anchorPart.Parent = workspace

local points, previous, links = {}, {}, {}
for i = 0, SEGMENTS do
	local p = ANCHOR + Vector3.new(i * SEG_LENGTH, 0, 0)    -- start sideways so it swings
	points[i] = p
	previous[i] = p
end
for i = 1, SEGMENTS do
	local link = Instance.new("Part")
	link.Anchored = true
	link.CanCollide = false
	link.Color = Color3.fromRGB(150, 110, 70)
	link.Parent = workspace
	links[i] = link
end
local weight = Instance.new("Part")
weight.Shape = Enum.PartType.Ball
weight.Size = Vector3.new(2, 2, 2)
weight.Anchored = true
weight.CanCollide = false
weight.Color = Color3.fromRGB(80, 80, 90)
weight.Parent = workspace

local function simulate(t)
	local wind = Vector3.new(math.sin(t * 1.3) * 8, 0, math.cos(t * 0.9) * 10)
	for i = 1, SEGMENTS do
		local velocity = (points[i] - previous[i]) * 0.995
		previous[i] = points[i]
		points[i] += velocity + (GRAVITY + wind) * STEP * STEP
	end
	for _ = 1, PASSES do
		points[0] = ANCHOR
		for i = 0, SEGMENTS - 1 do
			local delta = points[i + 1] - points[i]
			local length = math.max(delta.Magnitude, 1e-4)
			local fix = delta * ((length - SEG_LENGTH) / length)
			if i == 0 then
				points[i + 1] -= fix                 -- the anchor doesn't move
			else
				points[i] += fix * 0.5
				points[i + 1] -= fix * 0.5
			end
		end
	end
end

local accumulator = 0
RunService.Heartbeat:Connect(function(dt)
	accumulator += math.min(dt, 0.1)
	while accumulator >= STEP do
		accumulator -= STEP
		simulate(os.clock())
	end
	for i = 1, SEGMENTS do
		local a, b = points[i - 1], points[i]
		links[i].Size = Vector3.new(0.3, 0.3, (b - a).Magnitude)
		links[i].CFrame = CFrame.lookAt((a + b) / 2, b)
	end
	weight.Position = points[SEGMENTS]
end)`},

proc:{where:SS, title:'Island generator', what:'Builds a 40 × 40 island out of parts: layered math.noise (fBm) multiplied by a round falloff mask, then coloured as water, sand, grass, rock and snow by height. Change SEED for a new island.', code:
`-- Procedural island: fBm noise × falloff mask, coloured by height
local SIZE, CELL, HEIGHT = 40, 4, 40
local SEED = 7
local ORIGIN = Vector3.new(-80, 0, -240)

local function fbm(x, z)
	local amplitude, frequency, total, norm = 1, 1, 0, 0
	for octave = 1, 5 do
		total += amplitude * math.noise(x * frequency, z * frequency, SEED + octave * 17.3)
		norm += amplitude
		amplitude *= 0.5
		frequency *= 2
	end
	return total / norm                                     -- about -0.5..0.5
end

local function colorFor(h)
	if h < 0.32 then return Color3.fromRGB(47, 111, 214), Enum.Material.Glass
	elseif h < 0.37 then return Color3.fromRGB(228, 209, 154), Enum.Material.Sand
	elseif h < 0.62 then return Color3.fromRGB(95, 174, 79), Enum.Material.Grass
	elseif h < 0.8 then return Color3.fromRGB(130, 130, 130), Enum.Material.Rock
	end
	return Color3.fromRGB(242, 242, 242), Enum.Material.Snow
end

local folder = Instance.new("Folder")
folder.Name = "Island"
folder.Parent = workspace

for x = 1, SIZE do
	for z = 1, SIZE do
		local nx, nz = (x - SIZE / 2) / (SIZE / 2), (z - SIZE / 2) / (SIZE / 2)   -- -1..1
		local mask = math.clamp(1 - math.sqrt(nx * nx + nz * nz) ^ 2, 0, 1)
		local h = math.clamp((0.5 + fbm(x * 0.06, z * 0.06) * 1.4) * mask, 0, 1)
		local isWater = h < 0.32
		local height = isWater and 0.32 * HEIGHT or h * HEIGHT
		local color, material = colorFor(h)
		local block = Instance.new("Part")
		block.Anchored = true
		block.Size = Vector3.new(CELL, math.max(height, 1), CELL)
		block.Position = ORIGIN + Vector3.new(x * CELL, block.Size.Y / 2, z * CELL)
		block.Color = color
		block.Material = material
		block.Transparency = isWater and 0.3 or 0
		block.Parent = folder
	end
	task.wait()                                              -- spread the work over frames
end`},

path:{where:SS, title:'A* maze runner', what:'Generates a 20 × 20 maze of walls, then a ball repeatedly runs A* from where it is to the cell under the nearest player (or a random cell) and rolls along the path.', code:
`-- A* on a grid: a ball that finds its way to the nearest player
local Players = game:GetService("Players")

local W, H, CELL = 20, 20, 4
local ORIGIN = Vector3.new(60, 0, -80)
local rng = Random.new()

local walls = {}
local function key(x, z) return x * 1000 + z end
local function toWorld(x, z) return ORIGIN + Vector3.new(x * CELL, 1, z * CELL) end
local function toCell(pos)
	local p = (pos - ORIGIN) / CELL
	return math.clamp(math.round(p.X), 1, W), math.clamp(math.round(p.Z), 1, H)
end

for x = 1, W do
	for z = 1, H do
		if rng:NextNumber() < 0.25 and not (x <= 2 and z <= 2) then
			walls[key(x, z)] = true
			local wall = Instance.new("Part")
			wall.Anchored = true
			wall.Size = Vector3.new(CELL, 5, CELL)
			wall.Position = ORIGIN + Vector3.new(x * CELL, 2.5, z * CELL)
			wall.Color = Color3.fromRGB(60, 60, 70)
			wall.Parent = workspace
		end
	end
end

local function astar(sx, sz, gx, gz)
	local open, cost, came = { { sx, sz } }, { [key(sx, sz)] = 0 }, {}
	local function h(x, z) return math.abs(x - gx) + math.abs(z - gz) end
	while #open > 0 do
		local bestI = 1                                     -- small grid: a list is fine
		for i = 2, #open do
			local a, b = open[i], open[bestI]
			if cost[key(a[1], a[2])] + h(a[1], a[2]) < cost[key(b[1], b[2])] + h(b[1], b[2]) then bestI = i end
		end
		local cur = table.remove(open, bestI)
		local cx, cz = cur[1], cur[2]
		if cx == gx and cz == gz then
			local path, k = {}, key(cx, cz)
			while k do
				table.insert(path, 1, Vector2.new(k // 1000, k % 1000))
				k = came[k]
			end
			return path
		end
		for _, d in { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } } do
			local nx, nz = cx + d[1], cz + d[2]
			local nk = key(nx, nz)
			if nx >= 1 and nx <= W and nz >= 1 and nz <= H and not walls[nk] then
				local newCost = cost[key(cx, cz)] + 1
				if cost[nk] == nil or newCost < cost[nk] then
					cost[nk] = newCost
					came[nk] = key(cx, cz)
					table.insert(open, { nx, nz })
				end
			end
		end
	end
	return nil
end

local runner = Instance.new("Part")
runner.Shape = Enum.PartType.Ball
runner.Size = Vector3.new(2.5, 2.5, 2.5)
runner.Material = Enum.Material.Neon
runner.Color = Color3.fromRGB(250, 160, 40)
runner.Anchored = true
runner.CanCollide = false
runner.Position = toWorld(1, 1)
runner.Parent = workspace

while true do
	local sx, sz = toCell(runner.Position)
	local gx, gz = rng:NextInteger(1, W), rng:NextInteger(1, H)
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then gx, gz = toCell(root.Position) end
	end
	local path = not walls[key(gx, gz)] and astar(sx, sz, gx, gz)
	if path then
		for _, cell in path do
			runner.Position = toWorld(cell.X, cell.Y)
			task.wait(0.12)
		end
	end
	task.wait(0.5)
end`},

matrix:{where:SS, title:'Robot arm and its mirror twin', what:'A three-joint arm animates with forward kinematics (parent × rotation × offset down the chain). A twin across a mirror plane copies it by reflecting positions and axes.', code:
`-- Forward kinematics, plus a mirrored copy across the plane X = MIRROR_X
local RunService = game:GetService("RunService")

local LENGTHS = { 4, 3.5, 2.5 }
local BASE = CFrame.new(-55, 1, 20)
local MIRROR_X = -48

local function makePart(size, color)
	local p = Instance.new("Part")
	p.Size = size
	p.Color = color
	p.Anchored = true
	p.CanCollide = false
	p.Parent = workspace
	return p
end

local colors = { Color3.fromRGB(70, 130, 240), Color3.fromRGB(230, 100, 160), Color3.fromRGB(250, 180, 40) }
local arm, twin = {}, {}
for i, len in LENGTHS do
	arm[i] = makePart(Vector3.new(0.9, len, 0.9), colors[i])
	twin[i] = makePart(Vector3.new(0.9, len, 0.9), colors[i])
	twin[i].Transparency = 0.4
end

local mirror = makePart(Vector3.new(0.2, 12, 16), Color3.fromRGB(150, 200, 255))
mirror.Transparency = 0.7
mirror.Position = Vector3.new(MIRROR_X, 6, 20)

local function reflect(v) return Vector3.new(-v.X, v.Y, v.Z) end      -- across a plane facing X
local function mirrored(cf)
	local p = cf.Position
	local pos = Vector3.new(2 * MIRROR_X - p.X, p.Y, p.Z)
	return CFrame.lookAt(pos, pos + reflect(cf.LookVector), reflect(cf.UpVector))
end

RunService.Heartbeat:Connect(function()
	local t = os.clock()
	local angles = { math.sin(t * 0.8) * 0.8, math.sin(t * 1.1) * 1.2 - 0.6, math.sin(t * 1.7) * 0.9 }
	local cf = BASE * CFrame.Angles(0, t * 0.3, 0)
	for i, len in LENGTHS do
		cf = cf * CFrame.Angles(0, 0, angles[i])             -- bend at this joint
		local segment = cf * CFrame.new(0, len / 2, 0)        -- the bone sits halfway along
		arm[i].CFrame = segment
		twin[i].CFrame = mirrored(segment)
		cf = cf * CFrame.new(0, len, 0)                       -- walk to the next joint
	end
end)`},

calc:{where:SS, title:'Balls rolling downhill', what:'Generates bumpy terrain from math.noise, then drops balls that follow gradient descent: they measure the slope numerically and step downhill until they settle in a valley, then respawn.', code:
`-- Gradient descent: balls find valleys on a noise terrain
local SIZE, CELL = 30, 3
local ORIGIN = Vector3.new(-45, 0, 60)
local RATE, BALLS = 2.5, 6
local rng = Random.new()

local function height(x, z)                                -- x, z in studs from ORIGIN
	return 6 + 5 * math.noise(x * 0.04 + 0.3, z * 0.04 + 0.7, 3) + 0.004 * ((x - 45) ^ 2 + (z - 45) ^ 2)
end

for i = 1, SIZE do
	for j = 1, SIZE do
		local x, z = i * CELL, j * CELL
		local h = height(x, z)
		local block = Instance.new("Part")
		block.Anchored = true
		block.Size = Vector3.new(CELL, h, CELL)
		block.Position = ORIGIN + Vector3.new(x, h / 2, z)
		block.Color = Color3.fromRGB(70, 150, 90):Lerp(Color3.fromRGB(240, 230, 200), math.clamp((h - 3) / 12, 0, 1))
		block.Parent = workspace
	end
	task.wait()
end

local function gradient(x, z)
	local e = 0.05
	return (height(x + e, z) - height(x - e, z)) / (2 * e),
	       (height(x, z + e) - height(x, z - e)) / (2 * e)
end

for _ = 1, BALLS do
	task.spawn(function()
		local ball = Instance.new("Part")
		ball.Shape = Enum.PartType.Ball
		ball.Size = Vector3.new(2, 2, 2)
		ball.Material = Enum.Material.Neon
		ball.Color = Color3.fromHSV(rng:NextNumber(), 0.7, 1)
		ball.Anchored = true
		ball.CanCollide = false
		ball.Parent = workspace
		while true do
			local x, z = rng:NextNumber(CELL, SIZE * CELL), rng:NextNumber(CELL, SIZE * CELL)
			for _ = 1, 120 do
				local gx, gz = gradient(x, z)
				if math.sqrt(gx * gx + gz * gz) < 0.01 then break end   -- flat: settled
				x = math.clamp(x - RATE * gx, CELL, SIZE * CELL)
				z = math.clamp(z - RATE * gz, CELL, SIZE * CELL)
				ball.Position = ORIGIN + Vector3.new(x, height(x, z) + 1, z)
				task.wait(0.05)
			end
			task.wait(1)
		end
	end)
end`},

spatial:{where:LS, title:'Spatial hash fireflies', what:'Three hundred fireflies wander around you; a spatial hash grid finds the ones within 15 studs each frame (checking only nearby cells) and lights them up. Client-side.', code:
`-- Spatial hash: only check the grid cells near the player
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local COUNT, AREA, CELL, RADIUS = 300, 120, 10, 15
local player = Players.LocalPlayer
local rng = Random.new()

local flies = {}
for i = 1, COUNT do
	local p = Instance.new("Part")
	p.Shape = Enum.PartType.Ball
	p.Size = Vector3.new(0.8, 0.8, 0.8)
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.Material = Enum.Material.Neon
	p.Parent = workspace
	flies[i] = { part = p, home = Vector3.new(rng:NextNumber(-AREA, AREA) / 2, rng:NextNumber(2, 8), rng:NextNumber(-AREA, AREA) / 2), seed = rng:NextNumber(0, 100) }
end

local function cellKey(x, z) return math.floor(x / CELL) .. "," .. math.floor(z / CELL) end
local DIM = Color3.fromRGB(70, 70, 80)
local LIT = Color3.fromRGB(255, 220, 90)

RunService.RenderStepped:Connect(function()
	local t = os.clock()
	local buckets = {}
	for _, fly in flies do                                -- move, then bucket by cell
		local s = fly.seed
		local pos = fly.home + Vector3.new(math.noise(s, t * 0.2) * 12, math.noise(s, t * 0.3, 1) * 2, math.noise(s, t * 0.2, 2) * 12)
		fly.part.Position = pos
		fly.part.Color = DIM
		local k = cellKey(pos.X, pos.Z)
		buckets[k] = buckets[k] or {}
		table.insert(buckets[k], fly)
	end

	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
	if not root then return end
	local c = root.Position
	for cx = math.floor((c.X - RADIUS) / CELL), math.floor((c.X + RADIUS) / CELL) do
		for cz = math.floor((c.Z - RADIUS) / CELL), math.floor((c.Z + RADIUS) / CELL) do
			for _, fly in buckets[cx .. "," .. cz] or {} do
				if (fly.part.Position - c).Magnitude <= RADIUS then
					fly.part.Color = LIT
				end
			end
		end
	end
end)`},

signal:{where:LS, title:'Camera shake and a smooth FPS meter', what:'Press E to add camera trauma (shake = trauma² × noise, decaying over time). A small FPS label is smoothed with exponential smoothing and turns red with hysteresis thresholds.', code:
`-- Trauma-based camera shake (press E) + a smoothed FPS label with hysteresis
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local camera = workspace.CurrentCamera

local trauma = 0
local MAX_OFFSET, MAX_ROLL, DECAY = 1.2, math.rad(4), 1.2

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if not gameProcessed and input.KeyCode == Enum.KeyCode.E then
		trauma = math.min(1, trauma + 0.5)
	end
end)

RunService:BindToRenderStep("TraumaShake", Enum.RenderPriority.Camera.Value + 1, function(dt)
	trauma = math.max(0, trauma - DECAY * dt)
	if trauma <= 0 then return end
	local shake = trauma * trauma
	local t = os.clock() * 15
	local offset = Vector3.new(math.noise(t, 1.3), math.noise(t, 7.1), 0) * 2 * MAX_OFFSET * shake
	local roll = math.noise(t, 3.3) * 2 * MAX_ROLL * shake
	camera.CFrame = camera.CFrame * CFrame.new(offset) * CFrame.Angles(0, 0, roll)
end)

-- FPS meter
local gui = Instance.new("ScreenGui")
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")
local label = Instance.new("TextLabel")
label.Size = UDim2.fromOffset(140, 32)
label.Position = UDim2.new(1, -150, 0, 10)
label.BackgroundTransparency = 0.3
label.BackgroundColor3 = Color3.fromRGB(20, 20, 25)
label.TextColor3 = Color3.new(1, 1, 1)
label.TextScaled = true
label.Parent = gui

local smoothed, low = 60, false
local LOW_ENTER, LOW_LEAVE = 40, 50                         -- two thresholds: no flicker
RunService.RenderStepped:Connect(function(dt)
	local alpha = 1 - math.exp(-dt / 0.3)                   -- about 0.3 s reaction time
	smoothed += (1 / dt - smoothed) * alpha
	if not low and smoothed < LOW_ENTER then low = true
	elseif low and smoothed > LOW_LEAVE then low = false end
	label.Text = string.format("%d FPS", math.floor(smoothed + 0.5))
	label.TextColor3 = low and Color3.fromRGB(255, 90, 90) or Color3.new(1, 1, 1)
end)`},
};
})();
