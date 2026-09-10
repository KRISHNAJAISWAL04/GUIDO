"""
OpenCV Vision Engine for Hologram Car Simulation.
Provides non-blocking webcam feed capture, OpenCV face & motion detection,
bounding box overlays, synthetic fallback video generator, and Pygame Surface conversion.
"""

from __future__ import annotations

import time
import math
import threading
from typing import Optional, Tuple, List

import cv2
import numpy as np
import pygame

import config


class VisionEngine:
    def __init__(
        self,
        camera_index: int = config.CAMERA_INDEX,
        mode: str = config.DEFAULT_DETECTION_MODE,
        draw_boxes: bool = config.DRAW_BOUNDING_BOXES,
    ):
        self.camera_index = camera_index
        self.mode = mode
        self.draw_boxes = draw_boxes
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_camera_active = False

        # OpenCV 5 vs 4 detector support
        self.has_cascade = hasattr(cv2, "CascadeClassifier")
        self.face_cascade = None
        self.body_cascade = None

        if self.has_cascade:
            try:
                face_xml = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
                body_xml = cv2.data.haarcascades + "haarcascade_upperbody.xml"
                self.face_cascade = cv2.CascadeClassifier(face_xml)
                self.body_cascade = cv2.CascadeClassifier(body_xml)
            except Exception:
                self.has_cascade = False

        # Background Motion Subtractor
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=300, varThreshold=25, detectShadows=False
        )

        # Telemetry
        self.fps = 0.0
        self.detected_count = 0
        self.target_detected = False
        self.last_detection_time = 0.0
        self._frame_count = 0
        self._start_time = time.time()
        self.synth_angle = 0.0

        # Non-blocking camera async probe
        threading.Thread(target=self._init_camera_async, daemon=True).start()

    def _init_camera_async(self) -> None:
        """Asynchronously probe camera hardware without blocking GUI window creation."""
        try:
            cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
            if cap.isOpened():
                ret, frame = cap.read()
                if ret and frame is not None:
                    self.cap = cap
                    self.is_camera_active = True
                    return
            cap.release()
        except Exception:
            pass

        self.is_camera_active = False
        if self.mode != "synthetic":
            self.mode = "synthetic"

    def toggle_camera(self) -> str:
        """Toggle physical webcam or synthetic mode."""
        if self.is_camera_active:
            if self.cap:
                self.cap.release()
                self.cap = None
            self.is_camera_active = False
            self.mode = "synthetic"
            return "Switched to Synthetic Camera Mode"
        else:
            self._init_camera_async()
            time.sleep(0.3)
            if self.is_camera_active:
                self.mode = "face"
                return "Switched to Physical Webcam Mode"
            else:
                self.mode = "synthetic"
                return "Physical camera unavailable. Remaining in Synthetic Mode."

    def cycle_mode(self) -> str:
        """Cycle through detection modes."""
        modes = ["face", "motion", "synthetic"]
        current_idx = modes.index(self.mode) if self.mode in modes else 0
        self.mode = modes[(current_idx + 1) % len(modes)]
        return f"Detection Mode set to: {self.mode.upper()}"

    def toggle_bounding_boxes(self) -> bool:
        """Toggle display of detection bounding boxes."""
        self.draw_boxes = not self.draw_boxes
        return self.draw_boxes

    def _generate_synthetic_frame(self, width: int = 640, height: int = 480) -> np.ndarray:
        """Generate synthetic test camera frame simulating a person approaching."""
        frame = np.zeros((height, width, 3), dtype=np.uint8)

        for y in range(0, height, 40):
            cv2.line(frame, (0, y), (width, y), (30, 45, 60), 1)
        for x in range(0, width, 40):
            cv2.line(frame, (x, 0), (x, height), (30, 45, 60), 1)

        self.synth_angle += 0.05
        cx = int(width / 2 + math.sin(self.synth_angle) * 180)
        cy = int(height / 2 + math.cos(self.synth_angle * 0.7) * 80)
        radius = int(45 + math.sin(self.synth_angle * 1.2) * 15)

        cv2.circle(frame, (cx, cy), radius, (230, 160, 120), -1)
        cv2.circle(frame, (cx, cy), radius, (0, 230, 255), 2)
        cv2.circle(frame, (cx - 15, cy - 10), 6, (40, 40, 40), -1)
        cv2.circle(frame, (cx + 15, cy - 10), 6, (40, 40, 40), -1)
        cv2.ellipse(frame, (cx, cy + 15), (15, 8), 0, 0, 180, (40, 40, 40), 2)

        cv2.putText(
            frame,
            "SYNTHETIC OPENCV CAMERA TEST",
            (20, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 230, 255),
            2,
        )

        return frame

    def process_frame(self) -> Tuple[np.ndarray, bool, int]:
        """Capture frame, perform detection based on selected mode, and return result."""
        self._frame_count += 1
        now = time.time()
        elapsed = now - self._start_time
        if elapsed >= 1.0:
            self.fps = self._frame_count / elapsed
            self._frame_count = 0
            self._start_time = now

        frame: Optional[np.ndarray] = None

        if self.is_camera_active and self.cap:
            ret, captured = self.cap.read()
            if ret and captured is not None:
                frame = cv2.flip(captured, 1)

        if frame is None or self.mode == "synthetic":
            frame = self._generate_synthetic_frame()

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        detections: List[Tuple[int, int, int, int]] = []

        if self.mode in ("face", "synthetic"):
            if self.has_cascade and self.face_cascade:
                gray_eq = cv2.equalizeHist(gray)
                faces = self.face_cascade.detectMultiScale(
                    gray_eq,
                    scaleFactor=config.SCALE_FACTOR,
                    minNeighbors=config.MIN_NEIGHBORS,
                    minSize=config.MIN_FACE_SIZE,
                )
                for (x, y, w, h) in faces:
                    detections.append((x, y, w, h))
            else:
                fg_mask = self.bg_subtractor.apply(frame)
                contours, _ = cv2.findContours(
                    fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
                )
                for c in contours:
                    if cv2.contourArea(c) > 2000:
                        x, y, w, h = cv2.boundingRect(c)
                        detections.append((x, y, w, h))

        elif self.mode == "motion":
            fg_mask = self.bg_subtractor.apply(frame)
            contours, _ = cv2.findContours(
                fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            for c in contours:
                if cv2.contourArea(c) > 1500:
                    x, y, w, h = cv2.boundingRect(c)
                    detections.append((x, y, w, h))

        self.detected_count = len(detections)
        self.target_detected = self.detected_count > 0

        if self.target_detected:
            self.last_detection_time = time.time()

        if self.draw_boxes:
            for (x, y, w, h) in detections:
                color = (0, 255, 120) if self.mode != "motion" else (0, 180, 255)
                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                cv2.putText(
                    frame,
                    f"TARGET ({w}x{h})",
                    (x, max(y - 8, 15)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.45,
                    color,
                    1,
                )

        cv2.putText(
            frame,
            f"OPENCV FPS: {self.fps:.1f} | MODE: {self.mode.upper()}",
            (10, frame.shape[0] - 15),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 230, 255),
            1,
        )

        return frame, self.target_detected, self.detected_count

    def get_pygame_surface(
        self, target_size: Optional[Tuple[int, int]] = None
    ) -> pygame.Surface:
        """Convert current OpenCV BGR frame into Pygame Surface."""
        frame, _, _ = self.process_frame()
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w, _ = rgb.shape

        surface = pygame.image.frombuffer(rgb.tobytes(), (w, h), "RGB")

        if target_size and target_size != (w, h):
            surface = pygame.transform.smoothscale(surface, target_size)

        return surface

    def release(self) -> None:
        """Release camera resource safely."""
        if self.cap:
            self.cap.release()
            self.cap = None
        self.is_camera_active = False
