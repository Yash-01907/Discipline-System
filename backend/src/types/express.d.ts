import { IUser } from "../models/User";

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      file?: Express.Multer.File; // For multer file uploads
    }
  }
}

export {};
