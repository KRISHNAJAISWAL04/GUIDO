"""
Central Configuration for Hologram Car Simulation & Testing Environment.
Provides full control over window settings, vision parameters, voice parameters,
college data, and simulation behavior.
"""

# Window & Display Settings
WIDTH = 1280
HEIGHT = 760
FPS = 60

COLLEGE_NAME = "RBMI Group of Institutions"
DISPLAY_NAME = "Autonomous Hologram Guide"

# Color Palette (Futuristic Dark UI Theme)
BG_TOP = (5, 12, 24)
BG_BOTTOM = (10, 33, 48)
CYAN = (72, 230, 255)
CYAN_BRIGHT = (150, 250, 255)
BLUE = (36, 116, 190)
WHITE = (235, 248, 255)
MUTED = (135, 165, 180)
PANEL = (12, 26, 40)
PANEL_LIGHT = (18, 42, 59)
GREEN = (80, 235, 165)
ORANGE = (255, 178, 80)
RED = (255, 95, 105)
DARK_CARD = (7, 21, 33)

# College Q&A Topics
TOPICS = {
    "Admissions": (
        "Welcome to RBMI Group of Institutions. Admissions are open for engineering, management, and technology. "
        "Eligibility requires 60% aggregate with Mathematics and Science."
    ),
    "Student Cell": (
        "The Student Cell at RBMI assists students with scholarships, student welfare, "
        "hostel allocations, academic counseling, and extracurricular initiatives."
    ),
    "Departments": (
        "We offer Computer Science, AI & Data Science, Robotics, Mechanical, "
        "and Electrical Engineering with state-of-the-art research centers."
    ),
    "Student Projects": (
        "Students actively build autonomous vehicles, 3D hologram guides, "
        "drones, renewable energy grids, and deep learning vision systems."
    ),
    "Campus Tour": (
        "Our 50-acre campus features smart classrooms, high-performance computing labs, "
        "innovation hubs, sports complexes, and a modern cafeteria."
    ),
    "AI & Robotics": (
        "The AI & Robotics Center is equipped with GPU clusters, ROS manipulators, "
        "OpenCV vision rigs, and autonomous mobile robot prototyping kits."
    ),
    "Campus Distance": (
        "The campus buildings are situated 90 meters apart from each other in a quadrant grid, "
        "interconnected by paved 10m boulevards, diagonal avenues, and perimeter ring roads."
    ),
    "Contact Us": (
        "Reach out at reception@rbmi.in or call +91-98765-43210. "
        "Scan the QR code on the dashboard for map directions."
    ),
}

VISITOR_NAMES = [
    "Aarav", "Maya", "Daniel", "Sofia",
    "Rahul", "Emily", "Arjun", "Noah",
]

# OpenCV Vision Engine Settings
CAMERA_INDEX = 0
DETECTION_MODES = ["face", "motion", "synthetic"]
DEFAULT_DETECTION_MODE = "face"
DRAW_BOUNDING_BOXES = True
AUTO_TRIGGER_VISITOR = True
MIN_FACE_SIZE = (30, 30)
SCALE_FACTOR = 1.1
MIN_NEIGHBORS = 5

# Voice Engine Settings
TTS_ENABLED = True
TTS_RATE = 160  # Words per minute
TTS_VOLUME = 1.0  # 0.0 to 1.0
MIC_ENABLED = True
MIC_TIMEOUT = 4.0

VOICE_KEYWORDS = {
    "admission": "Admissions",
    "apply": "Admissions",
    "admissions": "Admissions",
    "admission hub": "Admissions",
    "admissions hub": "Admissions",
    "take admission": "Admissions",
    "want admission": "Admissions",
    "take to admission": "Admissions",
    "admission center": "Admissions",
    "i want to take admission": "Admissions",
    "student cell": "Student Cell",
    "students cell": "Student Cell",
    "student welfare": "Student Cell",
    "scholarship": "Student Cell",
    "scholarships": "Student Cell",
    "welfare": "Student Cell",
    "department": "Departments",
    "departments": "Departments",
    "course": "Departments",
    "courses": "Departments",
    "project": "Student Projects",
    "projects": "Student Projects",
    "tour": "Campus Tour",
    "campus": "Campus Tour",
    "ai": "AI & Robotics",
    "robot": "AI & Robotics",
    "robotics": "AI & Robotics",
    "contact": "Contact Us",
    "phone": "Contact Us",
    "email": "Contact Us",
    "reception": "Contact Us",
    "distance": "Campus Distance",
    "distance between buildings": "Campus Distance",
    "how far": "Campus Distance",
}
