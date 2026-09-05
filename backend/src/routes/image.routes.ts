import express from "express";
import { userAuth } from "../middlewares/auth.middleware.js";
import { upload } from "../config/multer.js";
import {
    uploadAndEncodeImage,
    getUserImages,
    getImageDetails,
    downloadSifFile,
    decodeAndServeImage,
} from "../controller/image.controller.js";

const router: any = express.Router();

// Require auth for all image routes
router.use(userAuth);

// Upload & encode
router.post("/upload", upload.single("image"), uploadAndEncodeImage);

// List user images
router.get("/", getUserImages);

// Image metadata & header inspect
router.get("/:id", getImageDetails);

// Download raw .sif file
router.get("/:id/download", downloadSifFile);

// Decrypt on-the-fly and preview/serve
router.get("/:id/view", decodeAndServeImage);

export default router;
