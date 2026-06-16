const multer = require("multer");
const { ApiError } = require("../utils/apiResponse");

const contactUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    if (!/\.(xlsx|xls)$/i.test(file.originalname)) {
      return callback(
        new ApiError(400, "Only .xlsx and .xls files are supported")
      );
    }
    return callback(null, true);
  }
});

module.exports = { contactUpload };
