"""
Blender-Style 3D Viewport Studio & Simulation Workbench.
Provides interactive 3D camera navigation (Orbit/Pan/Zoom), 3D shading modes
(Wireframe/Solid/Material/Rendered), Blender Outliner, Properties Inspector,
3D OBJ rendering, and integrated OpenCV/Voice engines.
"""

from __future__ import annotations

import math
import sys
import time
from typing import Optional, List, Tuple

import pygame
from pygame import Rect, Surface, Vector2

import config
from camera_3d import Camera3D
from obj_loader import OBJLoader, Mesh3D, Face3D
from vision_engine import VisionEngine
from voice_engine import VoiceEngine


# ---------------------------------------------------------
# UI Drawing Utilities
# ---------------------------------------------------------

def draw_text(
    target: Surface,
    text: str,
    position: tuple[int, int],
    font: pygame.font.Font,
    color: tuple[int, int, int] = config.WHITE,
) -> None:
    target.blit(font.render(text, True, color), position)


def draw_panel(
    target: Surface,
    rectangle: Rect,
    fill: tuple[int, int, int],
    border: tuple[int, int, int],
    radius: int = 6,
) -> None:
    pygame.draw.rect(target, fill, rectangle, border_radius=radius)
    pygame.draw.rect(target, border, rectangle, width=1, border_radius=radius)


# ---------------------------------------------------------
# Main Blender 3D Studio Workbench
# ---------------------------------------------------------

def main() -> None:
    pygame.init()
    pygame.display.set_caption("Blender 3D Studio Workbench - Hologram Car Simulation")
    screen = pygame.display.set_mode((config.WIDTH, config.HEIGHT))
    clock = pygame.time.Clock()

    # Create 3D Camera & Sensors
    camera = Camera3D(viewport_width=940, viewport_height=560)
    vision = VisionEngine()
    voice = VoiceEngine()

    # Load 3D Meshes
    car_mesh = OBJLoader.generate_car_mesh()
    fan_mesh = OBJLoader.generate_hologram_fan_mesh()

    # Blender Modes & State
    shading_modes = ["WIREFRAME", "SOLID", "MATERIAL", "RENDERED"]
    shading_idx = 3  # Default RENDERED

    # Outliner Scene Objects
    scene_objects = [
        "Car_Chassis",
        "Hologram_Fan_Rig",
        "3D_Guide_Robot",
        "Visitor_Model",
        "OpenCV_Camera_Sensor",
    ]
    selected_obj_idx = 0

    # Object Transform Properties (Location, Rotation, Scale)
    transforms = {
        obj: {"pos": [0.0, 0.0, 0.0], "rot": [0.0, 0.0, 0.0], "scale": [1.0, 1.0, 1.0]}
        for obj in scene_objects
    }

    # UI Rectangles
    viewport_rect = Rect(10, 45, 940, 560)
    sidebar_rect = Rect(955, 45, 315, 680)

    # Header Buttons
    header_buttons = [
        (Rect(10, 8, 120, 28), "OBJECT MODE"),
        (Rect(140, 8, 90, 28), "WIREFRAME"),
        (Rect(235, 8, 70, 28), "SOLID"),
        (Rect(310, 8, 85, 28), "MATERIAL"),
        (Rect(400, 8, 95, 28), "RENDERED"),
        (Rect(510, 8, 70, 28), "FRONT"),
        (Rect(585, 8, 70, 28), "RIGHT"),
        (Rect(660, 8, 60, 28), "TOP"),
        (Rect(725, 8, 85, 28), "RESET CAM"),
    ]

    # Telemetry Logs
    logs: List[str] = ["Blender 3D Viewport Workbench Ready."]

    def add_log(msg: str) -> None:
        logs.append(f"[{time.strftime('%H:%M:%S')}] {msg}")
        if len(logs) > 6:
            logs.pop(0)

    add_log("PyOpenGL & 3D Orbit Camera Matrix Engine loaded.")
    voice.speak("Blender 3D Viewport Studio is ready. Drag right mouse button to orbit camera.")

    # Animation variables
    elapsed = 0.0
    hologram_rot = 0.0
    visitor_progress = 0.0
    visitor_active = False

    running = True

    while running:
        delta_time = clock.tick(config.FPS) / 1000.0
        elapsed += delta_time
        hologram_rot += delta_time * 1.5

        # Process Camera Input Events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_SPACE:
                    visitor_active = not visitor_active
                    add_log(f"Simulation Playback: {'PLAYING' if visitor_active else 'PAUSED'}")

            # Camera 3D Orbit/Pan/Zoom Navigation Event Handler
            camera.handle_event(event, viewport_rect)

            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                pos = event.pos

                # Check Header Buttons
                for b_rect, label in header_buttons:
                    if b_rect.collidepoint(pos):
                        if label in shading_modes:
                            shading_idx = shading_modes.index(label)
                            add_log(f"Viewport Shading: {label}")
                        elif label == "FRONT":
                            camera.yaw = 0.0
                            camera.pitch = 0.0
                            add_log("View Preset: FRONT")
                        elif label == "RIGHT":
                            camera.yaw = math.radians(90.0)
                            camera.pitch = 0.0
                            add_log("View Preset: RIGHT")
                        elif label == "TOP":
                            camera.yaw = 0.0
                            camera.pitch = math.radians(85.0)
                            add_log("View Preset: TOP")
                        elif label == "RESET CAM":
                            camera.yaw = math.radians(45.0)
                            camera.pitch = math.radians(25.0)
                            camera.distance = 7.5
                            camera.target = [0.0, 0.0, 0.0]
                            camera.pan_x = 0.0
                            camera.pan_y = 0.0
                            add_log("Reset 3D Camera View")

                # Check Outliner Selection
                for i in range(len(scene_objects)):
                    item_rect = Rect(965, 105 + i * 28, 295, 24)
                    if item_rect.collidepoint(pos):
                        selected_obj_idx = i
                        add_log(f"Selected 3D Object: {scene_objects[i]}")

        # Render Canvas
        screen.fill((18, 22, 28))  # Dark Blender Theme Background

        # ---------------------------------------------------------
        # Render Top Header Toolbar
        # ---------------------------------------------------------
        header_bar = Rect(0, 0, config.WIDTH, 40)
        draw_panel(screen, header_bar, (30, 36, 46), (50, 60, 75), radius=0)

        font_b = pygame.font.SysFont("dejavusans", 12, bold=True)
        font_s = pygame.font.SysFont("dejavusans", 10, bold=True)

        for b_rect, label in header_buttons:
            selected = (label == shading_modes[shading_idx]) or (label == "OBJECT MODE")
            fill = (45, 110, 150) if selected else (24, 30, 40)
            border = config.CYAN if selected else (45, 55, 70)
            draw_panel(screen, b_rect, fill, border, radius=4)
            draw_text(screen, label, (b_rect.x + 8, b_rect.y + 7), font_s, config.WHITE)

        # ---------------------------------------------------------
        # Render Main 3D Viewport Window
        # ---------------------------------------------------------
        draw_panel(screen, viewport_rect, (12, 16, 22), config.CYAN, radius=8)

        # Draw 3D Perspective Floor Grid
        grid_color = (35, 45, 60)
        for g in range(-10, 11, 2):
            # X lines
            p1, d1 = camera.project_point((g, 0, -10), (10, 45))
            p2, d2 = camera.project_point((g, 0, 10), (10, 45))
            if p1 and p2 and d1 > 0.2 and d2 > 0.2:
                pygame.draw.line(screen, grid_color, p1, p2, 1)

            # Z lines
            p1, d1 = camera.project_point((-10, 0, g), (10, 45))
            p2, d2 = camera.project_point((10, 0, g), (10, 45))
            if p1 and p2 and d1 > 0.2 and d2 > 0.2:
                pygame.draw.line(screen, grid_color, p1, p2, 1)

        # Draw 3D Car OBJ Mesh
        shading = shading_modes[shading_idx]
        car_pos = transforms["Car_Chassis"]["pos"]

        # Sort Faces by Depth for Rendering
        render_faces = []
        for face in car_mesh.faces:
            pts = []
            depths = []
            for v_idx in face.vertex_indices:
                vx, vy, vz = car_mesh.vertices[v_idx]
                pt, d = camera.project_point((vx + car_pos[0], vy + car_pos[1], vz + car_pos[2]), (10, 45))
                if pt:
                    pts.append(pt)
                    depths.append(d)
            if len(pts) >= 3:
                avg_depth = sum(depths) / len(depths)
                render_faces.append((avg_depth, pts, face.color))

        # Depth Sort (Back to Front)
        render_faces.sort(key=lambda item: item[0], reverse=True)

        for _, pts, color in render_faces:
            if shading in ("SOLID", "MATERIAL", "RENDERED"):
                pygame.draw.polygon(screen, color, pts)
                pygame.draw.polygon(screen, (30, 60, 90), pts, width=1)
            elif shading == "WIREFRAME":
                pygame.draw.polygon(screen, config.CYAN_BRIGHT, pts, width=1)

        # Draw 3D Hologram Light Beam & Fan Projection
        if shading == "RENDERED":
            h_center, d_c = camera.project_point((0, 1.4, 0), (10, 45))
            h_base, d_b = camera.project_point((0, 0.4, 0), (10, 45))
            if h_center and h_base:
                beam_surf = Surface(screen.get_size(), pygame.SRCALPHA)
                pygame.draw.polygon(
                    beam_surf, (*config.CYAN, 25),
                    [(h_base[0] - 40, h_base[1]), (h_base[0] + 40, h_base[1]),
                     (h_center[0] + 15, h_center[1]), (h_center[0] - 15, h_center[1])]
                )
                screen.blit(beam_surf, (0, 0))

                # Hologram Guide Target Ring
                pygame.draw.circle(screen, config.CYAN_BRIGHT, h_center, 12, width=2)
                draw_text(screen, "3D HOLOGRAM ACTIVE", (h_center[0] - 60, h_center[1] - 25), font_s, config.CYAN_BRIGHT)

        # Draw Blender 3D Axis Orientation Gizmo
        camera.draw_blender_gizmo(screen, gizmo_pos=(910, 85), radius=30)

        # Overlay OpenCV Live Camera PIP inside Blender Viewport
        opencv_pip = vision.get_pygame_surface(target_size=(200, 135))
        pip_r = Rect(20, 455, 200, 135)
        draw_panel(screen, pip_r, (0, 0, 0), config.CYAN, radius=6)
        screen.blit(opencv_pip, (20, 455))
        draw_text(screen, "CAMERA SENSOR PIP", (26, 460), font_s, config.CYAN_BRIGHT)

        # Viewport Telemetry Info
        draw_text(screen, f"VIEWPORT: 3D PERSPECTIVE | SHADING: {shading}", (20, 55), font_s, config.MUTED)
        draw_text(screen, "Orbit: Right-Drag | Pan: Shift+Right-Drag | Zoom: Scroll Wheel", (20, 72), font_s, config.MUTED)

        # ---------------------------------------------------------
        # Render Right Outliner & Properties Inspector Panel
        # ---------------------------------------------------------
        draw_panel(screen, sidebar_rect, (24, 30, 40), (45, 55, 70), radius=8)

        draw_text(screen, "SCENE OUTLINER", (968, 58), font_b, config.CYAN)
        pygame.draw.line(screen, (45, 55, 70), (965, 80), (1255, 80), 1)

        for i, obj_name in enumerate(scene_objects):
            item_r = Rect(965, 95 + i * 26, 295, 22)
            selected = i == selected_obj_idx
            fill = (35, 90, 125) if selected else (18, 24, 32)
            border = config.CYAN if selected else (35, 45, 60)
            draw_panel(screen, item_r, fill, border, radius=4)
            draw_text(screen, f"  📦 {obj_name}", (item_r.x + 8, item_r.y + 4), font_s, config.WHITE)

        # Properties Inspector Section
        prop_y = 250
        draw_text(screen, f"PROPERTIES: {scene_objects[selected_obj_idx]}", (968, prop_y), font_b, config.CYAN)
        pygame.draw.line(screen, (45, 55, 70), (965, prop_y + 22), (1255, prop_y + 22), 1)

        # Transform Sliders Representation
        sel_obj = scene_objects[selected_obj_idx]
        pos = transforms[sel_obj]["pos"]
        rot = transforms[sel_obj]["rot"]

        draw_text(screen, f"Transform Location:", (968, prop_y + 35), font_s, config.MUTED)
        draw_text(screen, f"  X: {pos[0]:.2f}   Y: {pos[1]:.2f}   Z: {pos[2]:.2f}", (968, prop_y + 55), font_b, config.WHITE)

        draw_text(screen, f"Transform Rotation:", (968, prop_y + 80), font_s, config.MUTED)
        draw_text(screen, f"  Pitch: {rot[0]:.1f}°  Yaw: {rot[1]:.1f}°  Roll: {rot[2]:.1f}°", (968, prop_y + 100), font_b, config.WHITE)

        # Sensors Info Card
        draw_text(screen, "SENSOR ATTACHMENT TELEMETRY", (968, prop_y + 140), font_b, config.CYAN)
        draw_panel(screen, Rect(965, prop_y + 165, 295, 120), (14, 20, 28), (35, 45, 60), radius=6)

        draw_text(screen, f"OpenCV Camera: {'ACTIVE' if vision.is_camera_active else 'SYNTHETIC'}", (978, prop_y + 175), font_s, config.GREEN)
        draw_text(screen, f"Detection Mode: {vision.mode.upper()}", (978, prop_y + 195), font_s, config.WHITE)
        draw_text(screen, f"Voice Engine: {voice.status_message}", (978, prop_y + 215), font_s, config.WHITE)
        draw_text(screen, f"TTS Audio: {'MUTED' if voice.muted else 'ACTIVE'}", (978, prop_y + 235), font_s, config.WHITE)

        # ---------------------------------------------------------
        # Render Bottom Timeline & Log Bar
        # ---------------------------------------------------------
        bottom_bar = Rect(10, 615, 940, 110)
        draw_panel(screen, bottom_bar, (16, 22, 30), (45, 55, 70), radius=8)
        draw_text(screen, f"BLENDER TIMELINE & LOG CONSOLE | FPS: {clock.get_fps():.1f}", (24, 624), font_s, config.CYAN)

        log_y = 645
        for l_msg in logs[-3:]:
            draw_text(screen, l_msg, (24, log_y), font_s, config.WHITE)
            log_y += 18

        pygame.display.flip()

    vision.release()
    voice.close()
    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
