"""Render both silent project films and posters locally with Pillow and FFmpeg.

Usage: python scripts/ihk/build_films.py
Requires Pillow, ffmpeg and the standard DejaVu Sans font family.
"""
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ihk'
WIDTH, HEIGHT, FPS, DURATION = 1280, 720, 24, 42
FONT_ROOT = Path('/usr/share/fonts/truetype/dejavu')
INK, DIM, AMBER, LINE, CYAN = '#d4e8f8', '#95aabd', '#e8a45a', '#263a4e', '#78bfff'
STORY = {
    'de': {
        'file': 'IHK_Projektfilm_DE.mp4',
        'project': 'IHK-ABSCHLUSSPROJEKT',
        'scope': 'PILOTIERUNG / PROOF OF CONCEPT',
        'titles': ['Endpoint Management', 'Von der Ausgangslage zum Pilot', 'Die Infrastruktur',
                   'Automatisiertes OS-Deployment', 'Vom Betriebssystem zum Client',
                   'Strukturierte Fehleranalyse', 'Pilot erfolgreich'],
        'intro': 'Migration der Infrastruktur',
        'from': 'Matrix42 Empirum → baramundi Management Suite',
        'pilot': 'Pilotierung / Analyse',
        'software': 'Basissoftware', 'inventory': 'Inventarisierung', 'clients': 'Referenzclients',
        'faults': ['Empirum-/PXE-Interferenz', 'WinPE-Netzwerktreiber fehlt', 'ProductKey fehlt'],
        'fixes': ['Wartungsfenster / Gegenprüfung', 'Passenden Treiber integriert', 'Installationsschlüssel hinterlegt'],
        'fixed': 'Behoben · anschließende Testläufe erfolgreich',
        'result': 'abgeschlossene Testrollouts erfolgreich',
        'proof': 'Technische Funktionsfähigkeit nachgewiesen',
        'planned': '5 vorgesehen · 4 im Zeitfenster abgeschlossen',
        'hours': '40 h Netto-Projektzeit',
    },
    'en': {
        'file': 'IHK_Project_Film_EN.mp4',
        'project': 'IHK FINAL PROJECT',
        'scope': 'PILOT / PROOF OF CONCEPT',
        'titles': ['Endpoint Management', 'From the starting point to a pilot', 'The infrastructure',
                   'Automated OS deployment', 'From operating system to client',
                   'Structured fault analysis', 'Pilot successful'],
        'intro': 'Infrastructure migration',
        'from': 'Matrix42 Empirum → baramundi Management Suite',
        'pilot': 'Pilot / analysis',
        'software': 'Baseline software', 'inventory': 'Inventory collection', 'clients': 'Reference clients',
        'faults': ['Empirum/PXE interference', 'Missing WinPE network driver', 'Missing ProductKey'],
        'fixes': ['Maintenance window / cross-check', 'Compatible driver integrated', 'Installation key supplied'],
        'fixed': 'Resolved · subsequent test runs successful',
        'result': 'completed test rollouts successful',
        'proof': 'Technical feasibility demonstrated',
        'planned': '5 planned · 4 completed within the time available',
        'hours': '40 h net project time',
    },
}


FONTS = {}
def font(size, bold=False):
    key=(size,bold)
    if key not in FONTS:
        FONTS[key]=ImageFont.truetype(str(FONT_ROOT / ('DejaVuSansCondensed-Bold.ttf' if bold else 'DejaVuSansCondensed.ttf')),size)
    return FONTS[key]


def label(draw, xy, value, size=28, colour=INK, bold=False, anchor='mm'):
    draw.text(xy,value,font=font(size,bold),fill=colour,anchor=anchor)


def background():
    im=Image.new('RGB',(WIDTH,HEIGHT))
    d=ImageDraw.Draw(im)
    for y in range(HEIGHT):
        f=math.sin(y/HEIGHT*math.pi)
        d.line((0,y,WIDTH,y),fill=(int(3+4*f),int(6+9*f),int(13+13*f)))
    for x in range(64,WIDTH,64):d.line((x,90,x,630),fill='#0d1926')
    for y in range(118,630,64):d.line((50,y,1230,y),fill='#0d1926')
    for x,y,sx,sy in [(28,28,1,1),(1252,28,-1,1),(28,692,1,-1),(1252,692,-1,-1)]:
        d.line((x+22*sx,y,x,y,x,y+22*sy),fill=LINE,width=2)
    return im


BASE=background()


def arrow(draw,a,b,progress=1):
    if progress<=0:return
    x=a[0]+(b[0]-a[0])*progress;y=a[1]+(b[1]-a[1])*progress
    draw.line((*a,x,y),fill=AMBER,width=2)
    if progress>=1:
        angle=math.atan2(b[1]-a[1],b[0]-a[0])
        draw.line((x-9*math.cos(angle-.55),y-9*math.sin(angle-.55),x,y,
                   x-9*math.cos(angle+.55),y-9*math.sin(angle+.55)),fill=AMBER,width=2)


def node(draw,xy,text,active=True,width=340,size=27):
    x,y=xy
    draw.rounded_rectangle((x-width/2,y-31,x+width/2,y+31),radius=4,
                           fill='#0b1725',outline=AMBER if active else LINE,width=2 if active else 1)
    label(draw,(x,y),text,size,INK if active else DIM)


def frame(language,time,poster=False):
    s=STORY[language]
    bounds=[0,4,9,17,25,31,37,42]
    scene=max(i for i in range(7) if time>=bounds[i]);local=time-bounds[scene]
    im=BASE.copy();d=ImageDraw.Draw(im)
    label(d,(64,56),s['project'],18,AMBER,True,'lm')
    label(d,(1216,56),'VL / 2026',16,DIM,False,'rm')
    d.line((64,87,1216,87),fill=LINE)
    label(d,(64,126),f'0{scene+1} / 07',17,AMBER,False,'lm')
    label(d,(64,186),s['titles'][scene],44,INK,True,'lm')
    label(d,(64,656),s['scope'],15,DIM,False,'lm')
    label(d,(1216,656),f'{min(42,int(time)):02d} / 42 s',15,DIM,False,'rm')
    d.line((64,680,1216,680),fill=LINE,width=2)
    d.line((64,680,64+1152*time/42,680),fill=AMBER,width=3)
    if scene==0:
        label(d,(64,292),s['intro'],34,INK,False,'lm')
        label(d,(64,353),'Matrix42 Empirum',27,DIM,False,'lm')
        arrow(d,(64,393),(460,393),min(1,local/1.5))
        label(d,(64,447),'baramundi Management Suite',30,AMBER,False,'lm')
        label(d,(64,542),s['hours'],21,DIM,False,'lm')
        cx,cy=990,386
        for radius in [105,140,175]:
            d.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),outline=LINE,width=1)
        angle=(local*.08-.9)
        d.arc((cx-140,cy-140,cx+140,cy+140),-80,-5+local*8,fill=AMBER,width=2)
        x=cx+140*math.cos(angle);y=cy+140*math.sin(angle)
        d.ellipse((x-5,y-5,x+5,y+5),fill=AMBER)
        label(d,(cx,cy-7),'PoC',55,AMBER,True)
        label(d,(cx,cy+44),'2026',19,DIM)
    elif scene==1:
        node(d,(640,316),'Matrix42 Empirum',width=580,size=34)
        arrow(d,(640,350),(640,440),min(1,local/1.7))
        node(d,(640,477),s['pilot'],local>1,width=580,size=34)
        label(d,(640,564),'baramundi Management Suite',24,DIM)
    elif scene==2:
        values=['VMware vSphere','Windows Server 2022','baramundi Management Suite']
        for i,value in enumerate(values):
            y=276+i*103;node(d,(640,y),value,local>i*.75,width=520)
            if i<2:arrow(d,(640,y+31),(640,y+72),max(0,min(1,(local-i*.75)/.6)))
        arrow(d,(640,513),(420,555),min(1,max(0,(local-2)/.6)))
        arrow(d,(640,513),(860,555),min(1,max(0,(local-2)/.6)))
        node(d,(380,586),'MSSQL',local>2,width=280)
        node(d,(900,586),'DIP / baraDIP',local>2,width=280)
    elif scene in [3,4]:
        values=['DIP','PXE / TFTP','WinPE','Windows 11'] if scene==3 else ['Windows 11',s['software'],s['inventory'],s['clients']]
        for i,value in enumerate(values):
            x=190+i*300
            node(d,(x,378),value,local>i*.7,width=252,size=25)
            label(d,(x,303),f'0{i+1}',17,AMBER)
            if i<3:arrow(d,(x+126,378),(x+172,378),min(1,max(0,(local-i*.7)/.6)))
        label(d,(640,490),'Windows ADK · DISM · Boot Media Wizard' if scene==3 else 'bDeploy · baramundi Management Agent',24,DIM)
        label(d,(640,551),s['planned'] if scene==4 else 'UEFI · boot.wim · install.wim',19,DIM)
    elif scene==5:
        for i,(fault,fix) in enumerate(zip(s['faults'],s['fixes'])):
            y=291+i*94
            label(d,(75,y),f'0{i+1}',20,AMBER,True,'lm')
            label(d,(136,y),fault,28,INK,False,'lm')
            arrow(d,(590,y),(648,y),min(1,max(0,(local-i*.7)/.5)))
            label(d,(680,y),fix,23,AMBER if local>i*.7 else DIM,False,'lm')
        label(d,(640,592),s['fixed'],25,AMBER)
    else:
        label(d,(640,333),'4 / 4',110,AMBER,True)
        label(d,(640,431),s['result'],30,INK)
        label(d,(640,503),s['proof'],27,INK)
        label(d,(640,558),s['planned'],21,DIM)
    # Gentle short crossfades; no flashes, zooms or continuous motion in text.
    if not poster:
        alpha=min(1,local/.4,(bounds[scene+1]-time)/.35)
        if alpha<1:im=Image.blend(BASE,im,max(.0,alpha))
    return im


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    for language,s in STORY.items():
        frame(language,2.8,poster=True).save(OUT/f'IHK_Poster_{language.upper()}.webp',quality=90)
        command=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-vcodec','rawvideo',
                 '-pix_fmt','rgb24','-s',f'{WIDTH}x{HEIGHT}','-r',str(FPS),'-i','-',
                 '-an','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p',
                 '-movflags','+faststart',str(OUT/s['file'])]
        process=subprocess.Popen(command,stdin=subprocess.PIPE)
        try:
            for i in range(FPS*DURATION):process.stdin.write(frame(language,i/FPS).tobytes())
        finally:process.stdin.close()
        if process.wait():raise RuntimeError(f'FFmpeg failed for {language}')
        print(f'{s["file"]}: {(OUT/s["file"]).stat().st_size} bytes',flush=True)


if __name__=='__main__':main()
