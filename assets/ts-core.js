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

-- ===== helpers (the same in every Math Lab script) =====

-- Everything is built 30 studs in front of spawn, inside one folder.
local ORIGIN = Vector3.new(0, 0, -30)
local demo = Instance.new("Folder")
demo.Name = "MathLabDemo"
demo.Parent = workspace

-- Makes an anchored part. "properties" is an optional table of extra settings.
local function makePart(size, position, color, properties)
	local part = Instance.new("Part")
	part.Size = size
	part.Position = position
	part.Color = color or Color3.fromRGB(163, 162, 165)
	part.Anchored = true
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	for name, value in properties or {} do
		part[name] = value
	end
	part.Parent = demo
	return part
end

-- Floating text above a part. Returns the TextLabel so you can change its Text.
local function makeLabel(part, text)
	local billboard = Instance.new("BillboardGui")
	billboard.Size = UDim2.fromOffset(300, 40)
	billboard.StudsOffset = Vector3.new(0, part.Size.Y / 2 + 2, 0)
	billboard.AlwaysOnTop = true
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.TextScaled = true
	label.TextColor3 = Color3.new(1, 1, 1)
	label.TextStrokeTransparency = 0.4
	label.Text = text or ""
	label.Parent = billboard
	billboard.Parent = part
	return label
end

-- A thin glowing part used to draw lines.
local function makeLinePart(color)
	return makePart(Vector3.new(0.2, 0.2, 1), ORIGIN, color or Color3.fromRGB(226, 133, 26), {
		Material = Enum.Material.Neon,
		CanCollide = false,
		CanQuery = false,
	})
end

-- Stretches a line part so it runs from one point to another.
local function drawLine(linePart, fromPoint, toPoint)
	local length = math.max((toPoint - fromPoint).Magnitude, 0.05)
	linePart.Size = Vector3.new(0.2, 0.2, length)
	linePart.CFrame = CFrame.lookAt((fromPoint + toPoint) / 2, toPoint)
end
`;
const SERVER = COMMON + `
-- The HumanoidRootPart of the closest player, or nil if nobody is near enough.
local function nearestPlayerRoot(fromPosition, maxDistance)
	local closestRoot = nil
	local closestDistance = maxDistance or math.huge
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local distance = (root.Position - fromPosition).Magnitude
			if distance < closestDistance then
				closestRoot = root
				closestDistance = distance
			end
		end
	end
	return closestRoot
end
`;
const CLIENT = COMMON + `
local player = Players.LocalPlayer
local camera = workspace.CurrentCamera

-- Your own HumanoidRootPart (nil while you are respawning).
local function getMyRootPart()
	local character = player.Character
	return character and character:FindFirstChild("HumanoidRootPart")
end
`;
// Splits a sentence into "-- " comment lines of at most 90 characters.
const wrapComment = text=>{
  const lines = []; let line = '';
  for (const word of text.split(' ')){
    if (line && (line + ' ' + word).length > 90){ lines.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines.map(l=>'-- ' + l).join('\n');
};
Lab.tsScript = (id, title)=>{
  const e = Lab.TS[id]; if (!e) return null;
  const [kind, what, body] = e, isL = kind === 'L';
  const head = `-- Roblox Math Lab: ${title}\n-- ${isL ? 'LocalScript in StarterPlayer > StarterPlayerScripts' : 'Script in ServerScriptService'}. Press Play to try it.\n--\n${wrapComment(what)}\n\n`;
  return {kind: isL ? 'LocalScript' : 'Script', where: isL ? 'StarterPlayer › StarterPlayerScripts' : 'ServerScriptService', what,
    code: head + (isL ? CLIENT : SERVER) + '\n-- ===== the part this topic is about =====\n\n' + body.trim() + '\n'};
};
Lab.TS_HEADERS = {SERVER, CLIENT};
})();
