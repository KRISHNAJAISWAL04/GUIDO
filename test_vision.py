"""
Standalone OpenCV Object Detection Testing Utility.
Run this script to test your webcam feed, face/person detection,
motion tracking, and bounding boxes in isolation.

Controls:
  [M] Cycle Detection Mode (Face / Motion / Synthetic)
  [B] Toggle Bounding Boxes
  [C] Toggle Camera / Synthetic Stream
  [ESC / Q] Quit
"""

from __future__ import annotations

import sys
import cv2

from vision_engine import VisionEngine


def main() -> None:
    print("=" * 60)
    print(" OPENCV OBJECT DETECTION TEST SANDBOX")
    print("=" * 60)
    print(" Controls:")
    print("   [M] - Cycle Mode (FACE -> MOTION -> SYNTHETIC)")
    print("   [B] - Toggle Bounding Boxes")
    print("   [C] - Toggle Camera Mode")
    print("   [Q / ESC] - Quit Sandbox")
    print("=" * 60)

    vision = VisionEngine()

    while True:
        frame, target_detected, count = vision.process_frame()

        status_text = (
            f"Detected: {count} | Active: {target_detected} | "
            f"Mode: {vision.mode.upper()} | Boxes: {vision.draw_boxes}"
        )

        cv2.putText(
            frame,
            status_text,
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 255, 255),
            2,
        )

        cv2.imshow("OpenCV Object Detection Test Sandbox", frame)

        key = cv2.waitKey(30) & 0xFF
        if key in (27, ord("q"), ord("Q")):
            break
        elif key in (ord("m"), ord("M")):
            msg = vision.cycle_mode()
            print(f"[TEST] {msg}")
        elif key in (ord("b"), ord("B")):
            active = vision.toggle_bounding_boxes()
            print(f"[TEST] Bounding Boxes: {active}")
        elif key in (ord("c"), ord("C")):
            msg = vision.toggle_camera()
            print(f"[TEST] {msg}")

    vision.release()
    cv2.destroyAllWindows()
    print("[TEST] OpenCV Sandbox Closed.")


if __name__ == "__main__":
    main()
