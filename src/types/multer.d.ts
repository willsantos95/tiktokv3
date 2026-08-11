import 'express';

declare global {
  namespace Express {
    interface Multer {
      File: any;
    }
  }
}
