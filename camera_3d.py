"""
3D Camera Engine for Blender Viewport Simulation.
Provides interactive 3D Orbit, Pan, and Zoom camera controls,
perspective projection, depth sorting, and Blender 3D Axis Gizmo rendering.
"""

from __future__ import annotations

import math
from typing import Tuple, List, Optional
import pygame
from pygame import Surface, Vector2, Rect


class Camera3D:
    def __init__(
        self,
        viewport_width: int = 940,
        viewport_height: int = 540,
        fov: float = 60.0,
    ):
        self.width = viewport_width
        self.height = viewport_height
        self.fov = fov

        # Orbit Camera Parameters
        self.target = [0.0, 0.0, 0.0]
        self.distance = 7.5
        self.yaw = math.radians(45.0)    # 45 deg angle
        self.pitch = math.radians(25.0)  # 25 deg elevation
        self.pan_x = 0.0
        self.pan_y = 0.0

        # Mouse Tracking
        self.is_orbiting = False
        self.is_panning = False
        self.last_mouse_pos = (0, 0)

    def handle_event(self, event: pygame.event.Event, viewport_rect: Rect) -> bool:
        """Process mouse dragging and wheel events for 3D camera navigation."""
        handled = False
        if event.type == pygame.MOUSEBUTTONDOWN:
            if viewport_rect.collidepoint(event.pos):
                if event.button in (2, 3):  # Middle or Right Click to Orbit
                    if pygame.key.get_mods() & pygame.KMOD_SHIFT:
                        self.is_panning = True
                    else:
                        self.is_orbiting = True
                    self.last_mouse_pos = event.pos
                    handled = True
                elif event.button == 4:  # Scroll Up -> Zoom In
                    self.distance = max(2.0, self.distance - 0.5)
                    handled = True
                elif event.button == 5:  # Scroll Down -> Zoom Out
                    self.distance = min(25.0, self.distance + 0.5)
                    handled = True

        elif event.type == pygame.MOUSEBUTTONUP:
            if event.button in (2, 3):
                self.is_orbiting = False
                self.is_panning = False
                handled = True

        elif event.type == pygame.MOUSEMOTION:
            if self.is_orbiting:
                dx = event.pos[0] - self.last_mouse_pos[0]
                dy = event.pos[1] - self.last_mouse_pos[1]
                self.yaw += dx * 0.008
                self.pitch = max(-math.pi / 2 + 0.1, min(math.pi / 2 - 0.1, self.pitch + dy * 0.008))
                self.last_mouse_pos = event.pos
                handled = True
            elif self.is_panning:
                dx = event.pos[0] - self.last_mouse_pos[0]
                dy = event.pos[1] - self.last_mouse_pos[1]
                self.pan_x += dx * 0.01
                self.pan_y -= dy * 0.01
                self.last_mouse_pos = event.pos
                handled = True

        return handled

    def project_point(
        self, point_3d: Tuple[float, float, float], viewport_offset: Tuple[int, int]
    ) -> Tuple[Optional[Tuple[int, int]], float]:
        """Transform world 3D coordinate (X,Y,Z) to 2D viewport screen coordinate (x,y,depth)."""
        x = point_3d[0] - self.target[0] - self.pan_x
        y = point_3d[1] - self.target[1] - self.pan_y
        z = point_3d[2] - self.target[2]

        # Rotate Yaw (Y axis)
        cos_y, sin_y = math.cos(self.yaw), math.sin(self.yaw)
        rx = x * cos_y - z * sin_y
        rz = x * sin_y + z * cos_y

        # Rotate Pitch (X axis)
        cos_p, sin_p = math.cos(self.pitch), math.sin(self.pitch)
        ry = y * cos_p - rz * sin_p
        rz_final = y * sin_p + rz * cos_p

        # Distance Offset along Camera View Vector
        depth = rz_final + self.distance
        if depth <= 0.2:
            return None, depth

        # Perspective Scale Matrix
        focal_length = (self.width / 2.0) / math.tan(math.radians(self.fov / 2.0))
        screen_x = int(viewport_offset[0] + self.width / 2.0 + (rx * focal_length / depth))
        screen_y = int(viewport_offset[1] + self.height / 2.0 - (ry * focal_length / depth))

        return (screen_x, screen_y), depth

    def draw_blender_gizmo(
        self, target: Surface, gizmo_pos: Tuple[int, int], radius: int = 35
    ) -> None:
        """Render Blender 3D Axis Orientation Triad Gizmo (Red=X, Green=Y, Blue=Z)."""
        gx, gy = gizmo_pos
        pygame.draw.circle(target, (20, 30, 42), gizmo_pos, radius)
        pygame.draw.circle(target, (50, 70, 95), gizmo_pos, radius, width=1)

        axes = [
            ((1.0, 0.0, 0.0), (235, 60, 60), "X"),    # Red X Axis
            ((0.0, 1.0, 0.0), (80, 220, 100), "Y"),   # Green Y Axis
            ((0.0, 0.0, 1.0), (60, 140, 245), "Z"),   # Blue Z Axis
        ]

        font = pygame.font.SysFont("dejavusans", 10, bold=True)

        for axis_vec, color, label in axes:
            # Transform axis direction based on camera yaw & pitch
            x, y, z = axis_vec
            cos_y, sin_y = math.cos(self.yaw), math.sin(self.yaw)
            rx = x * cos_y - z * sin_y
            rz = x * sin_y + z * cos_y
            cos_p, sin_p = math.cos(self.pitch), math.sin(self.pitch)
            ry = y * cos_p - rz * sin_p

            ax = int(gx + rx * (radius - 8))
            ay = int(gy - ry * (radius - 8))

            pygame.draw.line(target, color, gizmo_pos, (ax, ay), 2)
            pygame.draw.circle(target, color, (ax, ay), 4)

            text_surf = font.render(label, True, (255, 255, 255))
            target.blit(text_surf, (ax - 3, ay - 5))
