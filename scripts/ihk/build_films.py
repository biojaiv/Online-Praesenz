"""Render the evolving pilot network, in DE/EN, without external visual assets.

Run: python scripts/ihk/build_films.py (Pillow, FFmpeg, DejaVu Sans required).
The shared, schematic topology is not a literal map of the authority's network.
Faults and fixes follow report sections 4.1 and 5.1; four of five planned clients
were completed. Empirum is disconnected only for the coordinated cross-check.
"""
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ihk'
WIDTH, HEIGHT, FPS, DURATION = 1280, 720, 24, 42
FONT_ROOT = Path('/usr/share/fonts/truetype/dejavu')
INK, DIM = '#d4e2ed', '#889bad'
AMBER, CYAN, GREEN, RED = '#dca266', '#79afc3', '#a8c9b2', '#ee957d'
LINE, PANEL, VOID = '#2b3b4c', '#0c1722', '#08121c'
STORY = {
    'de': {
        'file': 'IHK_Projektfilm_DE.mp4', 'project': 'IHK-ABSCHLUSSPROJEKT',
        'titles': ['Bestandsnetz und Pilot', 'Die Serverbasis entsteht',
                   'DIP und Testclients anbinden', 'Der erste PXE-Test',
                   '01 / Falscher PXE-Server', '02 / WinPE ohne Netzwerk',
                   '03 / Windows-Setup stoppt', 'Software und Inventar', 'Pilot erfolgreich'],
        'existing': 'BESTANDSNETZ', 'pilot': 'PILOTUMGEBUNG', 'planned': 'geplant',
        'reference': 'REFERENZCLIENTS', 'existingDB': 'bestehend',
        'scope': 'SCHEMATISCH · PROOF OF CONCEPT · 40 h NETTO',
        'intro': 'Ein eigener Pilot am Rand der bestehenden Infrastruktur',
        'base': 'VM bereitstellen', 'permissions': 'AD / Berechtigungen',
        'testnet': 'Test-VLAN', 'boot': 'Netzwerkstart', 'test': 'Referenzclient 01',
        'faults': ['Empirum-/PXE-Interferenz', 'WinPE-Netzwerktreiber fehlt', 'ProductKey fehlt'],
        'fixes': ['Empirum im Wartungsfenster getrennt', 'WinPE neu erstellt + Treiber integriert', 'Generischen Installationsschlüssel hinterlegt'],
        'pending': 'Fehler eingrenzen', 'fixed': 'BEHOBEN',
        'software': 'Basissoftware', 'inventory': 'Inventarisierung',
        'result': 'abgeschlossene Testläufe erfolgreich',
        'count': '5 geplant · 4 vollständig abgeschlossen',
        'pilotOnly': 'Pilot nachgewiesen · keine Produktivablösung',
    },
    'en': {
        'file': 'IHK_Project_Film_EN.mp4', 'project': 'IHK FINAL PROJECT',
        'titles': ['Existing network and pilot', 'Building the server foundation',
                   'Connecting DIP and test clients', 'The first PXE test',
                   '01 / The wrong PXE server', '02 / WinPE loses the network',
                   '03 / Windows Setup stops', 'Software and inventory', 'Pilot successful'],
        'existing': 'EXISTING NETWORK', 'pilot': 'PILOT ENVIRONMENT', 'planned': 'planned',
        'reference': 'REFERENCE CLIENTS', 'existingDB': 'existing',
        'scope': 'SCHEMATIC · PROOF OF CONCEPT · 40 h NET',
        'intro': 'A separate pilot alongside the existing infrastructure',
        'base': 'Provision the VM', 'permissions': 'AD / permissions',
        'testnet': 'Test VLAN', 'boot': 'Network boot', 'test': 'Reference client 01',
        'faults': ['Empirum/PXE interference', 'Missing WinPE network driver', 'Missing ProductKey'],
        'fixes': ['Empirum disconnected in maintenance window', 'WinPE rebuilt + compatible driver integrated', 'Generic installation key supplied'],
        'pending': 'Isolating the fault', 'fixed': 'RESOLVED',
        'software': 'Baseline software', 'inventory': 'Inventory collection',
        'result': 'completed test runs successful',
        'count': '5 planned · 4 fully completed',
        'pilotOnly': 'Pilot validated · no production replacement',
    },
}
BOUNDS = [0, 4, 9, 13, 16, 20, 25, 30, 36, 42]
CLIENT_X = [501, 655, 809, 963, 1117]
FONTS = {}


def font(size, bold=False):
    key = (size, bold)
    if key not in FONTS:
        name = 'DejaVuSansCondensed-Bold.ttf' if bold else 'DejaVuSansCondensed.ttf'
        FONTS[key] = ImageFont.truetype(str(FONT_ROOT / name), size)
    return FONTS[key]


def label(draw, xy, value, size=22, colour=INK, bold=False, anchor='mm'):
    draw.text(xy, value, font=font(size, bold), fill=colour, anchor=anchor)


def ramp(time, start, duration=.65):
    value = max(0, min(1, (time - start) / duration))
    return value * value * (3 - 2 * value)


def route(draw, points, progress=1, colour=LINE, packet=None, width=2):
    """Reveal an orthogonal cable by length; optional packet travels along it."""
    lengths = [math.dist(a, b) for a, b in zip(points, points[1:])]
    total = sum(lengths)
    remaining = total * progress
    for a, b, length in zip(points, points[1:], lengths):
        if length == 0:
            continue
        portion = min(1, max(0, remaining / length))
        if portion:
            end = (a[0] + (b[0] - a[0]) * portion, a[1] + (b[1] - a[1]) * portion)
            draw.line([a, end], fill=colour, width=width)
        remaining -= length
    if packet is None or progress < 1:
        return
    distance = (packet % 1) * total
    for a, b, length in zip(points, points[1:], lengths):
        if length and distance <= length:
            x = a[0] + (b[0] - a[0]) * distance / length
            y = a[1] + (b[1] - a[1]) * distance / length
            draw.ellipse((x-4, y-4, x+4, y+4), fill=colour)
            break
        distance -= length


def check(draw, x, y, colour=GREEN, scale=1):
    draw.line([(x-9*scale, y), (x-3*scale, y+6*scale), (x+10*scale, y-8*scale)], fill=colour, width=3)


def cross(draw, x, y, colour=RED):
    draw.line((x-7, y-7, x+7, y+7), fill=colour, width=3)
    draw.line((x-7, y+7, x+7, y-7), fill=colour, width=3)


def server(draw, x, y, colour=AMBER):
    for i in range(3):
        yy = y-30+i*22
        draw.rounded_rectangle((x-23, yy, x+23, yy+16), radius=3, fill=VOID, outline=colour, width=2)
        draw.ellipse((x-16, yy+6, x-12, yy+10), fill=colour)
        draw.line((x+1, yy+8, x+16, yy+8), fill=colour, width=2)


def database(draw, x, y):
    draw.rectangle((x-25, y-22, x+25, y+21), fill=VOID)
    draw.line((x-25, y-22, x-25, y+21), fill=CYAN, width=2)
    draw.line((x+25, y-22, x+25, y+21), fill=CYAN, width=2)
    for yy in [y-22, y, y+20]:
        draw.arc((x-25, yy-8, x+25, yy+8), 0, 180, fill=CYAN, width=2)
    draw.ellipse((x-25, y-30, x+25, y-14), outline=CYAN, fill=VOID, width=2)


def directory(draw, x, y):
    draw.line((x, y-18, x, y, x-24, y, x+24, y), fill=CYAN, width=2)
    for dx in [-24, 0, 24]:
        draw.line((x+dx, y, x+dx, y+12), fill=CYAN, width=2)
        draw.rectangle((x+dx-6, y+12, x+dx+6, y+24), fill=VOID, outline=CYAN, width=2)
    draw.rectangle((x-9, y-30, x+9, y-13), fill=VOID, outline=CYAN, width=2)


def windows(draw, x, y, colour=CYAN):
    for dx in [-12, 2]:
        for dy in [-12, 2]:
            draw.rectangle((x+dx, y+dy, x+dx+10, y+dy+10), fill=colour)


def pc(draw, x, y, colour=DIM, screen=None, progress=None, success=False):
    draw.rounded_rectangle((x-35, y-25, x+35, y+19), radius=4, fill=VOID, outline=colour, width=2)
    draw.line((x, y+20, x, y+30), fill=colour, width=2)
    draw.line((x-16, y+31, x+16, y+31), fill=colour, width=2)
    if screen == 'windows':
        windows(draw, x, y-3)
    elif screen == 'apps':
        for dx, dy in [(-14, -13), (4, -13), (-14, 4), (4, 4)]:
            draw.rounded_rectangle((x+dx, y+dy, x+dx+10, y+dy+10), radius=2, outline=AMBER, width=2)
    elif screen:
        label(draw, (x, y-3), screen, 16, colour, True)
    if progress is not None:
        draw.line((x-27, y+12, x+27, y+12), fill=LINE, width=3)
        draw.line((x-27, y+12, x-27+54*progress, y+12), fill=AMBER, width=3)
    if success:
        draw.ellipse((x+21, y-35, x+47, y-9), fill=VOID, outline=GREEN, width=2)
        check(draw, x+34, y-22, scale=.65)


def network_adapter(draw, x, y, fixed):
    draw.rounded_rectangle((x-26, y-21, x+26, y+21), radius=4, outline=GREEN if fixed else RED, width=2)
    draw.rectangle((x-13, y-10, x+13, y+10), outline=GREEN if fixed else RED, width=2)
    for dx in [-7, 0, 7]:
        draw.line((x+dx, y-10, x+dx, y-3), fill=GREEN if fixed else RED, width=2)
    if fixed:
        check(draw, x+37, y)
    else:
        cross(draw, x+37, y)


def key(draw, x, y, fixed):
    colour = GREEN if fixed else RED
    draw.ellipse((x-26, y-10, x-6, y+10), outline=colour, width=3)
    draw.line((x-6, y, x+25, y, x+25, y+11), fill=colour, width=3)
    draw.line((x+14, y, x+14, y+8), fill=colour, width=3)
    if not fixed:
        label(draw, (x+42, y), '?', 28, RED, True)


def background():
    im = Image.new('RGB', (WIDTH, HEIGHT), VOID)
    d = ImageDraw.Draw(im)
    for y in range(HEIGHT):
        f = math.sin(y / HEIGHT * math.pi)
        d.line((0, y, WIDTH, y), fill=(int(5+4*f), int(11+6*f), int(18+8*f)))
    for x in range(40, 1241, 40):
        for y in range(178, 596, 40):
            d.point((x, y), fill=LINE)
    return im


BASE = background()


def frame(language, time, poster=False):
    s = STORY[language]
    scene = max(i for i in range(9) if time >= BOUNDS[i])
    im = BASE.copy()
    d = ImageDraw.Draw(im)
    label(d, (40, 38), s['project'], 17, AMBER, True, 'lm')
    label(d, (1240, 38), 'VL / 2026', 16, DIM, anchor='rm')
    label(d, (40, 96), s['titles'][scene], 36, INK, True, 'lm')
    for i in range(9):
        x = 40 + i*135
        d.line((x, 144, x+120, 144), fill=AMBER if i <= scene else LINE, width=3)
    # The established network remains in place throughout the pilot story.
    d.rounded_rectangle((40, 176, 382, 582), radius=12, fill=PANEL, outline=LINE)
    label(d, (61, 202), s['existing'], 16, DIM, True, 'lm')
    label(d, (211, 241), 'Matrix42 Empirum', 25, INK, True)
    maintenance = 18.6 <= time < 20
    for x, y in [(110, 400), (312, 400), (110, 512), (312, 512)]:
        route(d, [(211, 321), (211, y-50), (x, y-50), (x, y-25)], colour=LINE if maintenance else '#526779', packet=None if maintenance else time*.22)
        pc(d, x, y, '#73899b', 'PC')
    server(d, 211, 291, DIM if maintenance else CYAN)
    if maintenance:
        d.ellipse((236, 266, 262, 292), fill=VOID, outline=AMBER, width=2)
        d.line((244, 273, 244, 285), fill=AMBER, width=3)
        d.line((252, 273, 252, 285), fill=AMBER, width=3)
    # A distinct adjacent boundary; never replace or absorb the existing PCs.
    p = ramp(time, 1.2, 1.2)
    if p:
        layer = im.copy()
        pilot = ImageDraw.Draw(layer)
        pilot.rounded_rectangle((414, 176, 1240, 582), radius=12, fill=PANEL, outline=AMBER, width=2)
        label(pilot, (436, 202), s['pilot'], 16, AMBER, True, 'lm')
        label(pilot, (1218, 202), 'baramundi / PoC', 23, INK, True, 'rm')
        if time < 4:
            for radius in [45, 65]:
                pilot.ellipse((827-radius, 381-radius, 827+radius, 381+radius), outline=LINE, width=2)
            label(pilot, (827, 382), 'PoC', 36, AMBER, True)
        im = Image.blend(im, layer, p)
        d = ImageDraw.Draw(im)
    if time >= 4:
        # Compact VM enclosure: Windows and bMS are on the same server.
        d.rounded_rectangle((446, 231, 803, 355), radius=7, fill=VOID, outline=AMBER, width=2)
        label(d, (462, 250), 'VMware vSphere', 19, AMBER, anchor='lm')
        server(d, 483, 304)
        if time >= 5.3:
            label(d, (523, 288), 'Windows Server 2022', 21, INK, anchor='lm')
        if time >= 6.8:
            label(d, (523, 324), 'baramundi Management Suite', 18, AMBER, anchor='lm')
        if time >= 7.9:
            directory(d, 884, 284)
            label(d, (884, 327), 'Active Directory', 18, DIM)
            route(d, [(803, 278), (850, 278)], ramp(time, 8.2), CYAN, time*.4)
        if time >= 8.7:
            database(d, 1118, 284)
            label(d, (1118, 327), 'MSSQL', 20, INK)
            label(d, (1118, 351), s['existingDB'], 16, DIM)
            route(d, [(780, 355), (780, 363), (1066, 363), (1066, 284), (1092, 284)], ramp(time, 9), CYAN, time*.32)
        if time >= 9.6:
            route(d, [(629, 355), (629, 399), (943, 399)], ramp(time, 9.6), AMBER, time*.4)
            server(d, 977, 400)
            label(d, (1019, 387), 'DIP / baraDIP', 21, AMBER, anchor='lm')
            label(d, (1019, 414), 'bDeploy', 18, DIM, anchor='lm')
        if time >= 10.8:
            route(d, [(977, 437), (977, 472), (501, 472)], ramp(time, 10.8), LINE)
            route(d, [(977, 472), (1117, 472)], ramp(time, 11.1), LINE)
            label(d, (443, 451), s['testnet'], 16, DIM, anchor='lm')
            if time >= 13:
                label(d, (1194, 451), 'PXE / TFTP', 18, AMBER, anchor='rm')
                if not 16 <= time < 18.6:
                    route(d, [(977, 437), (977, 472), (501, 472), (501, 500)], colour=AMBER, packet=time*.52)
            for i, x in enumerate(CLIENT_X):
                if time < 11+i*.3:
                    continue
                route(d, [(x, 472), (x, 500)], colour=LINE)
                colour, screen, progress, success = DIM, None, None, False
                if i == 0 and time >= 13:
                    colour, screen = AMBER, 'PXE'
                    if 16 <= time < 18.6:
                        colour, screen = RED, 'PXE !'
                    elif 20 <= time < 23:
                        colour, screen = RED, 'WinPE !'
                    elif 23 <= time < 25:
                        screen = 'WinPE'
                    elif 25 <= time < 28:
                        colour, screen = RED, 'Setup !'
                    elif 28 <= time < 30:
                        screen, progress = 'Win 11', ramp(time, 28, 2)
                if i < 4 and time >= 30:
                    screen = 'windows'
                    progress = ramp(time, 30+i*.65, 1.8)
                    colour = AMBER
                    if time >= 32+i*.55:
                        screen, progress = 'apps', None
                    if time >= 35+i*.23:
                        screen, colour, success = 'windows', GREEN, True
                    route(d, [(977, 437), (977, 472), (x, 472), (x, 500)], colour=AMBER if time < 35 else GREEN, packet=time*.55+i*.2)
                pc(d, x, 525, colour, screen, progress, success)
                label(d, (x, 566), f'{i+1:02d}' if i < 4 else f'05 · {s["planned"]}', 16, DIM)
            if time >= 33.5:
                # Return path represents agent inventory/status reports to bMS.
                route(d, [(465, 526), (433, 526), (433, 369), (550, 369), (550, 355)], colour=CYAN, packet=time*.4)
        # Erroneous PXE response crosses the visual PoC boundary, then is isolated.
        if 16 <= time < 20:
            points = [(237, 291), (399, 291), (399, 488), (501, 488), (501, 500)]
            if time < 18.6:
                route(d, points, ramp(time, 16, .6), RED, time*.7, 3)
                cross(d, 399, 436)
            else:
                route(d, points, colour=LINE)
                d.rounded_rectangle((383, 406, 416, 443), radius=4, fill=VOID, outline=AMBER, width=2)
                d.line((390, 435, 408, 414), fill=AMBER, width=3)
                check(d, 535, 495)
        if 20 <= time < 25:
            network_adapter(d, 710, 435, time >= 23)
            if time >= 23:
                route(d, [(710, 458), (710, 472), (501, 472), (501, 500)], colour=GREEN, packet=time*.65)
        if 25 <= time < 30:
            key(d, 710, 433, time >= 28)
            if time >= 28:
                route(d, [(710, 458), (710, 472), (501, 472), (501, 500)], colour=GREEN, packet=time*.65)

    # One compact status strip: the topology carries the explanation.
    d.line((40, 603, 1240, 603), fill=LINE)
    if scene == 0:
        label(d, (40, 635), s['intro'], 24, INK, anchor='lm')
    elif scene == 1:
        server(d, 68, 644)
        label(d, (114, 628), s['base'], 24, INK, anchor='lm')
        label(d, (114, 657), s['permissions'] + ' · MSSQL · TLS', 20, DIM, anchor='lm')
    elif scene in [2, 3]:
        labels = ['DIP', 'PXE / TFTP', 'WinPE', 'Windows 11']
        for i, value in enumerate(labels):
            x = 80+i*300
            label(d, (x, 640), value, 25, AMBER if time >= 13 else DIM, anchor='lm')
            if i < 3:
                label(d, (x+236, 640), '→', 29, AMBER)
    elif 4 <= scene <= 6:
        fault = scene-4
        fixed = time >= [18.6, 23, 28][fault]
        if fixed:
            check(d, 63, 638, scale=1.5)
        else:
            d.ellipse((43, 618, 83, 658), outline=RED, width=2)
            label(d, (63, 638), '!', 29, RED, True)
        label(d, (108, 626), s['faults'][fault], 23, DIM if fixed else RED, anchor='lm')
        label(d, (108, 658), s['fixes'][fault] if fixed else s['pending'], 24, GREEN if fixed else DIM, anchor='lm')
        if fixed:
            label(d, (1240, 638), s['fixed'], 19, GREEN, True, 'rm')
    elif scene == 7:
        windows(d, 64, 638)
        label(d, (98, 638), 'Windows 11', 23, INK, anchor='lm')
        label(d, (351, 638), '→', 28, AMBER)
        label(d, (419, 638), s['software'], 24, AMBER, anchor='lm')
        label(d, (771, 638), '→', 28, AMBER)
        label(d, (839, 638), s['inventory'], 24, CYAN, anchor='lm')
    else:
        label(d, (40, 640), '4 / 4', 48, GREEN, True, 'lm')
        label(d, (192, 626), s['result'], 23, INK, anchor='lm')
        label(d, (192, 657), s['count'], 19, DIM, anchor='lm')
        label(d, (1240, 626), '100 %', 30, GREEN, True, 'rm')
    label(d, (40, 697), s['pilotOnly'] if scene == 8 else s['scope'], 15, DIM, anchor='lm')
    label(d, (1240, 697), f'{min(42, int(time)):02d} / 42 s', 15, DIM, anchor='rm')
    d.line((40, 680, 1240, 680), fill=LINE, width=2)
    d.line((40, 680, 40+1200*time/42, 680), fill=AMBER, width=3)
    if not poster and time < .5:
        im = Image.blend(BASE, im, ramp(time, 0, .5))
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for language, s in STORY.items():
        # Completed topology makes the film's visual subject clear before playback.
        frame(language, 38, poster=True).save(OUT/f'IHK_Poster_{language.upper()}.webp', quality=92)
        command = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo',
                   '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{WIDTH}x{HEIGHT}',
                   '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'medium',
                   '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(OUT/s['file'])]
        process = subprocess.Popen(command, stdin=subprocess.PIPE)
        try:
            for i in range(FPS*DURATION):
                process.stdin.write(frame(language, i/FPS).tobytes())
        finally:
            process.stdin.close()
        if process.wait():
            raise RuntimeError(f'FFmpeg failed for {language}')
        print(f'{s["file"]}: {(OUT/s["file"]).stat().st_size} bytes', flush=True)


if __name__ == '__main__':
    main()
