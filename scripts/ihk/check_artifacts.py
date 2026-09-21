"""Validate report integrity, caption typography, TOC destinations and MP4 encoding.

Requires pymupdf and Pillow. Run after build_reports.py and npm run build.
The original reference PDF is read only. Results are printed as JSON.
"""
import json
import re
import struct
import subprocess
from pathlib import Path

import pymupdf
from PIL import Image, ImageChops, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'Projektarbeit/Vladimir_Leicht_20260531_Projektarbeit_v1.pdf'
PUBLIC=ROOT/'public/ihk'
original=pymupdf.open(SOURCE)
result={}


def pixels(page):
    pix=page.get_pixmap(matrix=pymupdf.Matrix(1.5,1.5),alpha=False)
    return Image.frombytes('RGB',(pix.width,pix.height),pix.samples)


for language,filename in [('DE','IHK_Projektarbeit_DE.pdf'),('EN','IHK_Project_Report_EN.pdf')]:
    doc=pymupdf.open(PUBLIC/filename)
    assert not doc.is_repaired
    whole='\n'.join(page.get_text() for page in doc)
    assert 'Verwendete Hilfsmittel' not in whole
    assert not re.search(r'Tools Used|Tools and Aids|ChatGPT|GIMP',whole,re.I)
    assert all(page.get_text().strip() for page in doc)
    captions=[];out_of_bounds=[];overlaps=[]
    for page_no,page in enumerate(doc,1):
        for block in page.get_text('dict')['blocks']:
            if block['type']!=0:continue
            spans=[s for line in block['lines'] for s in line['spans'] if s['text'].strip()]
            text=' '.join(s['text'] for s in spans)
            if re.match(r'^(Figure \d+:|Chart 1:|Abbildung \d+:|Abbild 44:|Diagramm 1:)',text):
                italic=all(s['flags'] & 2 for s in spans)
                bold=any(s['flags'] & 16 for s in spans)
                captions.append({'page':page_no,'label':text.split(':')[0],'italic':italic,'bold':bold})
                if language=='EN':
                    assert italic and not bold, text
                    assert all(abs(s['size']-11)<.1 for s in spans),text
                    images=page.get_image_info()
                    assert any(im['bbox'][3] <= block['bbox'][1]+1 and block['bbox'][1]-im['bbox'][3]<55 for im in images),text
            for span in spans:
                box=pymupdf.Rect(span['bbox'])
                if not page.rect.contains(box):out_of_bounds.append((page_no,span['text'][:30]))
                if language=='EN':
                    for im in page.get_image_info():
                        overlap=box & pymupdf.Rect(im['bbox'])
                        if not overlap.is_empty and overlap.height>2:overlaps.append((page_no,span['text'][:30]))
        for im in page.get_image_info():
            if not page.rect.contains(pymupdf.Rect(im['bbox'])):
                if language=='EN':raise AssertionError(f'Image beyond page {page_no}')
                out_of_bounds.append((page_no,'Source image bounds extend beyond page'))
    if language=='EN':
        assert len(captions)==46,len(captions)
        assert not out_of_bounds,out_of_bounds
        assert not overlaps,overlaps
        # Native PDF TOC links must resolve to the title on the actual destination page.
        toc_links=[]
        for page in [doc[1],doc[2]]:
            for link in page.get_links():
                if link['kind']!=pymupdf.LINK_GOTO:continue
                title=page.get_textbox(link['from']).strip().rstrip('.')
                # Link rectangle can cover only part of a wrapped title; check its text.
                assert re.sub(r'\s+','',title) in re.sub(r'\s+','',doc[link['page']].get_text()),title
                # The right-aligned number on the same TOC line must match the target.
                rect=pymupdf.Rect(538,link['from'].y0-1,558,link['from'].y1+1)
                number=page.get_textbox(rect).strip().lstrip('. ').strip()
                assert number==str(link['page']+1),(title,number,link['page']+1)
                toc_links.append(link)
        assert len(toc_links)==34,len(toc_links)
        result['en_toc_destinations']=len(toc_links)
    else:
        assert len(doc)==49
        for i,page in enumerate(doc):
            a,b=pixels(original[i]),pixels(page)
            if i in [2,48]:
                rect=original[i].search_for('Verwendete Hilfsmittel')[0]
                if i==2:rect=pymupdf.Rect(65,rect.y0-2,560,rect.y1+2)
                else:rect=pymupdf.Rect(0,rect.y0-3,page.rect.width,page.rect.height)
                r=(int(rect.x0*1.5)-2,int(rect.y0*1.5)-2,int(rect.x1*1.5)+2,int(rect.y1*1.5)+2)
                ImageDraw.Draw(a).rectangle(r,fill='white');ImageDraw.Draw(b).rectangle(r,fill='white')
            assert ImageChops.difference(a,b).getbbox() is None,f'DE changed outside removal on page {i+1}'
        result['de_pixel_comparison']='All 49 retained pages identical outside the removed section and TOC entry'
    result[language]={'pages':len(doc),'captions':len(captions),
                      'source_caption_format_exceptions':[c for c in captions if not c['italic'] or c['bold']],
                      'out_of_bounds':out_of_bounds}

for name in ['IHK_Projektfilm_DE.mp4','IHK_Project_Film_EN.mp4']:
    path=PUBLIC/name
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))
    assert len(probe['streams'])==1
    video=probe['streams'][0]
    assert video['codec_name']=='h264' and video['pix_fmt']=='yuv420p'
    assert video['width']==1280 and video['height']==720
    assert float(probe['format']['duration'])==42
    subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(path),'-f','null','-'],check=True)
    data=path.read_bytes();pos=0;atoms=[]
    while pos<len(data):
        size,kind=struct.unpack('>I4s',data[pos:pos+8]);atoms.append(kind)
        assert size>=8
        pos+=size
    assert atoms.index(b'moov')<atoms.index(b'mdat'),'MP4 must use faststart'
    result[name]={'bytes':len(data),'duration':42,'codec':'h264','pixel_format':'yuv420p','audio':False,'faststart':True,'decode':'PASS'}

for path in PUBLIC.iterdir():
    assert path.stat().st_size<25*1024*1024,path
    built=ROOT/'dist/ihk'/path.name
    assert built.read_bytes()==path.read_bytes(),f'Stale or missing build artifact: {path.name}'
print(json.dumps(result,indent=2))
