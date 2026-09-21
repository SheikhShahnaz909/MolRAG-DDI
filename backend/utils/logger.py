import logging
import os
from config import LOG_DIR


def setup_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:  # avoid duplicate handlers if called more than once
        return logger

    logger.setLevel(logging.INFO)

    file_handler = logging.FileHandler(os.path.join(LOG_DIR, "app.log"))
    console_handler = logging.StreamHandler()

    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger
