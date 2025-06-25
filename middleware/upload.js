import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (req, file, cb) => {
    const allowedFormats = ['image/jpeg', 'image/png', 'video/mp4'];
    if (allowedFormats.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and MP4 are allowed.'));
    }
  },
});

export default upload;
