#!/usr/bin/env node

import QRCode from 'qrcode';
import { execSync } from 'child_process';
import { cancel, intro, outro, spinner } from '@clack/prompts';

// constants
const DELAY = 400;

const AIRPORT_PATH = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';

// common utils
function execute(command) {
  return execSync(command).toString().trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// network utils
function getNetworkSSID() {
  return execute(`${AIRPORT_PATH} -I | awk '/ SSID/ {print substr($0, index($0, $2))}'`);
}

function getNetworkPassword(ssid) {
  return execute(`security find-generic-password -ga ${ssid} -w || true`);
}

function getNetworkEncryption() {
  return execute(`${AIRPORT_PATH} -I | awk -F': ' '/link auth:/ {print $2}'`);
}

function parseNetworkEncryption(networkEncryption) {
  const encryption = networkEncryption.toLowerCase();

  if (encryption.includes('wep')) {
    return 'WEP';
  }

  if (encryption.includes('wpa')) {
    return 'WPA';
  }

  return 'None';
}

// qr utils
function escapeTagValue(value) {
  return value.replace(/[\\\;\:\,]/g, '\\$&');
}

function encodeTag(tag, value) {
  return `${tag}:${escapeTagValue(value)}`;
}

function encodeWifiConfig(config) {
  const type = encodeTag('T', config.type);
  const ssid = encodeTag('S', config.ssid);
  const password = encodeTag('P', config.password);
  const hidden = encodeTag('H', config.hidden ? 'true' : '');

  const payload = [type, ssid, password, hidden].join(';');

  return `WIFI:${payload};;`;
}

function getTerminalQRCode(config) {
  return QRCode.toString(config, { type: 'terminal', small: true });
}

// CLI
async function main() {
  try {
    intro(`🛜  Wi-Fi QR`);
    const loader = spinner();

    // get network ssid and password
    loader.start('Getting your network SSID and password...');
    const ssid = getNetworkSSID();
    const password = getNetworkPassword(ssid);
    await delay(DELAY);
    loader.stop('Network SSID and password retrieved');

    // get network encryption type
    loader.start('Getting your network encryption type...');
    const networkEncryption = getNetworkEncryption();
    const type = parseNetworkEncryption(networkEncryption);
    await delay(DELAY);
    loader.stop('Network encryption type retrieved');

    // generate qr code
    loader.start('Generating QR code...');
    const config = encodeWifiConfig({ type, ssid, password, hidden: false });
    const qr = await getTerminalQRCode(config);
    await delay(DELAY);
    loader.stop('QR code generated');

    outro(`🤳 Scan this QR code to connect to the "${ssid}" Wi-Fi`);
    console.log(qr);
  } catch (error) {
    cancel(`😭 Something went wrong: ${error.message}`);
    process.exit(0);
  }
}

main();
