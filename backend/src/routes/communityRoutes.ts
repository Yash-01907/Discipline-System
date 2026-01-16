import express from "express";
import { getCommunityFeed } from "../controllers/communityController";

const router = express.Router();

router.get("/feed", getCommunityFeed);

export default router;
