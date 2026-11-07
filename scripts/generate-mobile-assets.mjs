import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = 9249;

const svgContent = fs.readFileSync('icon.svg', 'utf8');
const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent, 'utf8').toString('base64')}`;

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${debugPort}`,
  'about:blank'
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1800);

try {
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  const pageTarget = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Runtime.enable');

  // Render the master vector PESO Mint Stamp SVG at any target size or shape
  const renderIconBase64 = async (size, mode = 'square') => {
    const res = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const img = new Image();
        img.src = ${JSON.stringify(svgDataUrl)};
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        canvas.width = ${size};
        canvas.height = ${size};
        const ctx = canvas.getContext('2d');

        if (${JSON.stringify(mode)} === 'round') {
          ctx.beginPath();
          ctx.arc(${size} / 2, ${size} / 2, ${size} / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.fillStyle = '#111215';
          ctx.fillRect(0, 0, ${size}, ${size});
          const pad = Math.round(${size} * 0.06);
          ctx.drawImage(img, pad, pad, ${size} - pad * 2, ${size} - pad * 2);
        } else if (${JSON.stringify(mode)} === 'foreground') {
          // Android Adaptive Icon Foreground (108dp viewport with 66dp safe zone)
          const pad = Math.round(${size} * 0.18);
          ctx.drawImage(img, pad, pad, ${size} - pad * 2, ${size} - pad * 2);
        } else {
          ctx.fillStyle = '#111215';
          ctx.fillRect(0, 0, ${size}, ${size});
          ctx.drawImage(img, 0, 0, ${size}, ${size});
        }

        return canvas.toDataURL('image/png').split(',')[1];
      })()`
    });
    return res.result.result.value;
  };

  // Render thematic Warm Ledger Paper splash screen with centered PESO Mint Stamp
  const renderSplashBase64 = async (width, height) => {
    const res = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const img = new Image();
        img.src = ${JSON.stringify(svgDataUrl)};
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        canvas.width = ${width};
        canvas.height = ${height};
        const ctx = canvas.getContext('2d');

        // Warm Ledger Paper Background (#F6F5F0)
        ctx.fillStyle = '#F6F5F0';
        ctx.fillRect(0, 0, ${width}, ${height});

        // Subtle Architectural Grid Lines
        ctx.strokeStyle = '#E6E3D8';
        ctx.lineWidth = 1;
        const step = Math.round(Math.min(${width}, ${height}) * 0.08);
        for (let x = step; x < ${width}; x += step) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ${height}); ctx.stroke();
        }
        for (let y = step; y < ${height}; y += step) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(${width}, y); ctx.stroke();
        }

        const iconSize = Math.round(Math.min(${width}, ${height}) * 0.28);
        const ix = Math.round((${width} - iconSize) / 2);
        const iy = Math.round((${height} - iconSize) / 2);
        ctx.drawImage(img, ix, iy, iconSize, iconSize);

        return canvas.toDataURL('image/png').split(',')[1];
      })()`
    });
    return res.result.result.value;
  };

  const icon1024B64 = await renderIconBase64(1024, 'square');
  const icon192B64 = await renderIconBase64(192, 'square');

  fs.mkdirSync('public', { recursive: true });
  fs.mkdirSync('dist', { recursive: true });
  fs.mkdirSync('releases', { recursive: true });

  for (const dir of ['.', 'public', 'dist']) {
    fs.writeFileSync(path.join(dir, 'icon-1024.png'), Buffer.from(icon1024B64, 'base64'));
    fs.writeFileSync(path.join(dir, 'icon-192.png'), Buffer.from(icon192B64, 'base64'));
  }

  // Update Android native launcher icons & splash screens if android/ exists
  const androidResDir = path.join('android', 'app', 'src', 'main', 'res');
  if (fs.existsSync(androidResDir)) {
    const mipmapSpecs = [
      { folder: 'mipmap-mdpi', launcher: 48, foreground: 108 },
      { folder: 'mipmap-hdpi', launcher: 72, foreground: 162 },
      { folder: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
      { folder: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
      { folder: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 }
    ];

    for (const spec of mipmapSpecs) {
      const targetFolder = path.join(androidResDir, spec.folder);
      if (fs.existsSync(targetFolder)) {
        const sqB64 = await renderIconBase64(spec.launcher, 'square');
        const rdB64 = await renderIconBase64(spec.launcher, 'round');
        const fgB64 = await renderIconBase64(spec.foreground, 'foreground');
        fs.writeFileSync(path.join(targetFolder, 'ic_launcher.png'), Buffer.from(sqB64, 'base64'));
        fs.writeFileSync(path.join(targetFolder, 'ic_launcher_round.png'), Buffer.from(rdB64, 'base64'));
        fs.writeFileSync(path.join(targetFolder, 'ic_launcher_foreground.png'), Buffer.from(fgB64, 'base64'));
      }
    }

    const splashB64 = await renderSplashBase64(1080, 1920);
    const mainSplashPath = path.join(androidResDir, 'drawable', 'splash.png');
    if (fs.existsSync(path.dirname(mainSplashPath))) {
      fs.writeFileSync(mainSplashPath, Buffer.from(splashB64, 'base64'));
    }
  }

  // Generate Native iOS Configuration Profile (.mobileconfig) that installs PESO
  // directly onto iPhone Home Screen via iOS Settings -> Profile Downloaded -> Install
  const mobileconfigXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <true/>
      <key>IgnoreManifestScope</key>
      <true/>
      <key>Icon</key>
      <data>${icon192B64}</data>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>PESO</string>
      <key>PayloadDescription</key>
      <string>Installs the PESO Student Cash &amp; Allowance App on your iOS Home Screen in full-screen native mode.</string>
      <key>PayloadDisplayName</key>
      <string>PESO Student Cash App</string>
      <key>PayloadIdentifier</key>
      <string>com.peso.studentledger.webclip</string>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key>
      <string>8A7E5C90-4B2D-4F1E-9C3A-1D2E3F4A5B6C</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>Precomposed</key>
      <true/>
      <key>URL</key>
      <string>https://noobmasterrr690-lang.github.io/peso-revamped/</string>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Official iOS Direct Installer for PESO (Pocket Expense &amp; Savings Organizer). Installs PESO as a full-screen iOS app without requiring an Apple Developer provisioning profile.</string>
  <key>PayloadDisplayName</key>
  <string>PESO — Student Cash App (iOS Installer)</string>
  <key>PayloadIdentifier</key>
  <string>com.peso.studentledger.profile</string>
  <key>PayloadOrganization</key>
  <string>PESO Student Ledger</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>1F2E3D4C-5B6A-4789-8A9B-0C1D2E3F4A5B</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;

  fs.writeFileSync('releases/PESO-iOS-Installer.mobileconfig', mobileconfigXml, 'utf8');
  fs.writeFileSync('public/PESO-iOS-Installer.mobileconfig', mobileconfigXml, 'utf8');
  fs.writeFileSync('PESO-iOS-Installer.mobileconfig', mobileconfigXml, 'utf8');
  console.log('Generated PESO Mint Stamp icons (1024, 192, Android mipmaps, and iOS .mobileconfig)');
  ws.close();
} finally {
  chrome.kill();
}
