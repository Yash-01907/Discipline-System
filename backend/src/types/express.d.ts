// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string; // Mongoose virtual getter
        _id: any; // MongoDB ObjectId
        name: string;
        email: string;
      };
      file?: Express.Multer.File; // For multer file uploads
    }
  }
}

export {};
