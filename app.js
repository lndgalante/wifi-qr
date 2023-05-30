#!/usr/bin/env node

import { execSync } from 'child_process';
import qrcode from 'wifi-qr-code-generator';
import { cancel, intro, outro, spinner } from '@clack/prompts';

// constants
const DELAY = 400;

const AIRPORT_PATH = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';

// utils
function execute(command) {
  return execSync(command).toString().trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// helpers
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

function getTerminalQRCode(ssid, password, encryption) {
  return qrcode.generateWifiQRCode({
    ssid,
    password,
    encryption,
    hiddenSSID: false,
    outputFormat: { type: 'terminal' },
  });
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
    const encryption = parseNetworkEncryption(networkEncryption);
    await delay(DELAY);
    loader.stop('Network encryption type retrieved');

    // generate qr code
    loader.start('Generating QR code...');
    const qr = await getTerminalQRCode(ssid, password, encryption);
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

// TODO LIST
// - [ ] Can we use TS?
// - [ ] Record live demo and upload to YT
// - [ ] Twitter publish with previous live demo
