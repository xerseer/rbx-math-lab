/* Per-topic "Try in Studio" scripts, written in the user's code style.
   Each topic file adds entries: Lab.TS[id] = {k, what, services, variables, functions, setup, runtime}
   with k 'S' (server Script) or 'L' (LocalScript). Lab.tsScript assembles the full script and
   adds only the helpers, services and setup lines that the topic code actually uses. */
(function(){
"use strict";
Lab.TS = {};
Lab.ts = obj=>Object.assign(Lab.TS, obj);

const FRAME = '-'.repeat(86);
const SERVICE_ORDER = ['Players', 'RunService', 'TweenService', 'UserInputService'];
const camel = s=>s[0].toLowerCase() + s.slice(1);

// Helpers in the order they appear; needs = other names they rely on.
const HELPERS = [
  ['MakePart', ['demoFolder'], `local function MakePart(size: Vector3, position: Vector3, color: Color3?, properties: {[string]: any}?): Part
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

	part.Parent = demoFolder
	return part
end`],
  ['MakeLabel', [], `local function MakeLabel(part: BasePart, text: string?): TextLabel
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
end`],
  ['MakeLinePart', ['MakePart', 'ORIGIN'], `local function MakeLinePart(color: Color3?): Part
	return MakePart(Vector3.new(0.2, 0.2, 1), ORIGIN, color or Color3.fromRGB(226, 133, 26), {
		Material = Enum.Material.Neon,
		CanCollide = false,
		CanQuery = false,
	})
end`],
  ['DrawLine', [], `local function DrawLine(linePart: BasePart, fromPoint: Vector3, toPoint: Vector3)
	local length = math.max((toPoint - fromPoint).Magnitude, 0.05)
	linePart.Size = Vector3.new(0.2, 0.2, length)
	linePart.CFrame = CFrame.lookAt((fromPoint + toPoint) / 2, toPoint)
end`],
  ['GetNearestRoot', ['players'], `local function GetNearestRoot(fromPosition: Vector3, maxDistance: number?): BasePart?
	local closestRoot = nil
	local closestDistance = maxDistance or math.huge

	for _, player in players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if not root then continue end

		local distance = (root.Position - fromPosition).Magnitude
		if distance < closestDistance then
			closestRoot = root
			closestDistance = distance
		end
	end

	return closestRoot
end`],
  ['GetMyRootPart', ['player'], `local function GetMyRootPart(): BasePart?
	local character = player.Character
	return character and character:FindFirstChild("HumanoidRootPart")
end`],
];

// Splits a sentence into "-- " comment lines of at most 86 characters.
const wrapComment = text=>{
  const lines = []; let line = '';
  for (const word of text.split(' ')){
    if (line && (line + ' ' + word).length > 83){ lines.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines.map(l=>'-- ' + l).join('\n');
};
const uses = (code, name)=>new RegExp('(^|[^.:\\w])' + name + '\\b').test(code);

Lab.tsScript = (id, title)=>{
  const e = Lab.TS[id]; if (!e) return null;
  const isL = e.k === 'L';
  const topic = [e.functions, e.setup, e.runtime].join('\n');

  // pick helpers (and what they need), working backwards so dependencies are found
  const picked = new Set();
  let needText = topic + '\n' + e.variables;
  for (let pass = 0; pass < 2; pass++)
    for (const [name, needs] of HELPERS) if (uses(needText, name) && !picked.has(name)){ picked.add(name); needText += '\n' + needs.join(' '); }
  const helperText = HELPERS.filter(([n])=>picked.has(n)).map(h=>h[2]);
  const allCode = needText + '\n' + helperText.join('\n');

  const usePlayer = isL && uses(allCode, 'player');
  const useCamera = isL && uses(allCode, 'camera');
  const services = SERVICE_ORDER.filter(s=>uses(allCode, camel(s)) || (s === 'Players' && usePlayer) || e.services.includes(s));
  const useOrigin = uses(allCode, 'ORIGIN');
  const useFolder = uses(allCode, 'demoFolder');

  const out = [FRAME,
    `-- Roblox Math Lab: ${title}`,
    `-- ${isL ? 'LocalScript in StarterPlayer > StarterPlayerScripts' : 'Script in ServerScriptService'}. Press Play to try it.`,
    '--', wrapComment(e.what), FRAME, ''];
  const section = (name, body)=>{ if (body && body.trim()) out.push(`--<< ${name} >>--`, '', body.trim(), ''); };

  section('SERVICES', services.map(s=>`local ${camel(s)} = game:GetService("${s}")`).join('\n'));
  section('VARIABLES', e.variables);
  out.push(FRAME, '');
  const basics = [];
  if (useOrigin) basics.push('local ORIGIN = Vector3.new(0, 0, -30) -- everything is built 30 studs in front of spawn');
  if (usePlayer) basics.push('local player = players.LocalPlayer');
  if (useCamera) basics.push('local camera = workspace.CurrentCamera');
  if (basics.length) out.push(basics.join('\n'), '');
  if (useFolder) out.push('local demoFolder = Instance.new("Folder")\ndemoFolder.Name = "MathLabDemo"\ndemoFolder.Parent = workspace', '');
  section('LOCAL FUNCTIONS', helperText.concat(e.functions ? [e.functions] : []).join('\n\n'));
  section('SETUP', e.setup);
  section('RUNTIME', e.runtime);
  out.push(FRAME);

  return {kind: isL ? 'LocalScript' : 'Script', where: isL ? 'StarterPlayer › StarterPlayerScripts' : 'ServerScriptService', what: e.what,
    code: out.join('\n') + '\n'};
};
})();
