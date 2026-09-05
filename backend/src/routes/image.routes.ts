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

router.use(userAuth);
router.post("/upload", upload.single("image"), uploadAndEncodeImage);
router.get("/", getUserImages);
router.get("/:id", getImageDetails);
router.get("/:id/download", downloadSifFile);
router.get("/:id/view", decodeAndServeImage);

export default router;
