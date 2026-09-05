import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype.startsWith('image/') ||
            file.originalname.toLowerCase().endsWith('.sif') ||
            file.mimetype === 'application/octet-stream'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Only image and .sif container files are allowed'));
        }
    },
});
