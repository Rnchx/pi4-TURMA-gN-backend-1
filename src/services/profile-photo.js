import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../http/errors.js';

const TYPES = {
  'image/jpeg': { ext: 'jpg', valid: b => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', valid: b => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) },
  'image/webp': { ext: 'webp', valid: b => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
};
const KEY = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export default class ProfilePhoto {
  constructor(db, java, directory, maxBytes = 10 * 1024 * 1024) {
    this.db = db;
    this.java = java;
    this.directory = path.resolve(directory);
    this.maxBytes = maxBytes;
  }

  async upload(usuarioId, contentType, body) {
    const type = String(contentType || '').split(';')[0].trim().toLowerCase();
    const format = TYPES[type];
    if (!format || !Buffer.isBuffer(body) || body.length < 16 || body.length > this.maxBytes || !format.valid(body)) {
      throw new ApiError(400, 'fotoInvalida', `Envie uma imagem JPEG, PNG ou WebP válida de até ${Math.floor(this.maxBytes / 1048576)} MB.`);
    }
    const key = `${randomUUID()}.${format.ext}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.file(key), body, { flag: 'wx' });
    try {
      const result = await this.java('alterarFotoPerfil', { usuarioId, fotoPerfilChave: key });
      await this.removeFile(result.fotoPerfilAnterior);
      return { fotoPerfil: true };
    } catch (error) {
      await this.removeFile(key);
      throw error;
    }
  }

  async remove(usuarioId) {
    const result = await this.java('alterarFotoPerfil', { usuarioId, fotoPerfilChave: null });
    await this.removeFile(result.fotoPerfilAnterior);
    return { fotoPerfil: false };
  }

  async read(usuarioId) {
    const row = await this.db.oneOrNone('SELECT foto_perfil_chave FROM usuarios WHERE id = $1 AND ativo', [usuarioId]);
    if (!row?.foto_perfil_chave) throw new ApiError(404, 'fotoNaoEncontrada', 'A conta não possui foto de perfil.');
    const key = row.foto_perfil_chave;
    try {
      return { body: await readFile(this.file(key)), type: key.endsWith('.png') ? 'image/png' : key.endsWith('.webp') ? 'image/webp' : 'image/jpeg' };
    } catch {
      throw new ApiError(404, 'fotoNaoEncontrada', 'A foto de perfil não está disponível.');
    }
  }

  async removeFile(key) {
    if (!key || !KEY.test(key)) return;
    await unlink(this.file(key)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }

  file(key) {
    if (!KEY.test(key)) throw new ApiError(400, 'fotoInvalida', 'A referência da foto é inválida.');
    return path.join(this.directory, key);
  }
}
