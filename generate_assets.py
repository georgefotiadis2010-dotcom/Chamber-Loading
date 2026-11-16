"""
Headless Blender 3D Asset Generator for CHAMBER LOADING
Generates stylized, chunky mid-poly 3D cartoon PBR models (.glb) into public/models/
Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python generate_assets.py
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "models")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_material(name, color, metallic=0.0, roughness=0.4, emission=None, emission_strength=0.0, coat=0.0):
    mat = bpy.data.materials.new(name=name)
    if not mat.use_nodes:
        mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")

    rgba = (color[0], color[1], color[2], 1.0) if len(color) == 3 else color
    if "Base Color" in bsdf.inputs:
        bsdf.inputs["Base Color"].default_value = rgba
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
    elif "Clearcoat" in bsdf.inputs:
        bsdf.inputs["Clearcoat"].default_value = coat

    if emission is not None and emission_strength > 0:
        em_rgba = (emission[0], emission[1], emission[2], 1.0) if len(emission) == 3 else emission
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = em_rgba
        elif "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = em_rgba
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength

    return mat


def assign_material(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def shade_smooth(obj):
    if obj.type != 'MESH':
        return
    for poly in obj.data.polygons:
        poly.use_smooth = True


def add_bevel(obj, width=0.025, segments=3, angle_limit=30.0):
    mod = obj.modifiers.new(name="Bevel", type='BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(angle_limit)
    mod.harden_normals = False
    return mod


def add_subsurf(obj, levels=1):
    mod = obj.modifiers.new(name="Subsurf", type='SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    return mod


def apply_all_modifiers(obj):
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except Exception as e:
            print(f"Modifier apply warning on {obj.name}: {e}")


def boolean_diff(target_obj, cutter_obj):
    mod = target_obj.modifiers.new(name="BoolDiff", type='BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = cutter_obj
    bpy.context.view_layer.objects.active = target_obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter_obj, do_unlink=True)


def export_glb(filename):
    filepath = os.path.join(OUTPUT_DIR, filename)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials='EXPORT'
    )
    print(f"[Blender] Exported: {filepath}")


# ==============================================================================
# 1. REVOLVER CYLINDER (6-chamber separated rotating mesh)
# Centered at (0,0,0), axis along Blender Y (maps to Three.js Z axis)
# ==============================================================================
def build_revolver_cylinder():
    clear_scene()

    mat_gunmetal = make_material("CylinderSteel", (0.52, 0.56, 0.62), metallic=0.88, roughness=0.25, coat=0.25)
    mat_dark_bore = make_material("ChamberInterior", (0.07, 0.08, 0.10), metallic=0.75, roughness=0.45)
    mat_brass = make_material("ExtractorBrass", (0.88, 0.68, 0.22), metallic=0.92, roughness=0.20)

    # Main cylinder body along Y axis
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48,
        radius=0.41,
        depth=0.84,
        location=(0, 0, 0),
        rotation=(math.radians(90), 0, 0)
    )
    cyl = bpy.context.active_object
    cyl.name = "CylinderBody"
    assign_material(cyl, mat_gunmetal)
    add_bevel(cyl, width=0.025, segments=3)
    apply_all_modifiers(cyl)

    # Carve 6 chamber through-holes at radius 0.245
    chamber_radius = 0.245
    hole_radius = 0.108
    for i in range(6):
        angle = i * (math.pi / 3.0)
        cx = math.cos(angle) * chamber_radius
        cz = math.sin(angle) * chamber_radius
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=28,
            radius=hole_radius,
            depth=1.1,
            location=(cx, 0, cz),
            rotation=(math.radians(90), 0, 0)
        )
        cutter = bpy.context.active_object
        assign_material(cutter, mat_dark_bore)
        boolean_diff(cyl, cutter)

    # Carve 6 external stylized flutes between chambers
    flute_dist = 0.465
    flute_radius = 0.115
    for i in range(6):
        angle = (i + 0.5) * (math.pi / 3.0)
        fx = math.cos(angle) * flute_dist
        fz = math.sin(angle) * flute_dist
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=24,
            radius=flute_radius,
            depth=0.64,
            location=(fx, 0.03, fz),
            rotation=(math.radians(90), 0, 0)
        )
        flute = bpy.context.active_object
        add_bevel(flute, width=0.03, segments=2)
        apply_all_modifiers(flute)
        boolean_diff(cyl, flute)

    shade_smooth(cyl)

    # Central spindle & rear ratchet star
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=0.075,
        depth=0.96,
        location=(0, 0, 0),
        rotation=(math.radians(90), 0, 0)
    )
    spindle = bpy.context.active_object
    spindle.name = "CylinderSpindle"
    assign_material(spindle, mat_brass)
    add_bevel(spindle, width=0.012, segments=2)
    shade_smooth(spindle)

    export_glb("revolver_cylinder.glb")


# ==============================================================================
# 2. REVOLVER FRAME (Chunky Snub-Nose Revolver Frame, Vented Rib, Trigger & Grip)
# Cylinder window centered at (0,0,0); Barrel points toward +Y (Three.js -Z)
# ==============================================================================
def build_revolver_frame():
    clear_scene()

    mat_body = make_material("SatinSilverSteel", (0.64, 0.68, 0.74), metallic=0.86, roughness=0.24, coat=0.28)
    mat_dark = make_material("DarkGunmetal", (0.18, 0.20, 0.24), metallic=0.82, roughness=0.32)
    mat_bore = make_material("BarrelBoreBlack", (0.02, 0.02, 0.03), metallic=0.1, roughness=0.9)
    mat_wood = make_material("WarmWalnutGrip", (0.58, 0.26, 0.10), metallic=0.05, roughness=0.40, coat=0.35)
    mat_wood_inset = make_material("DeepWalnutPanel", (0.42, 0.17, 0.06), metallic=0.05, roughness=0.48)
    mat_brass = make_material("MedallionBrass", (0.90, 0.68, 0.20), metallic=0.94, roughness=0.20)
    mat_sight = make_material("SightOrange", (0.98, 0.28, 0.12), metallic=0.1, roughness=0.3, emission=(0.98, 0.25, 0.08), emission_strength=0.45)

    # A. Outer Frame Block with boolean cylinder window cutout
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.08, 0.04))
    frame = bpy.context.active_object
    frame.name = "RevolverFrame"
    frame.scale = (0.36, 1.48, 1.06)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(frame, mat_body)
    add_bevel(frame, width=0.065, segments=4)
    apply_all_modifiers(frame)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.0, 0.01))
    win_cutter = bpy.context.active_object
    win_cutter.scale = (0.90, 0.92, 0.82)
    bpy.ops.object.transform_apply(scale=True)
    add_bevel(win_cutter, width=0.04, segments=3)
    apply_all_modifiers(win_cutter)
    boolean_diff(frame, win_cutter)
    shade_smooth(frame)

    # B. Recoil Shield Dome & Sideplate Screws
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32,
        radius=0.42,
        depth=0.12,
        location=(0, -0.50, 0.0),
        rotation=(math.radians(90), 0, 0)
    )
    shield = bpy.context.active_object
    shield.name = "RecoilShield"
    assign_material(shield, mat_body)
    add_bevel(shield, width=0.03, segments=3)
    shade_smooth(shield)

    # Left-side cylinder release thumb latch
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.21, -0.58, 0.16))
    latch = bpy.context.active_object
    latch.name = "CylinderLatch"
    latch.scale = (0.08, 0.22, 0.14)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(latch, mat_dark)
    add_bevel(latch, width=0.02, segments=2)
    shade_smooth(latch)

    # C. Chunky Snub-Nose Barrel (y = +0.48 to +1.76, z = +0.16)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=36,
        radius=0.245,
        depth=1.28,
        location=(0, 1.10, 0.16),
        rotation=(math.radians(90), 0, 0)
    )
    barrel = bpy.context.active_object
    barrel.name = "SnubBarrel"
    assign_material(barrel, mat_body)
    add_bevel(barrel, width=0.035, segments=3)
    apply_all_modifiers(barrel)

    # Hollow out dark muzzle bore
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=28,
        radius=0.145,
        depth=1.10,
        location=(0, 1.30, 0.16),
        rotation=(math.radians(90), 0, 0)
    )
    bore_cutter = bpy.context.active_object
    assign_material(bore_cutter, mat_bore)
    boolean_diff(barrel, bore_cutter)
    shade_smooth(barrel)

    # Ventilated Top Rib above barrel with 3 carved vents
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 1.10, 0.41))
    rib = bpy.context.active_object
    rib.name = "BarrelVentRib"
    rib.scale = (0.20, 1.24, 0.12)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(rib, mat_dark)
    add_bevel(rib, width=0.02, segments=2)
    apply_all_modifiers(rib)

    for vy in (0.72, 1.04, 1.36):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, vy, 0.40))
        vc = bpy.context.active_object
        vc.scale = (0.30, 0.16, 0.065)
        bpy.ops.object.transform_apply(scale=True)
        boolean_diff(rib, vc)
    shade_smooth(rib)

    # Ramped Front Sight Post at Muzzle
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 1.56, 0.52))
    sight = bpy.context.active_object
    sight.name = "FrontSight"
    sight.scale = (0.09, 0.24, 0.16)
    sight.rotation_euler = (math.radians(-14), 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    assign_material(sight, mat_sight)
    add_bevel(sight, width=0.02, segments=2)
    shade_smooth(sight)

    # Rear Sight U-Notch Ears
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 0.11, -0.52, 0.59))
        rs = bpy.context.active_object
        rs.scale = (0.07, 0.22, 0.08)
        bpy.ops.object.transform_apply(scale=True)
        assign_material(rs, mat_dark)
        add_bevel(rs, width=0.015, segments=2)
        shade_smooth(rs)

    # Underbarrel Full-Lug Ejector Shroud
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=28,
        radius=0.15,
        depth=1.12,
        location=(0, 1.02, -0.09),
        rotation=(math.radians(90), 0, 0)
    )
    shroud = bpy.context.active_object
    shroud.name = "EjectorShroud"
    assign_material(shroud, mat_body)
    add_bevel(shroud, width=0.03, segments=3)
    shade_smooth(shroud)

    # Ejector Rod Tip
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=0.075,
        depth=0.22,
        location=(0, 1.56, -0.09),
        rotation=(math.radians(90), 0, 0)
    )
    ej_tip = bpy.context.active_object
    ej_tip.name = "EjectorRodTip"
    assign_material(ej_tip, mat_brass)
    add_bevel(ej_tip, width=0.015, segments=2)
    shade_smooth(ej_tip)

    # D. Trigger Guard & Curved Trigger
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.30,
        minor_radius=0.065,
        major_segments=36,
        minor_segments=16,
        location=(0, -0.14, -0.62),
        rotation=(0, math.radians(90), 0)
    )
    tguard = bpy.context.active_object
    tguard.name = "TriggerGuard"
    tguard.scale = (1.0, 1.35, 0.82)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(tguard, mat_dark)
    shade_smooth(tguard)

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=20,
        radius=0.055,
        depth=0.34,
        location=(0, -0.18, -0.58),
        rotation=(math.radians(28), 0, 0)
    )
    trigger = bpy.context.active_object
    trigger.name = "Trigger"
    assign_material(trigger, mat_brass)
    add_bevel(trigger, width=0.015, segments=2)
    shade_smooth(trigger)

    # E. Chunky Hammer Spur at Rear Top
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.82, 0.42))
    hammer = bpy.context.active_object
    hammer.name = "HammerSpur"
    hammer.scale = (0.14, 0.34, 0.28)
    hammer.rotation_euler = (math.radians(32), 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    assign_material(hammer, mat_dark)
    add_bevel(hammer, width=0.03, segments=3)
    shade_smooth(hammer)

    # F. Ergonomic Chunky Wooden Snub-Nose Grip
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.98, -0.78))
    grip = bpy.context.active_object
    grip.name = "WoodenGrip"
    grip.scale = (0.44, 0.56, 1.25)
    grip.rotation_euler = (math.radians(-26), 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    assign_material(grip, mat_wood)
    add_bevel(grip, width=0.11, segments=5)
    add_subsurf(grip, levels=1)
    shade_smooth(grip)

    # Grip Side Scales + Brass Medallions
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 0.19, -0.98, -0.80))
        panel = bpy.context.active_object
        panel.name = f"GripPanel_{side}"
        panel.scale = (0.09, 0.40, 0.96)
        panel.rotation_euler = (math.radians(-26), 0, 0)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        assign_material(panel, mat_wood_inset)
        add_bevel(panel, width=0.04, segments=3)
        shade_smooth(panel)

        bpy.ops.mesh.primitive_cylinder_add(
            vertices=24,
            radius=0.09,
            depth=0.06,
            location=(side * 0.225, -0.92, -0.66),
            rotation=(0, math.radians(90), 0)
        )
        medallion = bpy.context.active_object
        medallion.name = f"GripMedallion_{side}"
        assign_material(medallion, mat_brass)
        add_bevel(medallion, width=0.01, segments=2)
        shade_smooth(medallion)

    export_glb("revolver_frame.glb")


# ==============================================================================
# 3. CARTRIDGE SHELLS (Live, Blank, Heavy, Inverted)
# Aligned upright along Blender Z (maps to Three.js Y up)
# ==============================================================================
def build_shell_variant(filename, hull_color, tip_color, rim_color, is_blank=False, is_heavy=False, emission_color=None):
    clear_scene()

    mat_rim = make_material("ShellRim", rim_color, metallic=0.92, roughness=0.22)
    mat_primer = make_material("ShellPrimer", (0.85, 0.88, 0.92), metallic=0.95, roughness=0.18)
    mat_hull = make_material(
        "ShellHull",
        hull_color,
        metallic=0.35 if not is_blank else 0.78,
        roughness=0.26,
        coat=0.45,
        emission=emission_color,
        emission_strength=0.35 if emission_color else 0.0
    )
    mat_tip = make_material("BulletTip", tip_color, metallic=0.86, roughness=0.24)

    # Brass/Silver Rim at base (z = -0.34 to -0.28)
    bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.105, depth=0.06, location=(0, 0, -0.31))
    rim = bpy.context.active_object
    rim.name = "Rim"
    assign_material(rim, mat_rim)
    add_bevel(rim, width=0.01, segments=2)
    shade_smooth(rim)

    # Primer cap visible from rear of cylinder
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.045, depth=0.02, location=(0, 0, -0.34))
    primer = bpy.context.active_object
    primer.name = "PrimerCap"
    assign_material(primer, mat_primer)
    shade_smooth(primer)

    # Brass base cup (z = -0.28 to -0.12)
    bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.096, depth=0.16, location=(0, 0, -0.20))
    base_cup = bpy.context.active_object
    base_cup.name = "BaseCup"
    assign_material(base_cup, mat_rim)
    add_bevel(base_cup, width=0.008, segments=2)
    shade_smooth(base_cup)

    # Main casing body (z = -0.12 to +0.18)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=28,
        radius=0.098 if not is_heavy else 0.104,
        depth=0.30,
        location=(0, 0, 0.03)
    )
    hull = bpy.context.active_object
    hull.name = "Hull"
    assign_material(hull, mat_hull)
    add_bevel(hull, width=0.012, segments=2)
    shade_smooth(hull)

    if is_heavy:
        # Extra gold band around heavy shell
        bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.108, depth=0.06, location=(0, 0, 0.06))
        band = bpy.context.active_object
        band.name = "HeavyGoldBand"
        assign_material(band, mat_rim)
        shade_smooth(band)

    # Bullet nose / crimp tip (z = +0.18 to +0.34)
    if is_blank:
        bpy.ops.mesh.primitive_cone_add(
            vertices=24,
            radius1=0.092,
            radius2=0.045,
            depth=0.10,
            location=(0, 0, 0.23)
        )
        tip = bpy.context.active_object
        tip.name = "BlankCrimp"
        assign_material(tip, mat_tip)
        add_bevel(tip, width=0.01, segments=2)
        shade_smooth(tip)
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=28,
            ring_count=16,
            radius=0.092 if not is_heavy else 0.10,
            location=(0, 0, 0.19)
        )
        tip = bpy.context.active_object
        tip.name = "ProjectileTip"
        tip.scale = (1.0, 1.0, 1.55 if not is_heavy else 1.75)
        bpy.ops.object.transform_apply(scale=True)
        assign_material(tip, mat_tip)
        shade_smooth(tip)

    export_glb(filename)


# ==============================================================================
# 4. AIM TOKEN (Two-Sided Weighted Casino Chip / Coin)
# Top (+Z in Blender / +Y in Three.js) = AIM OPPONENT (Crimson & Gold Skull/Crosshair)
# Bottom (-Z in Blender / -Y in Three.js) = AIM SELF (Cyan & Silver Shield/Arrow)
# ==============================================================================
def build_aim_token():
    clear_scene()

    mat_rim = make_material("TokenOuterDark", (0.14, 0.15, 0.18), metallic=0.75, roughness=0.28)
    mat_gold = make_material("TokenGold", (0.94, 0.74, 0.22), metallic=0.92, roughness=0.20)
    mat_red = make_material("AimOpponentRed", (0.88, 0.14, 0.16), metallic=0.25, roughness=0.30, coat=0.40, emission=(0.8, 0.1, 0.1), emission_strength=0.22)
    mat_blue = make_material("AimSelfBlue", (0.12, 0.56, 0.92), metallic=0.25, roughness=0.30, coat=0.40, emission=(0.1, 0.5, 0.9), emission_strength=0.22)
    mat_silver = make_material("TokenSilver", (0.85, 0.89, 0.95), metallic=0.92, roughness=0.20)

    # Outer Coin Rim
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.52, depth=0.13, location=(0, 0, 0))
    coin = bpy.context.active_object
    coin.name = "AimCoinRim"
    assign_material(coin, mat_rim)
    add_bevel(coin, width=0.025, segments=3)
    shade_smooth(coin)

    # 8 Gold Edge Notches around the perimeter
    for i in range(8):
        ang = i * (math.pi / 4.0)
        nx = math.cos(ang) * 0.49
        ny = math.sin(ang) * 0.49
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(nx, ny, 0), rotation=(0, 0, ang))
        notch = bpy.context.active_object
        notch.name = f"EdgeStripe_{i}"
        notch.scale = (0.09, 0.14, 0.138)
        bpy.ops.object.transform_apply(scale=True)
        assign_material(notch, mat_gold)
        add_bevel(notch, width=0.01, segments=2)
        shade_smooth(notch)

    # TOP FACE (+Z): AIM OPPONENT (Red Disc + Gold Crosshair + Embossed Skull)
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.41, depth=0.03, location=(0, 0, 0.06))
    top_disc = bpy.context.active_object
    top_disc.name = "TopFaceOpponent"
    assign_material(top_disc, mat_red)
    add_bevel(top_disc, width=0.008, segments=2)
    shade_smooth(top_disc)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.28, minor_radius=0.028, major_segments=32, minor_segments=12, location=(0, 0, 0.08))
    cross_ring = bpy.context.active_object
    cross_ring.name = "CrosshairRing"
    assign_material(cross_ring, mat_gold)
    shade_smooth(cross_ring)

    for rot_z in (0, math.pi / 2.0):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.08), rotation=(0, 0, rot_z))
        bar = bpy.context.active_object
        bar.scale = (0.66, 0.05, 0.03)
        bpy.ops.object.transform_apply(scale=True)
        assign_material(bar, mat_gold)
        add_bevel(bar, width=0.008, segments=2)
        shade_smooth(bar)

    # Skull Boss Center
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.14, location=(0, -0.02, 0.08))
    skull = bpy.context.active_object
    skull.scale = (1.0, 1.1, 0.35)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(skull, mat_gold)
    shade_smooth(skull)

    # BOTTOM FACE (-Z): AIM SELF (Blue Disc + Silver Shield + Arrow Relief)
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.41, depth=0.03, location=(0, 0, -0.06))
    bot_disc = bpy.context.active_object
    bot_disc.name = "BottomFaceSelf"
    assign_material(bot_disc, mat_blue)
    add_bevel(bot_disc, width=0.008, segments=2)
    shade_smooth(bot_disc)

    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.25, depth=0.04, location=(0, 0, -0.08))
    shield = bpy.context.active_object
    shield.name = "ShieldEmblem"
    assign_material(shield, mat_silver)
    add_bevel(shield, width=0.015, segments=2)
    shade_smooth(shield)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.31, minor_radius=0.024, major_segments=32, minor_segments=12, location=(0, 0, -0.08))
    shield_ring = bpy.context.active_object
    assign_material(shield_ring, mat_silver)
    shade_smooth(shield_ring)

    export_glb("aim_token.glb")


# ==============================================================================
# 5. BRASS LOCK-IN BELL (Desk Service Bell)
# ==============================================================================
def build_brass_bell():
    clear_scene()

    mat_base = make_material("BellBaseIron", (0.12, 0.11, 0.10), metallic=0.65, roughness=0.40)
    mat_brass = make_material("PolishedBellBrass", (0.96, 0.76, 0.22), metallic=0.95, roughness=0.16, coat=0.35)
    mat_chrome = make_material("BellPlungerChrome", (0.85, 0.88, 0.92), metallic=0.92, roughness=0.18)

    # Stepped Base
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.52, depth=0.10, location=(0, 0, 0.05))
    base = bpy.context.active_object
    base.name = "bell_base"
    assign_material(base, mat_base)
    add_bevel(base, width=0.02, segments=3)
    shade_smooth(base)

    # Brass Dome (Half-Sphere)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=0.44, location=(0, 0, 0.10))
    dome = bpy.context.active_object
    dome.name = "bell_dome"
    dome.scale = (1.0, 1.0, 0.78)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(dome, mat_brass)
    bpy.ops.mesh.primitive_cube_add(size=1.2, location=(0, 0, -0.52))
    cutter = bpy.context.active_object
    boolean_diff(dome, cutter)
    add_bevel(dome, width=0.012, segments=2)
    shade_smooth(dome)

    # Top Striker Plunger
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.045, depth=0.16, location=(0, 0, 0.46))
    stem = bpy.context.active_object
    stem.name = "bell_stem"
    assign_material(stem, mat_chrome)
    shade_smooth(stem)

    bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.12, depth=0.05, location=(0, 0, 0.54))
    plunger = bpy.context.active_object
    plunger.name = "bell_plunger"
    assign_material(plunger, mat_chrome)
    add_bevel(plunger, width=0.012, segments=2)
    shade_smooth(plunger)

    export_glb("brass_bell.glb")


# ==============================================================================
# 6. HEART HP TOKEN (Chunky 3D Heart Token with Gold Bezel)
# ==============================================================================
def build_heart_token():
    clear_scene()

    mat_ruby = make_material("HeartRuby", (0.92, 0.12, 0.22), metallic=0.25, roughness=0.22, coat=0.5, emission=(0.8, 0.05, 0.15), emission_strength=0.25)
    mat_gold = make_material("HeartGoldBase", (0.92, 0.72, 0.22), metallic=0.90, roughness=0.24)

    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.24, depth=0.06, location=(0, 0, 0.03))
    ped = bpy.context.active_object
    ped.name = "HeartBase"
    assign_material(ped, mat_gold)
    add_bevel(ped, width=0.015, segments=2)
    shade_smooth(ped)

    for side in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=0.115, location=(side * 0.075, -0.02, 0.15))
        lobe = bpy.context.active_object
        lobe.scale = (1.0, 1.15, 0.85)
        bpy.ops.object.transform_apply(scale=True)
        assign_material(lobe, mat_ruby)
        shade_smooth(lobe)

    bpy.ops.mesh.primitive_cone_add(
        vertices=24,
        radius1=0.16,
        radius2=0.01,
        depth=0.22,
        location=(0, 0.07, 0.13),
        rotation=(math.radians(-72), 0, 0)
    )
    tip = bpy.context.active_object
    tip.scale = (1.15, 0.75, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(tip, mat_ruby)
    shade_smooth(tip)

    export_glb("heart_token.glb")


# ==============================================================================
# 7. SHELL TRAY (Carved Walnut & Brass 6-Slot Ammo Tray)
# ==============================================================================
def build_shell_tray():
    clear_scene()

    mat_wood = make_material("TrayWalnut", (0.36, 0.18, 0.08), metallic=0.05, roughness=0.45, coat=0.25)
    mat_brass = make_material("TrayBrass", (0.86, 0.66, 0.20), metallic=0.90, roughness=0.25)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.09))
    tray = bpy.context.active_object
    tray.name = "ShellTrayBody"
    tray.scale = (1.28, 0.78, 0.18)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(tray, mat_wood)
    add_bevel(tray, width=0.03, segments=3)
    apply_all_modifiers(tray)

    xs = [-0.38, 0.0, 0.38]
    ys = [-0.18, 0.18]
    for x in xs:
        for y in ys:
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.125, depth=0.18, location=(x, y, 0.15))
            well = bpy.context.active_object
            assign_material(well, mat_brass)
            boolean_diff(tray, well)

    shade_smooth(tray)
    export_glb("shell_tray.glb")


# ==============================================================================
# 8. 5 DISTINCT STYLIZED OPPONENT BUSTS & MASKS
# Facing -Y in Blender (which exports as +Z in Three.js, facing the player!)
# ==============================================================================
def build_opponent_bust(filename, mask_color, accent_color, eye_color, style="rookie"):
    clear_scene()

    mat_cloak = make_material(f"{style}_Cloak", (0.14, 0.13, 0.16), metallic=0.15, roughness=0.62)
    mat_mask = make_material(f"{style}_Mask", mask_color, metallic=0.35 if style != "heavy" else 0.82, roughness=0.26, coat=0.38)
    mat_accent = make_material(f"{style}_Accent", accent_color, metallic=0.88, roughness=0.22)
    mat_eye = make_material(f"{style}_EyeGlow", eye_color, metallic=0.1, roughness=0.2, emission=eye_color, emission_strength=2.2)
    mat_dark = make_material(f"{style}_DarkSlot", (0.05, 0.05, 0.06), metallic=0.3, roughness=0.7)

    # Shoulders / Torso Bust
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1.15, location=(0, 0, 0.2))
    torso = bpy.context.active_object
    torso.name = "BustTorso"
    torso.scale = (1.35, 0.72, 1.15)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(torso, mat_cloak)
    bpy.ops.mesh.primitive_cube_add(size=3.5, location=(0, 0, -1.75))
    cutter = bpy.context.active_object
    boolean_diff(torso, cutter)
    shade_smooth(torso)

    # Stylized Mask Head
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=0.68, location=(0, -0.10, 1.95))
    head = bpy.context.active_object
    head.name = "MaskFace"
    head.scale = (0.88, 0.78, 1.18)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(head, mat_mask)
    shade_smooth(head)

    # Expressive Brow & Eyes facing -Y
    if style == "counter":
        # Cyclops Visor with Brass Loupe Ring
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.60, 2.04))
        visor = bpy.context.active_object
        visor.scale = (0.76, 0.15, 0.14)
        bpy.ops.object.transform_apply(scale=True)
        assign_material(visor, mat_eye)
        add_bevel(visor, width=0.02, segments=2)
        shade_smooth(visor)

        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.19,
            minor_radius=0.04,
            major_segments=28,
            minor_segments=12,
            location=(0.20, -0.62, 2.04),
            rotation=(math.radians(90), 0, 0)
        )
        loupe = bpy.context.active_object
        assign_material(loupe, mat_accent)
        shade_smooth(loupe)
    else:
        for side in (-1, 1):
            bpy.ops.mesh.primitive_uv_sphere_add(
                segments=20,
                ring_count=12,
                radius=0.13 if style != "saboteur" or side == 1 else 0.18,
                location=(side * 0.25, -0.58, 2.02)
            )
            eye = bpy.context.active_object
            assign_material(eye, mat_eye)
            shade_smooth(eye)

            # Angled Eyebrow Ridge
            brow_tilt = -16 if style == "rookie" else 18
            bpy.ops.mesh.primitive_cube_add(
                size=1.0,
                location=(side * 0.25, -0.60, 2.20),
                rotation=(0, math.radians(side * brow_tilt), 0)
            )
            brow = bpy.context.active_object
            brow.scale = (0.28, 0.12, 0.06)
            bpy.ops.object.transform_apply(scale=True)
            assign_material(brow, mat_accent)
            add_bevel(brow, width=0.015, segments=2)
            shade_smooth(brow)

    # Mouth Grille / Vent Detail
    for m_idx in range(-2, 3):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(m_idx * 0.09, -0.61, 1.58))
        tooth = bpy.context.active_object
        tooth.scale = (0.05, 0.10, 0.16)
        bpy.ops.object.transform_apply(scale=True)
        assign_material(tooth, mat_accent if style == "dealer" else mat_dark)
        add_bevel(tooth, width=0.01, segments=2)
        shade_smooth(tooth)

    # Character-Specific Headgear / Horns / Silhouette
    if style == "rookie":
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.82, depth=0.08, location=(0.06, -0.08, 2.58), rotation=(0, math.radians(8), 0))
        brim = bpy.context.active_object
        assign_material(brim, mat_accent)
        add_bevel(brim, width=0.02, segments=2)
        shade_smooth(brim)

        bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=14, radius=0.56, location=(0.08, -0.08, 2.66), rotation=(0, math.radians(8), 0))
        crown = bpy.context.active_object
        crown.scale = (1.0, 1.0, 0.75)
        bpy.ops.object.transform_apply(scale=True)
        assign_material(crown, mat_cloak)
        shade_smooth(crown)

    elif style == "counter":
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.88, depth=0.45, location=(0, 0.02, 1.38))
        collar = bpy.context.active_object
        assign_material(collar, mat_accent)
        add_bevel(collar, width=0.03, segments=2)
        shade_smooth(collar)

        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.05, 2.55))
        crest = bpy.context.active_object
        crest.scale = (0.12, 0.75, 0.45)
        bpy.ops.object.transform_apply(scale=True)
        assign_material(crest, mat_accent)
        add_bevel(crest, width=0.03, segments=2)
        shade_smooth(crest)

    elif style == "heavy":
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.35, 1.55))
        jaw = bpy.context.active_object
        jaw.scale = (0.95, 0.65, 0.48)
        bpy.ops.object.transform_apply(scale=True)
        assign_material(jaw, mat_accent)
        add_bevel(jaw, width=0.05, segments=3)
        shade_smooth(jaw)

        for side in (-1, 1):
            bpy.ops.mesh.primitive_cone_add(
                vertices=20,
                radius1=0.22,
                radius2=0.02,
                depth=0.65,
                location=(side * 1.15, -0.05, 1.35),
                rotation=(0, math.radians(side * 28), 0)
            )
            spike = bpy.context.active_object
            assign_material(spike, mat_accent)
            shade_smooth(spike)

    elif style == "saboteur":
        bpy.ops.mesh.primitive_cone_add(
            vertices=16,
            radius1=0.34,
            radius2=0.04,
            depth=0.72,
            location=(0, -0.78, 1.82),
            rotation=(math.radians(78), 0, 0)
        )
        beak = bpy.context.active_object
        assign_material(beak, mat_accent)
        add_bevel(beak, width=0.02, segments=2)
        shade_smooth(beak)

        # Cheek respirator canisters
        for side in (-1, 1):
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=20,
                radius=0.14,
                depth=0.24,
                location=(side * 0.45, -0.52, 1.66),
                rotation=(math.radians(65), 0, math.radians(side * -30))
            )
            can = bpy.context.active_object
            assign_material(can, mat_accent)
            add_bevel(can, width=0.015, segments=2)
            shade_smooth(can)

    elif style == "dealer":
        for side in (-1, 1):
            bpy.ops.mesh.primitive_cone_add(
                vertices=24,
                radius1=0.22,
                radius2=0.02,
                depth=0.95,
                location=(side * 0.58, -0.10, 2.72),
                rotation=(math.radians(15), math.radians(side * -24), 0)
            )
            horn = bpy.context.active_object
            assign_material(horn, mat_accent)
            shade_smooth(horn)

        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.58, depth=0.75, location=(0, -0.08, 2.85))
        tophat = bpy.context.active_object
        assign_material(tophat, mat_cloak)
        add_bevel(tophat, width=0.03, segments=2)
        shade_smooth(tophat)

        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.60, depth=0.12, location=(0, -0.08, 2.56))
        hatband = bpy.context.active_object
        assign_material(hatband, mat_accent)
        shade_smooth(hatband)

    export_glb(filename)


# ==============================================================================
# 9. TABLE PROPS (Saloon Lantern, Poker Chip Stack, Card Shoe)
# ==============================================================================
def build_table_props():
    clear_scene()

    mat_brass = make_material("PropBrass", (0.90, 0.68, 0.22), metallic=0.92, roughness=0.22)
    mat_glass = make_material("LanternFlame", (1.0, 0.72, 0.28), metallic=0.0, roughness=0.15, emission=(1.0, 0.62, 0.18), emission_strength=2.5)
    mat_wood = make_material("ShoeWood", (0.38, 0.18, 0.08), metallic=0.05, roughness=0.42, coat=0.3)
    mat_chip_red = make_material("ChipRed", (0.85, 0.16, 0.18), metallic=0.2, roughness=0.35)
    mat_chip_black = make_material("ChipBlack", (0.15, 0.16, 0.18), metallic=0.3, roughness=0.35)

    # Brass Lantern Base & Glowing Globe at (0, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.34, depth=0.16, location=(0, 0, 0.08))
    lbase = bpy.context.active_object
    assign_material(lbase, mat_brass)
    add_bevel(lbase, width=0.02, segments=2)
    shade_smooth(lbase)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=16, radius=0.26, location=(0, 0, 0.42))
    globe = bpy.context.active_object
    globe.scale = (1.0, 1.0, 1.35)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(globe, mat_glass)
    shade_smooth(globe)

    bpy.ops.mesh.primitive_cone_add(vertices=28, radius1=0.38, radius2=0.08, depth=0.20, location=(0, 0, 0.82))
    lcap = bpy.context.active_object
    assign_material(lcap, mat_brass)
    add_bevel(lcap, width=0.015, segments=2)
    shade_smooth(lcap)

    # Poker Chip Stack next to lantern
    for i in range(6):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=28,
            radius=0.22,
            depth=0.055,
            location=(0.68 + (i % 2) * 0.02, -0.22, 0.03 + i * 0.058)
        )
        chip = bpy.context.active_object
        assign_material(chip, mat_chip_red if i % 2 == 0 else mat_chip_black)
        add_bevel(chip, width=0.008, segments=2)
        shade_smooth(chip)

    # Wooden Card Shoe / Deck Box on the other side
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.78, 0.10, 0.22), rotation=(0, 0, math.radians(14)))
    shoe = bpy.context.active_object
    shoe.scale = (0.58, 0.82, 0.44)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(shoe, mat_wood)
    add_bevel(shoe, width=0.03, segments=3)
    shade_smooth(shoe)

    export_glb("table_props.glb")


if __name__ == "__main__":
    print("=== Starting CHAMBER LOADING Blender 3D Asset Pipeline ===")
    build_revolver_cylinder()
    build_revolver_frame()
    build_shell_variant("shell_live.glb", hull_color=(0.86, 0.12, 0.14), tip_color=(0.88, 0.54, 0.22), rim_color=(0.90, 0.70, 0.20))
    build_shell_variant("shell_blank.glb", hull_color=(0.45, 0.56, 0.68), tip_color=(0.75, 0.80, 0.86), rim_color=(0.78, 0.82, 0.86), is_blank=True)
    build_shell_variant("shell_heavy.glb", hull_color=(0.95, 0.36, 0.08), tip_color=(0.95, 0.78, 0.22), rim_color=(0.95, 0.72, 0.15), is_heavy=True, emission_color=(0.9, 0.25, 0.05))
    build_shell_variant("shell_inverted.glb", hull_color=(0.56, 0.18, 0.88), tip_color=(0.82, 0.45, 0.98), rim_color=(0.85, 0.68, 0.22), emission_color=(0.6, 0.2, 0.95))
    build_aim_token()
    build_brass_bell()
    build_heart_token()
    build_shell_tray()
    build_table_props()

    build_opponent_bust("opponent_rookie.glb", mask_color=(0.88, 0.84, 0.76), accent_color=(0.68, 0.42, 0.20), eye_color=(0.95, 0.75, 0.25), style="rookie")
    build_opponent_bust("opponent_counter.glb", mask_color=(0.22, 0.26, 0.32), accent_color=(0.85, 0.68, 0.22), eye_color=(0.15, 0.95, 0.55), style="counter")
    build_opponent_bust("opponent_heavy.glb", mask_color=(0.32, 0.28, 0.26), accent_color=(0.82, 0.38, 0.16), eye_color=(0.98, 0.25, 0.12), style="heavy")
    build_opponent_bust("opponent_saboteur.glb", mask_color=(0.28, 0.20, 0.36), accent_color=(0.75, 0.62, 0.28), eye_color=(0.75, 0.25, 0.98), style="saboteur")
    build_opponent_bust("opponent_dealer.glb", mask_color=(0.15, 0.12, 0.14), accent_color=(0.96, 0.76, 0.20), eye_color=(1.0, 0.15, 0.15), style="dealer")
    print("=== All CHAMBER LOADING .glb models exported successfully! ===")
