"""
Hologram Car Prototype & Autonomous Campus Guide Simulation.
Integrates 3D hologram fan visualization, sleek modern vehicle graphics,
live OpenCV object detection PIP preview, non-blocking Voice interaction (TTS/Mic),
and complete control options.
"""

from __future__ import annotations

import math
import sys
import time
from dataclasses import dataclass
from typing import Optional, List, Tuple

import pygame
from pygame import Rect, Surface, Vector2

import config
from vision_engine import VisionEngine
from voice_engine import VoiceEngine
from testbed_environment import draw_sleek_car


@dataclass
class Visitor:
    number: int
    name: str


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def lerp_color(
    first: tuple[int, int, int], second: tuple[int, int, int], amount: float
) -> tuple[int, int, int]:
    amount = clamp(amount, 0.0, 1.0)
    return tuple(
        int(first[index] + (second[index] - first[index]) * amount)
        for index in range(3)
    )


def make_background() -> Surface:
    background = Surface((config.WIDTH, config.HEIGHT))
    for y in range(config.HEIGHT):
        amount = y / config.HEIGHT
        color = lerp_color(config.BG_TOP, config.BG_BOTTOM, amount)
        pygame.draw.line(background, color, (0, y), (config.WIDTH, y))
    return background


def draw_text(
    target: Surface,
    text: str,
    position: tuple[int, int],
    font: pygame.font.Font,
    color: tuple[int, int, int] = config.WHITE,
) -> None:
    target.blit(font.render(text, True, color), position)


def wrap_text(
    text: str,
    font: pygame.font.Font,
    max_width: int,
) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        current = ""
        for word in words:
            test = word if not current else f"{current} {word}"
            if font.size(test)[0] <= max_width:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def draw_wrapped_text(
    target: Surface,
    text: str,
    position: tuple[int, int],
    font: pygame.font.Font,
    color: tuple[int, int, int],
    max_width: int,
    line_spacing: int = 5,
) -> int:
    x, y = position
    lines = wrap_text(text, font, max_width)
    for line in lines:
        draw_text(target, line, (x, y), font, color)
        y += font.get_height() + line_spacing
    return y


def draw_panel(
    target: Surface,
    rectangle: Rect,
    fill: tuple[int, int, int],
    border: tuple[int, int, int],
    radius: int = 14,
) -> None:
    pygame.draw.rect(target, fill, rectangle, border_radius=radius)
    pygame.draw.rect(target, border, rectangle, width=1, border_radius=radius)


def draw_ground(target: Surface) -> None:
    ground = Rect(25, 120, 750, 610)
    pygame.draw.rect(target, (7, 21, 32), ground, border_radius=20)

    for y in range(260, 730, 36):
        pygame.draw.line(target, (15, 48, 65), (35, y), (765, y), 1)

    for x in range(-800, 1500, 70):
        pygame.draw.line(target, (13, 43, 60), (390, 250), (x, 730), 1)

    pygame.draw.rect(target, (25, 81, 104), ground, width=1, border_radius=20)


def draw_visitor(
    target: Surface, visitor: Optional[Visitor], progress: float
) -> None:
    if visitor is None:
        return

    x = int(90 + progress * 115)
    y = 575

    pygame.draw.ellipse(target, (2, 8, 13), Rect(x - 35, y + 48, 70, 16))
    pygame.draw.circle(target, (230, 174, 130), (x, y - 76), 18)
    pygame.draw.arc(
        target, (70, 42, 34), Rect(x - 18, y - 94, 36, 34), math.pi, math.pi * 2, 5
    )

    body = [(x - 27, y - 53), (x + 27, y - 53), (x + 38, y + 30), (x - 38, y + 30)]
    pygame.draw.polygon(target, (220, 104, 70), body)

    pygame.draw.line(target, (55, 89, 112), (x - 12, y + 30), (x - 22, y + 65), 8)
    pygame.draw.line(target, (55, 89, 112), (x + 12, y + 30), (x + 22, y + 65), 8)

    label = f"VISITOR {visitor.number}"
    font = pygame.font.SysFont("dejavusans", 12, bold=True)
    draw_text(target, label, (x - 36, y + 79), font, config.ORANGE)


def project_3d(
    point: tuple[float, float, float],
    angle: float,
    origin: tuple[float, float],
    scale: float,
) -> Vector2:
    x, y, z = point
    cosine = math.cos(angle)
    sine = math.sin(angle)
    rotated_x = x * cosine - z * sine
    rotated_z = x * sine + z * cosine
    perspective = 1.0 / (1.0 + rotated_z * 0.18)
    return Vector2(
        origin[0] + rotated_x * scale * perspective,
        origin[1] - y * scale * perspective,
    )


def cube_vertices(center: tuple[float, float, float], size: tuple[float, float, float]):
    cx, cy, cz = center
    w, h, d = size
    return [
        (cx - w / 2, cy - h / 2, cz - d / 2), (cx + w / 2, cy - h / 2, cz - d / 2),
        (cx + w / 2, cy + h / 2, cz - d / 2), (cx - w / 2, cy + h / 2, cz - d / 2),
        (cx - w / 2, cy - h / 2, cz + d / 2), (cx + w / 2, cy - h / 2, cz + d / 2),
        (cx + w / 2, cy + h / 2, cz + d / 2), (cx - w / 2, cy + h / 2, cz + d / 2),
    ]


def robot_geometry():
    segments = []
    joints = []
    head = cube_vertices((0.0, 1.28, 0.0), (0.62, 0.52, 0.48))
    edges = [(0, 1), (1, 2), (2, 3), (3, 0), (4, 5), (5, 6), (6, 7), (7, 4), (0, 4), (1, 5), (2, 6), (3, 7)]
    segments.extend([(head[f], head[s]) for f, s in edges])

    segments.extend([
        ((0.0, 1.02, 0.0), (0.0, 0.86, 0.0)), ((-0.31, 0.87, 0.0), (0.31, 0.87, 0.0)),
        ((-0.31, 0.87, 0.0), (-0.25, 0.20, 0.0)), ((0.31, 0.87, 0.0), (0.25, 0.20, 0.0)),
        ((-0.25, 0.20, 0.0), (0.25, 0.20, 0.0)),
    ])
    segments.extend([
        ((-0.31, 0.84, 0.0), (-0.58, 0.48, 0.02)), ((-0.58, 0.48, 0.02), (-0.63, 0.12, 0.02)),
        ((0.31, 0.84, 0.0), (0.58, 0.48, 0.02)), ((0.58, 0.48, 0.02), (0.63, 0.12, 0.02)),
    ])
    segments.extend([
        ((-0.20, 0.20, 0.0), (-0.28, -0.35, 0.0)), ((-0.28, -0.35, 0.0), (-0.37, -0.70, 0.02)),
        ((0.20, 0.20, 0.0), (0.28, -0.35, 0.0)), ((0.28, -0.35, 0.0), (0.37, -0.70, 0.02)),
    ])

    joints.extend([
        (0.0, 1.72, 0.0), (-0.31, 0.87, 0.0), (0.31, 0.87, 0.0),
        (-0.63, 0.12, 0.02), (0.63, 0.12, 0.02),
    ])
    return segments, joints


def draw_hologram(
    target: Surface,
    display_center: tuple[int, int],
    rotation: float,
    active: bool,
    time_value: float,
) -> None:
    if not active:
        pygame.draw.circle(target, (37, 67, 78), display_center, 38, 2)
        font = pygame.font.SysFont("dejavusans", 12, bold=True)
        draw_text(target, "HOLOGRAM OFF", (display_center[0] - 45, display_center[1] - 8), font, config.MUTED)
        return

    center = Vector2(display_center)
    bob = math.sin(time_value * 2.0) * 4
    robot_origin = (center.x, 196 + bob)

    beam = Surface(target.get_size(), pygame.SRCALPHA)
    beam_polygon = [
        (center.x - 76, center.y - 5), (center.x + 76, center.y - 5),
        (center.x + 47, 125 + bob), (center.x - 47, 125 + bob),
    ]
    pygame.draw.polygon(beam, (*config.CYAN, 15), beam_polygon)
    target.blit(beam, (0, 0))

    fan_surface = Surface(target.get_size(), pygame.SRCALPHA)
    fan_rotation = time_value * 3.5
    for i in range(4):
        angle = fan_rotation + i * math.pi / 2
        pa = center
        pb = center + Vector2(math.cos(angle) * 51, math.sin(angle) * 18)
        pc = center + Vector2(math.cos(angle + 0.42) * 43, math.sin(angle + 0.42) * 16)
        pygame.draw.polygon(fan_surface, (*config.CYAN_BRIGHT, 75), [pa, pb, pc])
    target.blit(fan_surface, (0, 0))

    segments, joints = robot_geometry()
    p_segments = [
        (project_3d(f, rotation, robot_origin, 105), project_3d(s, rotation, robot_origin, 105))
        for f, s in segments
    ]
    p_joints = [project_3d(pt, rotation, robot_origin, 105) for pt in joints]

    glow = Surface(target.get_size(), pygame.SRCALPHA)
    for f, s in p_segments:
        pygame.draw.line(glow, (*config.CYAN, 48), f, s, 9)
    target.blit(glow, (0, 0))

    for f, s in p_segments:
        pygame.draw.line(target, config.CYAN_BRIGHT, f, s, 2)
    for pt in p_joints:
        pygame.draw.circle(target, config.CYAN_BRIGHT, (int(pt.x), int(pt.y)), 4)

    font = pygame.font.SysFont("dejavusans", 12, bold=True)
    draw_text(target, "HOLOGRAM GUIDE ACTIVE", (center.x - 70, 94), font, config.CYAN_BRIGHT)


def draw_header(target: Surface) -> None:
    title_font = pygame.font.SysFont("dejavusans", 24, bold=True)
    small_font = pygame.font.SysFont("dejavusans", 12, bold=True)

    draw_text(target, config.COLLEGE_NAME.upper(), (35, 25), title_font, config.WHITE)
    draw_text(target, "HOLOGRAM CAR SIMULATION & VISION/VOICE TESTBED", (37, 56), small_font, config.CYAN)

    badge = Rect(610, 30, 160, 28)
    draw_panel(target, badge, (13, 44, 52), (35, 125, 139), 10)
    draw_text(target, "OPENCV & VOICE ON", (623, 38), small_font, config.GREEN)


def draw_dashboard(
    target: Surface,
    visitor: Optional[Visitor],
    message: str,
    display_active: bool,
    active_topic: Optional[str],
    topic_rects: list[tuple[Rect, str]],
    vision: VisionEngine,
    voice: VoiceEngine,
    btn_visitor: Rect,
    btn_camera: Rect,
    btn_mic: Rect,
    btn_tts: Rect,
    btn_power: Rect,
) -> None:
    panel = Rect(800, 20, 460, 720)
    draw_panel(target, panel, config.PANEL, (31, 83, 105), 18)

    title_font = pygame.font.SysFont("dejavusans", 21, bold=True)
    heading_font = pygame.font.SysFont("dejavusans", 13, bold=True)
    body_font = pygame.font.SysFont("dejavusans", 13)
    small_font = pygame.font.SysFont("dejavusans", 11, bold=True)

    draw_text(target, "CONTROL DASHBOARD", (824, 38), title_font, config.WHITE)

    cam_color = config.GREEN if vision.is_camera_active else config.ORANGE
    cam_text = "WEBCAM" if vision.is_camera_active else "SYNTHETIC"
    draw_text(target, f"CAM: {cam_text}", (1140, 42), small_font, cam_color)

    v_card = Rect(824, 75, 412, 70)
    draw_panel(target, v_card, config.PANEL_LIGHT, (25, 84, 107), 10)
    draw_text(target, "ACTIVE VISITOR STATUS", (838, 85), small_font, config.MUTED)
    if visitor:
        draw_text(target, f"{visitor.name} (Visitor #{visitor.number})", (838, 107), heading_font, config.WHITE)
        draw_text(target, "Approaching hologram vehicle...", (838, 126), small_font, config.ORANGE)
    else:
        draw_text(target, "No Visitor Detected (Waiting for OpenCV or V Key)", (838, 110), heading_font, config.WHITE)

    msg_box = Rect(824, 155, 412, 145)
    draw_panel(target, msg_box, config.DARK_CARD, (22, 74, 96), 10)

    draw_text(target, "HOLOGRAM SPEECH RESPONSE", (838, 168), small_font, config.CYAN)
    if voice.is_speaking:
        draw_text(target, "[SPEAKING...]", (1140, 168), small_font, config.GREEN)
    elif voice.is_listening:
        draw_text(target, "[LISTENING...]", (1140, 168), small_font, config.ORANGE)

    draw_wrapped_text(target, message, (838, 195), body_font, config.WHITE, 380, 5)

    draw_text(target, f"Voice Engine: {voice.status_message}", (824, 310), small_font, config.MUTED)

    draw_text(target, "INTERACTIVE TOPICS & Q&A", (824, 335), heading_font, config.WHITE)
    for rect, topic in topic_rects:
        selected = topic == active_topic
        fill = (20, 80, 98) if selected else (15, 43, 58)
        border = config.CYAN if selected else (33, 88, 108)
        draw_panel(target, rect, fill, border, 8)
        draw_text(
            target, topic, (rect.x + 10, rect.y + 8), body_font,
            config.CYAN_BRIGHT if selected else config.WHITE
        )

    draw_text(target, "VISION & VOICE CONTROLS", (824, 525), heading_font, config.WHITE)

    draw_panel(target, btn_visitor, (19, 86, 81), (67, 218, 163), 8)
    draw_text(target, "VISITOR [V]", (btn_visitor.x + 12, btn_visitor.y + 8), body_font, config.WHITE)

    draw_panel(target, btn_camera, (25, 60, 85), config.CYAN, 8)
    draw_text(target, f"CAM MODE [C]", (btn_camera.x + 12, btn_camera.y + 8), body_font, config.WHITE)

    draw_panel(target, btn_mic, (85, 55, 20), config.ORANGE, 8)
    draw_text(target, "LISTEN MIC [M]", (btn_mic.x + 12, btn_mic.y + 8), body_font, config.WHITE)

    tts_fill = (20, 70, 50) if not voice.muted else (70, 30, 30)
    draw_panel(target, btn_tts, tts_fill, config.CYAN, 8)
    tts_lbl = "TTS: ON [T]" if not voice.muted else "TTS: MUTED [T]"
    draw_text(target, tts_lbl, (btn_tts.x + 12, btn_tts.y + 8), body_font, config.WHITE)

    pwr_fill = (83, 49, 45) if display_active else (41, 53, 62)
    draw_panel(target, btn_power, pwr_fill, config.ORANGE, 8)
    pwr_lbl = "DISPLAY OFF [H]" if display_active else "DISPLAY ON [H]"
    draw_text(target, pwr_lbl, (btn_power.x + 12, btn_power.y + 8), body_font, config.WHITE)

    footer_y = 690
    draw_text(
        target,
        "Hotkeys: 1-6 Topics | V Visitor | C Cam Mode | M Mic | T Mute | H Power | R Reset",
        (824, footer_y), small_font, config.MUTED
    )


def main() -> None:
    pygame.init()
    pygame.display.set_caption("DSA College - Hologram Car Simulation & Testbed")
    screen = pygame.display.set_mode((config.WIDTH, config.HEIGHT))
    clock = pygame.time.Clock()
    background = make_background()

    vision = VisionEngine()
    voice = VoiceEngine()

    welcome_msg = (
        f"Welcome to {config.COLLEGE_NAME} Hologram Guide. "
        "OpenCV object detection and Voice engines are online. "
        "Press V to simulate a visitor, select a topic, or press M to speak."
    )
    voice.speak(welcome_msg)

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

    visitor: Optional[Visitor] = None
    visitor_count = 0
    visitor_progress = 0.0
    active_topic: Optional[str] = None
    display_active = True
    hologram_rotation = 0.0
    elapsed = 0.0
    message = welcome_msg
    last_auto_trigger = 0.0

    running = True

    while running:
        delta_time = clock.tick(config.FPS) / 1000.0
        elapsed += delta_time
        hologram_rotation += delta_time * 0.9

        opencv_surface = vision.get_pygame_surface(target_size=(240, 160))

        if config.AUTO_TRIGGER_VISITOR and vision.target_detected:
            if time.time() - last_auto_trigger > 6.0 and visitor is None:
                last_auto_trigger = time.time()
                visitor_count += 1
                visitor = Visitor(
                    visitor_count,
                    config.VISITOR_NAMES[(visitor_count - 1) % len(config.VISITOR_NAMES)],
                )
                visitor_progress = 0.0
                active_topic = None
                message = (
                    f"OpenCV detected a visitor! Welcome, {visitor.name}. "
                    "Please select a topic or speak into the microphone."
                )
                voice.speak(message)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False

                elif event.key == pygame.K_v:
                    visitor_count += 1
                    visitor = Visitor(
                        visitor_count,
                        config.VISITOR_NAMES[(visitor_count - 1) % len(config.VISITOR_NAMES)],
                    )
                    visitor_progress = 0.0
                    active_topic = None
                    message = f"Welcome, {visitor.name}. Select a topic or press M to speak."
                    voice.speak(message)

                elif event.key == pygame.K_c:
                    msg = vision.cycle_mode()
                    message = msg
                    voice.speak(msg)

                elif event.key == pygame.K_m:
                    def _on_mic_input(topic: Optional[str], phrase: str):
                        nonlocal visitor, visitor_count, visitor_progress, active_topic, message
                        if topic:
                            if visitor is None:
                                visitor_count += 1
                                visitor = Visitor(visitor_count, config.VISITOR_NAMES[0])
                                visitor_progress = 0.0
                            active_topic = topic
                            message = f"Voice Request: '{phrase}' -> {config.TOPICS[topic]}"
                            voice.speak(config.TOPICS[topic])
                        else:
                            message = f"Heard: '{phrase}'. Could not match topic keyword."
                            voice.speak("I heard your voice, but couldn't match a topic.")

                    message = "Listening for microphone speech command..."
                    voice.listen_in_background(callback=_on_mic_input)

                elif event.key == pygame.K_t:
                    muted = voice.toggle_mute()
                    message = "Voice Output Muted" if muted else "Voice Output Active"

                elif event.key == pygame.K_h:
                    display_active = not display_active
                    message = "Hologram Display ONLINE" if display_active else "Hologram Display OFFLINE"
                    voice.speak(message)

                elif event.key == pygame.K_r:
                    visitor = None
                    visitor_progress = 0.0
                    active_topic = None
                    message = "System Reset complete."
                    voice.speak(message)

                elif event.key in (pygame.K_1, pygame.K_2, pygame.K_3, pygame.K_4, pygame.K_5, pygame.K_6):
                    idx = {
                        pygame.K_1: 0, pygame.K_2: 1, pygame.K_3: 2,
                        pygame.K_4: 3, pygame.K_5: 4, pygame.K_6: 5
                    }[event.key]
                    topic = topic_rects[idx][1]
                    if visitor is None:
                        visitor_count += 1
                        visitor = Visitor(visitor_count, config.VISITOR_NAMES[0])
                        visitor_progress = 0.0
                    active_topic = topic
                    message = config.TOPICS[topic]
                    voice.speak(message)

            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                pos = event.pos
                if btn_visitor.collidepoint(pos):
                    visitor_count += 1
                    visitor = Visitor(
                        visitor_count,
                        config.VISITOR_NAMES[(visitor_count - 1) % len(config.VISITOR_NAMES)],
                    )
                    visitor_progress = 0.0
                    active_topic = None
                    message = f"Welcome, {visitor.name}. Select a topic or speak."
                    voice.speak(message)

                elif btn_camera.collidepoint(pos):
                    msg = vision.cycle_mode()
                    message = msg
                    voice.speak(msg)

                elif btn_mic.collidepoint(pos):
                    def _on_mic_input(topic: Optional[str], phrase: str):
                        nonlocal visitor, visitor_count, visitor_progress, active_topic, message
                        if topic:
                            if visitor is None:
                                visitor_count += 1
                                visitor = Visitor(visitor_count, config.VISITOR_NAMES[0])
                                visitor_progress = 0.0
                            active_topic = topic
                            message = f"Voice Request: '{phrase}' -> {config.TOPICS[topic]}"
                            voice.speak(config.TOPICS[topic])
                        else:
                            message = f"Heard: '{phrase}'. No matching topic found."
                            voice.speak("I heard your voice, but couldn't match a topic.")

                    message = "Listening for microphone speech command..."
                    voice.listen_in_background(callback=_on_mic_input)

                elif btn_tts.collidepoint(pos):
                    muted = voice.toggle_mute()
                    message = "Voice Output Muted" if muted else "Voice Output Active"

                elif btn_power.collidepoint(pos):
                    display_active = not display_active
                    message = "Hologram Display ONLINE" if display_active else "Hologram Display OFFLINE"
                    voice.speak(message)

                else:
                    for rect, topic in topic_rects:
                        if rect.collidepoint(pos):
                            if visitor is None:
                                visitor_count += 1
                                visitor = Visitor(visitor_count, config.VISITOR_NAMES[0])
                                visitor_progress = 0.0
                            active_topic = topic
                            message = config.TOPICS[topic]
                            voice.speak(message)

        if visitor is not None:
            visitor_progress = min(1.0, visitor_progress + delta_time * 0.32)

        screen.blit(background, (0, 0))

        draw_header(screen)
        draw_ground(screen)

        pip_rect = Rect(40, 140, 240, 160)
        draw_panel(screen, pip_rect, (0, 0, 0), config.CYAN, radius=10)
        screen.blit(opencv_surface, (40, 140))

        pip_font = pygame.font.SysFont("dejavusans", 11, bold=True)
        draw_text(screen, "LIVE OPENCV CAMERA PIP", (48, 146), pip_font, config.CYAN_BRIGHT)

        draw_visitor(screen, visitor, visitor_progress)

        # Draw Sleek Autonomous Car Rendering
        draw_sleek_car(screen, (390, 440), elapsed, headlights_on=True, underglow_on=True, body_color_theme="cyan")

        draw_hologram(
            screen,
            display_center=(390, 271),
            rotation=hologram_rotation,
            active=display_active,
            time_value=elapsed,
        )

        draw_dashboard(
            screen,
            visitor,
            message,
            display_active,
            active_topic,
            topic_rects,
            vision,
            voice,
            btn_visitor,
            btn_camera,
            btn_mic,
            btn_tts,
            btn_power,
        )

        pygame.display.flip()

    vision.release()
    voice.close()
    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()