import { Response } from 'express';

export const ok = (res: Response, data: any = {}, message = 'Success') => {
  return res.status(200).json({ success: true, message, data });
};

export const created = (res: Response, data: any = {}, message = 'Created') => {
  return res.status(201).json({ success: true, message, data });
};

export const badRequest = (res: Response, message = 'Bad request', data: any = null) => {
  return res.status(400).json({ success: false, message, data });
};

export const unauthorized = (res: Response, message = 'Unauthorized') => {
  return res.status(401).json({ success: false, message });
};

export const forbidden = (res: Response, message = 'Forbidden') => {
  return res.status(403).json({ success: false, message });
};

export const notFound = (res: Response, message = 'Not found') => {
  return res.status(404).json({ success: false, message });
};

export const serverError = (res: Response, message = 'Internal server error') => {
  return res.status(500).json({ success: false, message });
};

export const tooMany = (res: Response, message = 'Too many requests') => {
  return res.status(429).json({ success: false, message });
};
