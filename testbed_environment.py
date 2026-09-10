"""
Interactive Visual Testbed & Diagnostic Environment.
Run this application to visually test every subsystem (Car graphics, OpenCV vision,
Voice mic & TTS, Diagnostic console) in dedicated visual test studios BEFORE
starting full integrated simulation.
"""

from __future__ import annotations

import math
import sys
import time
from typing import Optional, List, Tuple

import pygame
from pygame import Rect, Surface, Vector2

import config
from vision_engine import VisionEngine
from voice_engine import VoiceEngine


# ---------------------------------------------------------
# Sleek Modern Autonomous Vehicle Drawing Function
# ---------------------------------------------------------

def draw_sleek_car(
    target: Surface,
    center: tuple[int, int],
    elapsed: float,
    headlights_on: bool = True,
    underglow_on: bool = True,
    body_color_theme: str = "cyan",
) -> None:
    cx, cy = center

    # Color Themes
    if body_color_theme == "chrome":
        main_color = (180, 195, 210)
        accent_color = (230, 245, 255)
        dark_shade = (40, 55, 70)
    elif body_color_theme == "orange":
        main_color = (245, 120, 30)
        accent_color = (255, 190, 80)
        dark_shade = (60, 25, 10)
    elif body_color_theme == "stealth":
        main_color = (25, 35, 45)
        accent_color = (80, 110, 140)
        dark_shade = (8, 12, 18)
    else:  # Default Cyan Metallic
        main_color = (20, 110, 160)
        accent_color = config.CYAN_BRIGHT
        dark_shade = (8, 35, 55)

    # 1. Volumetric Headlight Beams (Pavement Projection)
    if headlights_on:
        beam_surface = Surface(target.get_size(), pygame.SRCALPHA)
        # Left Headlight Beam Cone
        beam_left = [(cx - 60, cy + 105), (cx - 160, cy + 280), (cx - 10, cy + 280)]
        pygame.draw.polygon(beam_surface, (150, 240, 255, 35), beam_left)
        # Right Headlight Beam Cone
        beam_right = [(cx + 60, cy + 105), (cx + 10, cy + 280), (cx + 160, cy + 280)]
        pygame.draw.polygon(beam_surface, (150, 240, 255, 35), beam_right)
        target.blit(beam_surface, (0, 0))

    # 2. Neon Underglow Shadow
    if underglow_on:
        underglow = Surface(target.get_size(), pygame.SRCALPHA)
        pygame.draw.ellipse(underglow, (*config.CYAN, 45), Rect(cx - 195, cy - 145, 390, 310))
        target.blit(underglow, (0, 0))

    # Car Ground Shadow
    pygame.draw.ellipse(target, (2, 6, 12), Rect(cx - 210, cy + 115, 420, 95))

    # 3. Rotating Futuristic Alloy Wheels
    wheel_positions = [
        (cx - 148, cy - 85), (cx + 148, cy - 85),
        (cx - 148, cy + 85), (cx + 148, cy + 85),
    ]

    wheel_spin = elapsed * 8.0

    for wx, wy in wheel_positions:
        # Tire Outer Rim
        pygame.draw.ellipse(target, (10, 15, 22), Rect(wx - 24, wy - 48, 48, 96))
        pygame.draw.ellipse(target, (35, 45, 55), Rect(wx - 24, wy - 48, 48, 96), width=3)

        # Alloy Wheel Disc
        pygame.draw.ellipse(target, (70, 90, 110), Rect(wx - 14, wy - 30, 28, 60))

        # Rotating Spokes
        for spoke_i in range(3):
            ang = wheel_spin + spoke_i * (math.pi / 1.5)
            sx = wx + math.cos(ang) * 10
            sy = wy + math.sin(ang) * 22
            pygame.draw.line(target, accent_color, (wx, wy), (int(sx), int(sy)), 2)

    # 4. Aerodynamic Main Car Chassis (Futuristic Sports Profile)
    body_poly = [
        (cx, cy - 210),           # Nose Cone Front
        (cx + 95, cy - 170),      # Front Right Fender
        (cx + 145, cy - 75),      # Right Side Mirror Base
        (cx + 158, cy + 115),     # Rear Right Wheel Arch
        (cx + 110, cy + 185),     # Rear Right Bumper
        (cx - 110, cy + 185),     # Rear Left Bumper
        (cx - 158, cy + 115),     # Rear Left Wheel Arch
        (cx - 145, cy - 75),      # Left Side Mirror Base
        (cx - 95, cy - 170),      # Front Left Fender
    ]
    pygame.draw.polygon(target, main_color, body_poly)
    pygame.draw.lines(target, accent_color, True, body_poly, 3)

    # Secondary Metallic Contour Highlight Lines
    pygame.draw.lines(
        target, (120, 200, 240), False,
        [(cx - 85, cy - 160), (cx, cy - 195), (cx + 85, cy - 160)], 2
    )

    # 5. Panoramic Tinted Glass Windshield & Roof Structure
    windshield = [
        (cx, cy - 138),
        (cx + 62, cy - 112),
        (cx + 78, cy - 40),
        (cx - 78, cy - 40),
        (cx - 62, cy - 112),
    ]
    pygame.draw.polygon(target, (10, 35, 55), windshield)
    pygame.draw.lines(target, config.CYAN_BRIGHT, True, windshield, 2)

    # Glass Reflection Highlight Streak
    pygame.draw.line(target, (180, 245, 255), (cx - 40, cy - 110), (cx + 20, cy - 50), 3)

    roof_structure = [
        (cx - 80, cy - 25), (cx + 80, cy - 25),
        (cx + 84, cy + 45), (cx - 84, cy + 45),
    ]
    pygame.draw.polygon(target, dark_shade, roof_structure)
    pygame.draw.lines(target, (45, 110, 145), True, roof_structure, 2)

    # 6. LED Headlight Cluster & Volumetric Lenses
    pygame.draw.ellipse(target, config.CYAN_BRIGHT, Rect(cx - 88, cy + 102, 45, 18))
    pygame.draw.ellipse(target, config.WHITE, Rect(cx - 78, cy + 105, 25, 12))

    pygame.draw.ellipse(target, config.CYAN_BRIGHT, Rect(cx + 43, cy + 102, 45, 18))
    pygame.draw.ellipse(target, config.WHITE, Rect(cx + 53, cy + 105, 25, 12))

    # 7. Hardware Tonzo 3D Hologram Fan Mount Rig on Hood/Roof
    mount_base = Rect(cx - 70, cy - 195, 140, 30)
    pygame.draw.rect(target, (14, 40, 58), mount_base, border_radius=8)
    pygame.draw.rect(target, config.CYAN, mount_base, width=2, border_radius=8)

    # Motor Mounting Hub
    hub_rect = Rect(cx - 16, cy - 222, 32, 32)
    pygame.draw.rect(target, (28, 90, 120), hub_rect, border_radius=6)
    pygame.draw.rect(target, config.CYAN_BRIGHT, hub_rect, width=2, border_radius=6)


# ---------------------------------------------------------
# Testbed UI Helper Functions
# ---------------------------------------------------------

def draw_text(
    target: Surface, text: str, pos: tuple[int, int], font: pygame.font.Font, color: tuple[int, int, int]
) -> None:
    target.blit(font.render(text, True, color), pos)


def draw_panel(
    target: Surface, rect: Rect, fill: tuple[int, int, int], border: tuple[int, int, int], radius: int = 10
) -> None:
    pygame.draw.rect(target, fill, rect, border_radius=radius)
    pygame.draw.rect(target, border, rect, width=1, border_radius=radius)


# ---------------------------------------------------------
# Main Interactive Visual Testbed Application
# ---------------------------------------------------------

def main() -> None:
    pygame.init()
    pygame.display.set_caption("Visual Interactive Testbed - Hologram Simulation Project")
    screen = pygame.display.set_mode((config.WIDTH, config.HEIGHT))
    clock = pygame.time.Clock()

    # Create Engines
    vision = VisionEngine()
    voice = VoiceEngine()

    active_tab = 0  # 0: Car Studio, 1: Vision Studio, 2: Voice Studio, 3: Full Simulation
    tabs = ["CAR MODEL STUDIO", "OPENCV VISION STUDIO", "VOICE MIC/TTS STUDIO", "FULL SIMULATION"]

    tab_rects = [
        Rect(30 + i * 190, 20, 180, 36) for i in range(len(tabs))
    ]

    # Car Studio Custom Controls
    car_color_idx = 0
    car_colors = ["cyan", "chrome", "orange", "stealth"]
    headlights_on = True
    underglow_on = True

    # Telemetry Logs
    logs: List[str] = ["Testbed environment initialized successfully."]

    def add_log(msg: str) -> None:
        logs.append(f"[{time.strftime('%H:%M:%S')}] {msg}")
        if len(logs) > 8:
            logs.pop(0)

    add_log("Non-blocking vision & voice engines loaded.")

    # Topic rects for full simulation
    topic_rects = [
        (Rect(824, 360, 198, 36), "Admissions"),
        (Rect(1038, 360, 198, 36), "Departments"),
        (Rect(824, 406, 198, 36), "Student Projects"),
        (Rect(1038, 406, 198, 36), "Campus Tour"),
        (Rect(824, 452, 198, 36), "AI & Robotics"),
        (Rect(1038, 452, 198, 36), "Contact Us"),
    ]

    btn_visitor = Rect(824, 555, 198, 36)
    btn_camera  = Rect(1038, 555, 198, 36)
    btn_mic     = Rect(824, 600, 198, 36)
    btn_tts     = Rect(1038, 600, 198, 36)
    btn_power   = Rect(824, 645, 412, 36)

    # Studio Specific Buttons
    btn_car_color = Rect(50, 140, 220, 38)
    btn_car_lights = Rect(50, 190, 220, 38)
    btn_car_glow = Rect(50, 240, 220, 38)

    btn_vis_mode = Rect(50, 140, 220, 38)
    btn_vis_box = Rect(50, 190, 220, 38)
    btn_vis_cam = Rect(50, 240, 220, 38)

    btn_voc_mic = Rect(50, 140, 220, 38)
    btn_voc_speak = Rect(50, 190, 220, 38)
    btn_voc_mute = Rect(50, 240, 220, 38)

    visitor = None
    visitor_count = 0
    visitor_progress = 0.0
    active_topic = None
    display_active = True
    hologram_rotation = 0.0
    elapsed = 0.0
    message = "Welcome to the Visual Interactive Testbed."

    running = True

    while running:
        delta_time = clock.tick(config.FPS) / 1000.0
        elapsed += delta_time
        hologram_rotation += delta_time * 0.9

        opencv_surface = vision.get_pygame_surface(target_size=(320, 210))

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key in (pygame.K_1, pygame.K_2, pygame.K_3, pygame.K_4):
                    active_tab = event.key - pygame.K_1
                    add_log(f"Switched to {tabs[active_tab]}")

            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                pos = event.pos

                # Check Navigation Tabs
                for idx, t_rect in enumerate(tab_rects):
                    if t_rect.collidepoint(pos):
                        active_tab = idx
                        add_log(f"Switched to {tabs[active_tab]}")

                # Tab 0: Car Studio Controls
                if active_tab == 0:
                    if btn_car_color.collidepoint(pos):
                        car_color_idx = (car_color_idx + 1) % len(car_colors)
                        add_log(f"Car Color set to: {car_colors[car_color_idx].upper()}")
                    elif btn_car_lights.collidepoint(pos):
                        headlights_on = not headlights_on
                        add_log(f"Headlight Beams: {'ON' if headlights_on else 'OFF'}")
                    elif btn_car_glow.collidepoint(pos):
                        underglow_on = not underglow_on
                        add_log(f"Neon Underglow: {'ON' if underglow_on else 'OFF'}")

                # Tab 1: OpenCV Vision Studio Controls
                elif active_tab == 1:
                    if btn_vis_mode.collidepoint(pos):
                        msg = vision.cycle_mode()
                        add_log(msg)
                    elif btn_vis_box.collidepoint(pos):
                        state = vision.toggle_bounding_boxes()
                        add_log(f"Bounding Boxes: {'ENABLED' if state else 'DISABLED'}")
                    elif btn_vis_cam.collidepoint(pos):
                        msg = vision.toggle_camera()
                        add_log(msg)

                # Tab 2: Voice Studio Controls
                elif active_tab == 2:
                    if btn_voc_mic.collidepoint(pos):
                        def _on_mic(topic, text):
                            if topic:
                                add_log(f"Mic Success: Heard '{text}' -> Topic: {topic}")
                                voice.speak(config.TOPICS[topic])
                            else:
                                add_log(f"Mic Result: Heard '{text}' (No topic matched)")
                                voice.speak(f"I heard you say: {text}")

                        add_log("Microphone listening thread activated...")
                        voice.listen_in_background(callback=_on_mic)

                    elif btn_voc_speak.collidepoint(pos):
                        sample = "Testing non-blocking voice synthesis in testbed environment."
                        add_log(f"TTS Speech Test: '{sample}'")
                        voice.speak(sample)

                    elif btn_voc_mute.collidepoint(pos):
                        muted = voice.toggle_mute()
                        add_log(f"Voice Audio Muted: {muted}")

                # Tab 3: Full Simulation Controls
                elif active_tab == 3:
                    if btn_visitor.collidepoint(pos):
                        visitor_count += 1
                        visitor = True
                        message = f"Simulated visitor #{visitor_count} approach."
                        voice.speak(message)
                        add_log(message)
                    elif btn_camera.collidepoint(pos):
                        msg = vision.cycle_mode()
                        message = msg
                        add_log(msg)
                    elif btn_mic.collidepoint(pos):
                        def _on_sim_mic(topic, text):
                            nonlocal active_topic, message
                            if topic:
                                active_topic = topic
                                message = f"Voice Command: '{text}' -> {config.TOPICS[topic]}"
                                voice.speak(config.TOPICS[topic])
                                add_log(message)
                            else:
                                message = f"Heard: '{text}'"
                                voice.speak("I heard your voice, but couldn't match a topic.")

                        voice.listen_in_background(callback=_on_sim_mic)
                    elif btn_tts.collidepoint(pos):
                        muted = voice.toggle_mute()
                        message = "Voice Output Muted" if muted else "Voice Output Active"
                        add_log(message)
                    elif btn_power.collidepoint(pos):
                        display_active = not display_active
                        message = "Hologram Display ONLINE" if display_active else "Hologram Display OFFLINE"
                        voice.speak(message)
                        add_log(message)
                    else:
                        for rect, topic in topic_rects:
                            if rect.collidepoint(pos):
                                active_topic = topic
                                message = config.TOPICS[topic]
                                voice.speak(message)
                                add_log(f"Selected Topic: {topic}")

        # Render Main Testbed Canvas
        screen.fill(config.BG_TOP)

        # Draw Top Navigation Bar
        font_b = pygame.font.SysFont("dejavusans", 13, bold=True)
        font_s = pygame.font.SysFont("dejavusans", 11, bold=True)

        for idx, t_rect in enumerate(tab_rects):
            selected = idx == active_tab
            fill = (25, 95, 120) if selected else (14, 38, 55)
            border = config.CYAN if selected else (30, 75, 95)
            draw_panel(screen, t_rect, fill, border, radius=8)
            draw_text(screen, tabs[idx], (t_rect.x + 10, t_rect.y + 9), font_s, config.WHITE)

        # Render Current Studio Content
        if active_tab == 0:
            # Car Model Studio
            draw_panel(screen, Rect(30, 75, 260, 480), config.PANEL, (30, 80, 105))
            draw_text(screen, "CAR STUDIO CONTROLS", (45, 95), font_b, config.CYAN)

            draw_panel(screen, btn_car_color, (20, 60, 80), config.CYAN, 8)
            draw_text(screen, f"COLOR: {car_colors[car_color_idx].upper()}", (btn_car_color.x + 15, btn_car_color.y + 10), font_b, config.WHITE)

            draw_panel(screen, btn_car_lights, (20, 60, 80), config.CYAN, 8)
            draw_text(screen, f"BEAMS: {'ON' if headlights_on else 'OFF'}", (btn_car_lights.x + 15, btn_car_lights.y + 10), font_b, config.WHITE)

            draw_panel(screen, btn_car_glow, (20, 60, 80), config.CYAN, 8)
            draw_text(screen, f"UNDERGLOW: {'ON' if underglow_on else 'OFF'}", (btn_car_glow.x + 15, btn_car_glow.y + 10), font_b, config.WHITE)

            # Viewport Render
            viewport = Rect(310, 75, 940, 480)
            draw_panel(screen, viewport, (6, 18, 28), (30, 80, 105))

            draw_sleek_car(
                screen, (780, 310), elapsed,
                headlights_on=headlights_on,
                underglow_on=underglow_on,
                body_color_theme=car_colors[car_color_idx]
            )

        elif active_tab == 1:
            # OpenCV Vision Studio
            draw_panel(screen, Rect(30, 75, 260, 480), config.PANEL, (30, 80, 105))
            draw_text(screen, "VISION CONTROLS", (45, 95), font_b, config.CYAN)

            draw_panel(screen, btn_vis_mode, (20, 60, 80), config.CYAN, 8)
            draw_text(screen, f"MODE: {vision.mode.upper()}", (btn_vis_mode.x + 15, btn_vis_mode.y + 10), font_b, config.WHITE)

            draw_panel(screen, btn_vis_box, (20, 60, 80), config.CYAN, 8)
            draw_text(screen, f"BOXES: {'ON' if vision.draw_boxes else 'OFF'}", (btn_vis_box.x + 15, btn_vis_box.y + 10), font_b, config.WHITE)

            draw_panel(screen, btn_vis_cam, (20, 60, 80), config.CYAN, 8)
            draw_text(screen, f"STREAM: {'WEBCAM' if vision.is_camera_active else 'SYNTH'}", (btn_vis_cam.x + 15, btn_vis_cam.y + 10), font_b, config.WHITE)

            # Large OpenCV Video Window
            viewport = Rect(310, 75, 940, 480)
            draw_panel(screen, viewport, (0, 0, 0), config.CYAN)

            large_opencv = vision.get_pygame_surface(target_size=(940, 480))
            screen.blit(large_opencv, (310, 75))

        elif active_tab == 2:
            # Voice Mic / TTS Studio
            draw_panel(screen, Rect(30, 75, 260, 480), config.PANEL, (30, 80, 105))
            draw_text(screen, "VOICE CONTROLS", (45, 95), font_b, config.CYAN)

            draw_panel(screen, btn_voc_mic, (85, 55, 20), config.ORANGE, 8)
            draw_text(screen, "TEST MIC SPEECH [M]", (btn_voc_mic.x + 15, btn_voc_mic.y + 10), font_b, config.WHITE)

            draw_panel(screen, btn_voc_speak, (20, 60, 80), config.CYAN, 8)
            draw_text(screen, "TEST TTS SPEECH", (btn_voc_speak.x + 15, btn_voc_speak.y + 10), font_b, config.WHITE)

            draw_panel(screen, btn_voc_mute, (20, 60, 80), config.CYAN, 8)
            draw_text(screen, f"MUTE: {'ON' if voice.muted else 'OFF'}", (btn_voc_mute.x + 15, btn_voc_mute.y + 10), font_b, config.WHITE)

            # Voice Status Card
            viewport = Rect(310, 75, 940, 480)
            draw_panel(screen, viewport, config.DARK_CARD, (30, 80, 105))

            draw_text(screen, "VOICE ENGINE TELEMETRY", (340, 105), font_b, config.CYAN)
            draw_text(screen, f"Engine Status: {voice.status_message}", (340, 145), font_b, config.WHITE)
            draw_text(screen, f"Is Speaking: {voice.is_speaking}", (340, 180), font_b, config.GREEN if voice.is_speaking else config.MUTED)
            draw_text(screen, f"Is Listening: {voice.is_listening}", (340, 215), font_b, config.ORANGE if voice.is_listening else config.MUTED)
            draw_text(screen, f"Last Spoken Text: {voice.last_spoken_text}", (340, 250), font_b, config.WHITE)
            draw_text(screen, f"Last Heard Voice Prompt: {voice.last_heard_text}", (340, 285), font_b, config.WHITE)

        elif active_tab == 3:
            # Full Simulation Studio
            draw_panel(screen, Rect(30, 75, 750, 480), config.PANEL, (30, 80, 105))
            draw_sleek_car(screen, (400, 310), elapsed, headlights_on=True, underglow_on=True, body_color_theme="cyan")

            pip = vision.get_pygame_surface(target_size=(220, 140))
            screen.blit(pip, (45, 90))
            pygame.draw.rect(screen, config.CYAN, Rect(45, 90, 220, 140), width=1)

            # Dashboard
            panel = Rect(800, 75, 450, 480)
            draw_panel(screen, panel, config.PANEL, (31, 83, 105), 14)
            draw_text(screen, "SIMULATION DASHBOARD", (820, 90), font_b, config.WHITE)
            draw_text(screen, message, (820, 120), font_s, config.CYAN)

            for rect, topic in topic_rects:
                # Adjust Y offset for tab height
                adj_rect = Rect(rect.x, rect.y - 180, rect.width, rect.height)
                draw_panel(screen, adj_rect, (15, 43, 58), (33, 88, 108), 8)
                draw_text(screen, topic, (adj_rect.x + 10, adj_rect.y + 8), font_s, config.WHITE)

        # Draw Bottom Diagnostic Log Bar
        log_bar = Rect(30, 570, 1220, 160)
        draw_panel(screen, log_bar, (8, 16, 26), (25, 75, 95), radius=10)
        draw_text(screen, f"DIAGNOSTIC EVENT CONSOLE | FPS: {clock.get_fps():.1f}", (45, 582), font_s, config.CYAN)

        log_y = 605
        for l_msg in logs[-6:]:
            draw_text(screen, l_msg, (45, log_y), font_s, config.WHITE)
            log_y += 20

        pygame.display.flip()

    vision.release()
    voice.close()
    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
