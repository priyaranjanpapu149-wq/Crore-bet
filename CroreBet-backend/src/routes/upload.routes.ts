import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { requireAdmin } from '../middleware/adminAuth';
import { ok, badRequest, serverError } from '../utils/response';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadRoot = path.resolve(process.env.UPLOAD_ROOT || '/var/www/rajvardhan/uploads');

function imageExtension(buffer: Buffer): string | null {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return '.jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return '.gif';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return '.webp';
  return null;
}

router.post('/upload', requireAdmin, upload.single('file'), async (req, res) => {
  const folder = String(req.body?.folder || 'sliders');
  if (!['sliders', 'banners', 'logos'].includes(folder)) return badRequest(res, 'Invalid upload folder');
  if (!req.file) return badRequest(res, 'No file uploaded');
  const extension = imageExtension(req.file.buffer);
  if (!extension) return badRequest(res, 'Only JPG, PNG, WEBP or GIF images are allowed');
  try {
    const directory = path.join(uploadRoot, folder);
    await fs.mkdir(directory, { recursive: true });
    const filename = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`;
    await fs.writeFile(path.join(directory, filename), req.file.buffer, { flag: 'wx' });
    return ok(res, { url: `/uploads/${folder}/${filename}`, filename, size: req.file.size, mimetype: req.file.mimetype }, 'Uploaded');
  } catch (e: any) { return serverError(res, 'Could not save uploaded image'); }
});

export default router;
