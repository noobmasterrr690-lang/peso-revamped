import { spawn } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = 9249;

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

  const renderIconBase64 = async (size) => {
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const canvas = document.createElement('canvas');
        canvas.width = ${size};
        canvas.height = ${size};
        const ctx = canvas.getContext('2d');

        // Background: Carbon Ink (#111215)
        ctx.fillStyle = '#111215';
        ctx.fillRect(0, 0, ${size}, ${size});

        // Inner Emerald Accent Frame (#0B6E4F)
        const inset = Math.round(${size} * 0.08);
        ctx.strokeStyle = '#0B6E4F';
        ctx.lineWidth = Math.max(4, Math.round(${size} * 0.035));
        ctx.strokeRect(inset, inset, ${size} - inset * 2, ${size} - inset * 2);

        // Crisp Alabaster Peso Symbol
        ctx.fillStyle = '#F6F5F0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 ' + Math.round(${size} * 0.56) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText('₱', ${size} / 2, ${size} * 0.50);

        // Bottom label "PESO"
        ctx.fillStyle = '#10B981';
        ctx.font = '800 ' + Math.round(${size} * 0.11) + 'px monospace';
        ctx.fillText('PESO', ${size} / 2, ${size} * 0.83);

        return canvas.toDataURL('image/png').split(',')[1];
      })()`,
      returnByValue: true
    });
    return res.result.result.value;
  };

  const icon1024B64 = await renderIconBase64(1024);
  const icon192B64 = await renderIconBase64(192);

  fs.mkdirSync('public', { recursive: true });
  fs.mkdirSync('releases', { recursive: true });
  fs.writeFileSync('public/icon-1024.png', Buffer.from(icon1024B64, 'base64'));
  fs.writeFileSync('public/icon-192.png', Buffer.from(icon192B64, 'base64'));
  fs.writeFileSync('icon-192.png', Buffer.from(icon192B64, 'base64'));

  // Generate Native iOS Configuration Profile (.mobileconfig) that installs PESO
  // directly onto iPhone Home Screen via iOS Settings -> Profile Downloaded -> Install
  // with ZERO provisioning profile errors and ZERO 7-day expiration!
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
  console.log('Generated public/icon-1024.png, public/icon-192.png, and PESO-iOS-Installer.mobileconfig');
  ws.close();
} finally {
  chrome.kill();
}
