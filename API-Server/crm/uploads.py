from pathlib import Path

from PIL import Image, UnidentifiedImageError


ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024


def validate_image_upload(upload):
    if not upload or not getattr(upload, "name", None):
        raise ValueError("Select an image file.")
    if upload.size > MAX_IMAGE_SIZE:
        raise ValueError("Image size cannot exceed 10 MB.")
    extension = Path(upload.name).suffix.lower().lstrip(".")
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError("Supported image formats: JPG, JPEG, PNG and WEBP.")
    if str(getattr(upload, "content_type", "")).lower() not in ALLOWED_IMAGE_MIME_TYPES:
        raise ValueError("The uploaded file is not a supported image.")
    try:
        Image.open(upload).verify()
    except (UnidentifiedImageError, OSError, ValueError):
        raise ValueError("The uploaded file is not a valid image.")
    finally:
        upload.seek(0)
    return extension
