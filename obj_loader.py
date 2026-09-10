"""
OBJ 3D Model Loader & Procedural Mesh Generator.
Parses Wavefront .obj 3D model files exported from Blender,
and generates procedural 3D meshes for the autonomous vehicle,
wheels, hologram fan hardware, and guide avatar.
"""

from __future__ import annotations

import os
import math
from dataclasses import dataclass, field
from typing import List, Tuple, Optional


@dataclass
class Face3D:
    vertex_indices: List[int]
    normal_index: Optional[int] = None
    color: Tuple[int, int, int] = (150, 180, 210)


@dataclass
class Mesh3D:
    name: str
    vertices: List[Tuple[float, float, float]] = field(default_factory=list)
    normals: List[Tuple[float, float, float]] = field(default_factory=list)
    faces: List[Face3D] = field(default_factory=list)

    def translate(self, dx: float, dy: float, dz: float) -> None:
        self.vertices = [(x + dx, y + dy, z + dz) for x, y, z in self.vertices]

    def scale(self, sx: float, sy: float, sz: float) -> None:
        self.vertices = [(x * sx, y * sy, z * sz) for x, y, z in self.vertices]


class OBJLoader:
    @staticmethod
    def load_file(file_path: str) -> Optional[Mesh3D]:
        """Parse a Wavefront .obj file into a Mesh3D object."""
        if not os.path.exists(file_path):
            return None

        mesh = Mesh3D(name=os.path.basename(file_path))
        try:
            with open(file_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split()
                    if parts[0] == "v":
                        mesh.vertices.append(
                            (float(parts[1]), float(parts[2]), float(parts[3]))
                        )
                    elif parts[0] == "vn":
                        mesh.normals.append(
                            (float(parts[1]), float(parts[2]), float(parts[3]))
                        )
                    elif parts[0] == "f":
                        v_idx = []
                        for p in parts[1:]:
                            idx_str = p.split("/")[0]
                            v_idx.append(int(idx_str) - 1)
                        mesh.faces.append(Face3D(vertex_indices=v_idx))
            return mesh
        except Exception as e:
            print(f"Error loading OBJ file {file_path}: {e}")
            return None

    @staticmethod
    def generate_car_mesh() -> Mesh3D:
        """Generate a procedural 3D autonomous vehicle mesh."""
        mesh = Mesh3D(name="Autonomous_Car")

        # 3D Chassis Vertices
        v = [
            # Front Bumper / Nose (0-3)
            (-1.2, -0.4, 2.2), (1.2, -0.4, 2.2), (1.0, 0.4, 2.0), (-1.0, 0.4, 2.0),
            # Windshield Base (4-7)
            (-1.3, 0.5, 0.8), (1.3, 0.5, 0.8), (1.4, -0.5, 0.8), (-1.4, -0.5, 0.8),
            # Roof Structure (8-11)
            (-0.9, 1.2, -0.6), (0.9, 1.2, -0.6), (1.1, 1.2, 0.4), (-1.1, 1.2, 0.4),
            # Rear Bumper / Tail (12-15)
            (-1.3, -0.4, -2.2), (1.3, -0.4, -2.2), (1.2, 0.5, -2.0), (-1.2, 0.5, -2.0),
        ]
        mesh.vertices = v

        # Quads/Triangles for 3D Car Body Surfaces
        cyan_mat = (20, 140, 190)
        glass_mat = (80, 200, 240)
        roof_mat = (15, 40, 65)

        faces = [
            # Hood Front
            Face3D([0, 1, 2, 3], color=cyan_mat),
            # Front Windshield Glass
            Face3D([3, 2, 10, 11], color=glass_mat),
            # Roof Top
            Face3D([11, 10, 9, 8], color=roof_mat),
            # Rear Window
            Face3D([8, 9, 14, 15], color=glass_mat),
            # Left Side Fender / Door
            Face3D([0, 3, 11, 8, 15, 12, 7, 4], color=cyan_mat),
            # Right Side Fender / Door
            Face3D([1, 2, 10, 9, 14, 13, 6, 5], color=cyan_mat),
            # Rear Trunk
            Face3D([12, 13, 14, 15], color=cyan_mat),
        ]
        mesh.faces = faces
        return mesh

    @staticmethod
    def generate_hologram_fan_mesh() -> Mesh3D:
        """Generate a 3D hologram fan hardware mount mesh."""
        mesh = Mesh3D(name="Hologram_Fan_Rig")

        # Central Rotor & 4 Fan Blades
        v = [(0.0, 1.4, 0.0)]
        for i in range(4):
            ang = i * (math.pi / 2)
            bx = math.cos(ang) * 0.8
            bz = math.sin(ang) * 0.8
            v.append((bx, 1.4, bz))

        mesh.vertices = v
        fan_color = (0, 230, 255)
        for i in range(1, 5):
            next_i = (i % 4) + 1
            mesh.faces.append(Face3D([0, i, next_i], color=fan_color))

        return mesh
