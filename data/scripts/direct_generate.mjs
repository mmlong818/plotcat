// Direct screenplay generation: bypasses HTTP API, calls Claude CLI directly
// Uses ESM imports to load the same prompt builders the server uses

import { buildSceneOutlinePrompt, buildSceneWeavePrompt } from '../../src/ai/prompts.js';
import { parseJsonFromText } from '../../src/ai/generator.js';
import { spawn } from 'child_process';
import { request as httpRequest } from 'http';
import { writeFileSync } from 'fs';

const PROJECT_ID = 'project_mnyhwhzo_5veqx5';
const OUT_DIR = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const options = { hostname: '127.0.0.1', port: 4173, path, method: 'GET' };
    const req = httpRequest(options, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject); req.end();
  });
}

function httpGet(path) {
  return apiGet(path);
}

console.log('Loading...');
