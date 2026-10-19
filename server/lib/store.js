/**
 * Stockage des commandes et de la liste prioritaire dans des fichiers JSON.
 * Écritures sérialisées et atomiques (fichier temporaire puis renommage).
 * Suffisant pour le lancement ; à remplacer par une base de données si le volume grandit.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

export class JsonStore {
  constructor(file) {
    this.file = file;
    this.data = null;
    this.queue = Promise.resolve();
  }

  async load() {
    if (this.data) return this.data;
    try {
      this.data = JSON.parse(await fs.readFile(this.file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      this.data = {};
    }
    return this.data;
  }

  async get(id) {
    const d = await this.load();
    return d[id] ? structuredClone(d[id]) : null;
  }

  async put(id, value) {
    const d = await this.load();
    d[id] = structuredClone(value);
    return this.flush();
  }

  async all() {
    return Object.values(await this.load()).map((v) => structuredClone(v));
  }

  flush() {
    this.queue = this.queue.then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(this.data, null, 2));
      await fs.rename(tmp, this.file);
    });
    return this.queue;
  }
}

export const orders = new JsonStore(path.join(config.dataDir, 'orders.json'));
export const waitlist = new JsonStore(path.join(config.dataDir, 'waitlist.json'));
