/* Per-topic "Try in Studio" scripts. Each topic file adds entries:
   Lab.TS[id] = [kind, what, body]  with kind 'S' (server Script) or 'L' (LocalScript).
   The full script shown to the user = header for that kind + body. */
(function(){
"use strict";
Lab.TS = {};
Lab.ts = obj=>Object.assign(Lab.TS, obj);

const COMMON = `local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local ORIGIN = Vector3.new(0, 0, -30)                 -- demos are built 30 studs in front of spawn
local demo = Instance.new("Folder")
demo.Name = "MathLabDemo"
demo.Parent = workspace

local function makePart(size, position, color, props)
	local p = Instance.new("Part")
	p.Size = size
	p.Position = position
	p.Color = color or Color3.fromRGB(163, 162, 165)
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for key, value in props or {} do
		p[key] = value
	end
	p.Parent = demo
	return p
end

local function makeLabel(part, text)                  -- floating text above a part
	local gui = Instance.new("BillboardGui")
	gui.Size = UDim2.fromOffset(300, 40)
	gui.StudsOffset = Vector3.new(0, part.Size.Y / 2 + 2, 0)
	gui.AlwaysOnTop = true
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.TextScaled = true
	label.TextColor3 = Color3.new(1, 1, 1)
	label.TextStrokeTransparency = 0.4
	label.Text = text or ""
	label.Parent = gui
	gui.Parent = part
	return label
end

local function drawLine(beam, a, b)                   -- stretch a thin part from a to b
	beam.Size = Vector3.new(0.2, 0.2, math.max((b - a).Magnitude, 0.05))
	beam.CFrame = CFrame.lookAt((a + b) / 2, b)
end

local function makeBeam(color)
	return makePart(Vector3.new(0.2, 0.2, 1), ORIGIN, color or Color3.fromRGB(226, 133, 26),
		{ Material = Enum.Material.Neon, CanCollide = false, CanQuery = false })
end
`;
const SERVER = COMMON + `
local function nearestRoot(from, maxDistance)        -- the closest player's HumanoidRootPart
	local best, bestDist = nil, maxDistance or math.huge
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local d = (root.Position - from).Magnitude
			if d < bestDist then
				best, bestDist = root, d
			end
		end
	end
	return best
end
`;
const CLIENT = COMMON + `
local player = Players.LocalPlayer
local camera = workspace.CurrentCamera
local function myRoot()
	local character = player.Character
	return character and character:FindFirstChild("HumanoidRootPart")
end
`;
Lab.tsScript = (id, title)=>{
  const e = Lab.TS[id]; if (!e) return null;
  const [kind, what, body] = e, isL = kind === 'L';
  const head = `-- Roblox Math Lab: ${title}\n-- ${isL ? 'LocalScript in StarterPlayer > StarterPlayerScripts' : 'Script in ServerScriptService'}. Press Play to try it.\n-- ${what}\n\n`;
  return {kind: isL ? 'LocalScript' : 'Script', where: isL ? 'StarterPlayer › StarterPlayerScripts' : 'ServerScriptService', what,
    code: head + (isL ? CLIENT : SERVER) + '\n-- ===== the part this topic is about =====\n' + body.trim() + '\n'};
};
Lab.TS_HEADERS = {SERVER, CLIENT};
})();
