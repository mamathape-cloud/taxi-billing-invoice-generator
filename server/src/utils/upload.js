import multer from "multer";
import path from "path";
import fs from "fs";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function makeUploader({ folder, allowedMime }) {
  const uploadRoot = path.join(process.cwd(), "uploads", folder);
  ensureDir(uploadRoot);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadRoot),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
      const safeExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : ".png";
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
  });

  const fileFilter = (req, file, cb) => {
    if (allowedMime && !allowedMime.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"));
    }
    cb(null, true);
  };

  return multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
}

export function publicUploadUrl(req, relativePath) {
  const base = process.env.UPLOAD_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}${relativePath.startsWith("/") ? "" : "/"}${relativePath}`;
}

