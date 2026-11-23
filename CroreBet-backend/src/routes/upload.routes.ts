import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { requireAdmin } from '../middleware/adminAuth';
import { ok, badRequest, serverError } from '../utils/response';

const router = Router();

const UPLOAD_ROOT = '/var/www/rajvardhan/uploads';

// Ensure folders exist
['sliders'].forEach((dir) => {
 const p = path.join(UPLOAD_ROOT, dir);
 if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const storage = multer.diskStorage({
 destination: (req, _file, cb) => {
 const folder = String(req.body.folder || req.query.folder || 'sliders');
 const target = path.join(UPLOAD_ROOT, folder);
 if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
 cb(null, target);
 },
 filename: (_req, file, cb) => {
 const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
 const id = crypto.randomBytes(12).toString('hex');
 cb(null, `${Date.now()}-${id}${ext}`);
 },
});

const upload = multer({
 storage,
 limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
 fileFilter: (_req, file, cb) => {
 const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
 if (!allowed.includes(file.mimetype)) {
 return cb(new Error('Only JPG, PNG, WEBP, GIF allowed'));
 }
 cb(null, true);
 },
});

// POST /api/admin/upload
// form-data: file (binary), folder (optional: sliders|banners|logos)
router.post('/upload', requireAdmin, upload.single('file'), async (req, res) => {
 try {
 if (!req.file) return badRequest(res, 'No file uploaded');
 const folder = String(req.body.folder || 'sliders');
 // Public URL — served by nginx at /uploads/
 const url = `/uploads/${folder}/${req.file.filename}`;
 return ok(res, {
 url,
 filename: req.file.filename,
 size: req.file.size,
 mimetype: req.file.mimetype,
 }, 'Uploaded');
 } catch (e: any) {
 return serverError(res, e.message);
 }
});

export default router;