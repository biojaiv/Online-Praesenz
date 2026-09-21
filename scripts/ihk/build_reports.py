"""Build the website reports from the supplied DOCX and its reference PDF.

Dependencies: python-docx, pymupdf, reportlab; LibreOffice on PATH.
Usage: python build_reports.py --source /path/to/original.docx --reference /path/to/original.pdf
All intermediate files stay in a temporary directory. Source files are never written.
"""
import argparse
import io
import json
import re
import subprocess
import tempfile
from pathlib import Path

import pymupdf
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ihk'
TRANSLATION = json.loads(Path(__file__).with_name('report.en.json').read_text())
HEADINGS = [39, 41, 43, 80, 83, 91, 92, 98, 111, 117, 121, 144, 149,
            158, 175, 182, 197, 202, 206, 207, 211, 221, 222, 231,
            241, 243, 266, 267, 271, 304, 305, 309, 312, 371]
CAPTIONS = [95,101,103,107,109,114,116,120,135,138,140,142,148,153,157,
            170,172,174,178,181,185,187,189,191,193,195,201,205,210,215,
            218,220,225,229,235,237,239,250,253,259,262,265]
UNCHANGED = {56,57,59,60,61,63,65,67,69,71,72,74,76,163,255,256,257,
             277,280,283,286,289,292,295}


def element(name, **attrs):
    e = OxmlElement(name)
    for key, value in attrs.items():
        e.set(qn(key.replace('_', ':')), str(value))
    return e


def bookmark(p, name, number):
    p._p.append(element('w:bookmarkStart', w_id=number, w_name=name))
    p._p.append(element('w:bookmarkEnd', w_id=number))


def link(p, label, target, external=False, colour='1F4E79'):
    h = element('w:hyperlink')
    if external:
        rid = p.part.relate_to(target, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', is_external=True)
        h.set(qn('r:id'), rid)
    else:
        h.set(qn('w:anchor'), target)
    r = element('w:r')
    pr = element('w:rPr')
    pr.append(element('w:color', w_val=colour))
    r.append(pr)
    text = element('w:t'); text.text = label
    r.append(text); h.append(r); p._p.append(h)


def export(docx, folder):
    result = subprocess.run(['libreoffice', f'-env:UserInstallation=file://{folder}/lo',
                             '--headless', '--convert-to', 'pdf', '--outdir', str(folder), str(docx)],
                            check=True, capture_output=True, text=True)
    pdf = Path(folder) / (docx.stem + '.pdf')
    if not pdf.exists():
        raise RuntimeError(result.stdout + result.stderr)
    return pdf


def chart(kind):
    """Translate the report's diagrams from its numeric data, retaining their palette."""
    buf = io.BytesIO()
    w, h = (960, 510) if kind == 'cost' else (960, 360) if kind == 'time' else (1200, 260)
    c = canvas.Canvas(buf, pagesize=(w, h))
    c.setFillColorRGB(1,1,1); c.rect(0,0,w,h,fill=1,stroke=0)
    c.setFillColorRGB(.12,.16,.2); c.setFont('Helvetica-Bold',20)
    title = {'cost':'Five-year cost comparison (net of VAT)', 'time':'Distribution of project time (40.0 h)', 'process':'WINDOWS OS DEPLOYMENT PROCESS'}[kind]
    c.drawCentredString(w/2,h-35,title)
    if kind == 'cost':
        values=[160200,175715,187620,200480,221280,231715]
        labels=[['Subscription','5 years'],['Purchase +','maintenance','5 years'],['Subscription','3 years'],
                ['Purchase +','maintenance','3 years'],['Subscription','1 year'],['Purchase +','maintenance','1 year']]
        x0,y0,plot_height=95,105,320
        for tick in range(0,250001,50000):
            y=y0+plot_height*tick/250000
            c.setStrokeColorRGB(.87,.87,.87);c.line(x0,y,925,y)
            c.setFillColorRGB(.3,.3,.3);c.setFont('Helvetica',13);c.drawRightString(x0-10,y-4,f'{tick:,}')
        for i,(value,lines) in enumerate(zip(values,labels)):
            x=130+i*135;bar_height=plot_height*value/250000
            c.setFillColorRGB(*((.34,.63,.38) if i==0 else (.74,.29,.29) if i==5 else (.36,.57,.74)))
            c.rect(x,y0,60,bar_height,fill=1,stroke=0)
            c.setFillColorRGB(.12,.16,.2);c.setFont('Helvetica-Bold',14)
            c.drawCentredString(x+30,y0+bar_height+12,f'€{value:,.2f}')
            c.setFont('Helvetica',13)
            for j,line in enumerate(lines):c.drawCentredString(x+30,y0-22-j*17,line)
    elif kind == 'time':
        labels = (['Subscription · 5 years','Purchase + maintenance · 5 years','Subscription · 3 years',
                   'Purchase + maintenance · 3 years','Subscription · 1 year','Purchase + maintenance · 1 year']
                  if kind=='cost' else ['Implementation','Documentation','Contingency, research and coordination'])
        values = [160200,175715,187620,200480,221280,231715] if kind=='cost' else [21.6,10.4,8.0]
        x = 340 if kind=='cost' else 380
        usable=w-x-45; maxval=max(values)
        for i,(label,value) in enumerate(zip(labels,values)):
            y=h-105-i*(62 if kind=='cost' else 80)
            c.setFillColorRGB(.12,.16,.2); c.setFont('Helvetica',16)
            # Long labels are wrapped instead of clipped as in the source time chart.
            if len(label)>37:
                a,b=label.rsplit(' and ',1); c.drawRightString(x-15,y+19,a+' and');c.drawRightString(x-15,y,b)
            else:c.drawRightString(x-15,y+8,label)
            colours=[(.12,.30,.46),(.34,.61,.79),(.62,.62,.62)]
            c.setFillColorRGB(*colours[min(i,2)]); c.roundRect(x,y-4,usable*value/maxval,36,5,fill=1,stroke=0)
            c.setFillColorRGB(1,1,1); c.setFont('Helvetica-Bold',16)
            c.drawRightString(x+usable*value/maxval-12,y+8,f'€{value:,.2f}' if kind=='cost' else f'{value:.1f} h')
    else:
        rows=[['Step 1','Windows ISO','integration','ISO import → install.wim'],
              ['Step 2','WIM preparation','/ base image','Edition → mount → bOCT'],
              ['Step 3 (optional)','Image customisation','(drivers / updates)','DISM → save changes'],
              ['Step 4','Provisioning in','the bMS module','OS-Install → job → profile'],
              ['Step 5','Creating the','boot media','WinPE → drivers → wizard'],
              ['Step 6','Client startup','and installation','WinPE → WIM → setup']]
        for i,lines in enumerate(rows):
            x=20+i*197
            c.setStrokeColorRGB(.12,.30,.46);c.setFillColorRGB(.93,.96,.99)
            c.roundRect(x,60,174,120,4,fill=1,stroke=1)
            c.setFillColorRGB(.12,.30,.46)
            for j,line in enumerate(lines):
                c.setFont('Helvetica-Bold' if j<3 else 'Helvetica',12 if j<3 else 10)
                c.drawCentredString(x+87,160-j*25,line)
            if i<5:
                c.line(x+174,120,x+195,120);c.line(x+191,124,x+195,120);c.line(x+191,116,x+195,120)
    c.save()
    pdf=pymupdf.open(stream=buf.getvalue(),filetype='pdf')
    return pdf[0].get_pixmap(matrix=pymupdf.Matrix(1.5,1.5)).tobytes('png')


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);parser.add_argument('--reference',type=Path,required=True)
    args=parser.parse_args(); OUT.mkdir(parents=True,exist_ok=True)
    src=Document(args.source); ps=src.element.body.xpath('.//w:p')
    assert len(ps)==406, 'Source structure changed: review translation mapping first.'
    text=lambda i: ''.join(ps[i].xpath('.//w:t/text()'))
    missing=[i for i in range(39,397) if text(i).strip() and str(i) not in TRANSLATION and i not in UNCHANGED]
    assert not missing, f'Missing translations: {missing}'
    en=lambda i: TRANSLATION.get(str(i),text(i))
    # The PDF contains deliberate covers/redactions absent from the DOCX images.
    # Flatten each visible screenshot area from that reference, never expose the
    # unmasked DOCX image assets in the public translation or its editable source.
    reference=pymupdf.open(args.reference)
    locations=[(9,0),(10,0),(11,0),(12,0),(12,1),(13,0),(14,0),(14,1),
               (16,0),(17,0),(17,1),(18,0),(19,0),(20,0),(21,0),(22,0),
               (23,0),(23,1),(24,0),(24,1),(25,0),(25,1),(26,0),(26,1),
               (27,0),(27,1),(28,0),(29,0),(30,0),(31,0),(31,1),(32,0),
               (33,0),(34,0),(35,0),(35,1),(36,0),(37,0),(38,0),(38,1),
               (39,0),(39,1),(40,0),(40,2)]
    screenshots={}
    for number,(page_no,ordinal) in enumerate(locations,1):
        page=reference[page_no-1]
        pictures=sorted(page.get_image_info(),key=lambda im:(round(im['bbox'][1]),-im['bbox'][3]))
        rect=pymupdf.Rect(pictures[ordinal]['bbox'])
        # Figure 43 has an obscured extra source image; preserve the visible result.
        pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),clip=rect,alpha=False)
        screenshots[number]=(pix.tobytes('png'),rect.width,rect.height)
    with tempfile.TemporaryDirectory(prefix='ihk-report-') as temp:
        folder=Path(temp)
        # Remove the section in a working copy of the editable primary source.
        de=Document(args.source); dps=de.element.body.xpath('.//w:p')
        for child in list(dps[39]):
            for tab in child.xpath('.//w:tab'):
                tab.getparent().remove(tab)
            for tnode in child.xpath('.//w:t'):
                if tnode.text in ('Verwendete Hilfsmittel','50'):tnode.text=''
        for p in dps[397:]:p.getparent().remove(p)
        de_path=folder/'IHK_Projektarbeit_DE.docx';de.save(de_path)
        candidate=export(de_path,folder)
        # The source is laid out with floating images. Verify the complete retained text.
        rendered=pymupdf.open(candidate); original=pymupdf.open(args.reference)
        assert len(rendered)==49
        for i in range(49):
            expected=original[i].get_text()
            if i==2:expected=re.sub(r'Verwendete Hilfsmittel[^\n]*\n','',expected)
            if i==48:expected=expected[:expected.index('Verwendete Hilfsmittel')]
            normalise=lambda t: re.sub(r'\s+','',t)
            assert normalise(rendered[i].get_text())==normalise(expected), f'DE text shifted on page {i+1}'
        # Preserve the reference PDF's rendering exactly outside the requested removal.
        pdf=pymupdf.open(args.reference)
        for i in [2,48]:
            page=pdf[i]; rect=page.search_for('Verwendete Hilfsmittel')[0]
            if i==2:rect=pymupdf.Rect(65,rect.y0-1,560,rect.y1+1)
            else:rect=pymupdf.Rect(0,rect.y0-2,page.rect.width,page.rect.height)
            page.add_redact_annot(rect,fill=(1,1,1));page.apply_redactions()
        pdf.delete_page(49)
        pdf.save(OUT/'IHK_Projektarbeit_DE.pdf',garbage=4,deflate=True)

        doc=Document()
        section=doc.sections[0];source_section=src.sections[0]
        section.different_first_page_header_footer=True
        for attr in ['page_width','page_height','top_margin','bottom_margin','left_margin','right_margin']:
            setattr(section,attr,getattr(source_section,attr))
        normal=doc.styles['Normal'];normal.font.name='Times New Roman';normal.font.size=Pt(11)
        normal.paragraph_format.line_spacing=1.5;normal.paragraph_format.space_after=Pt(6)
        normal.paragraph_format.widow_control=True
        normal.element.get_or_add_rPr().append(element('w:lang',w_val='en-GB'))
        for name,size in [('Heading 1',14),('Heading 2',12),('Heading 3',12)]:
            s=doc.styles[name];s.font.name='Times New Roman';s.font.size=Pt(size);s.font.color.rgb=RGBColor(0,0,0)
            s.font.bold=True;s.paragraph_format.space_before=Pt(18);s.paragraph_format.space_after=Pt(9)
            s.paragraph_format.keep_with_next=True;s.paragraph_format.keep_together=True
        cap=doc.styles['Caption'];cap.font.name='Times New Roman';cap.font.size=Pt(11);cap.font.italic=True;cap.font.bold=False
        cap.font.color.rgb=RGBColor.from_string('1F4E79');cap.paragraph_format.line_spacing=1.15
        cap.paragraph_format.space_before=Pt(6);cap.paragraph_format.space_after=Pt(16.5);cap.paragraph_format.keep_together=True
        cap.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.CENTER
        doc.core_properties.author='Vladimir Leicht';doc.core_properties.title=en(0).replace('\n',' ')
        doc.core_properties.language='en-GB';doc.core_properties.subject='IHK Project Report — English translation'

        p=doc.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        r=p.add_run(en(0));r.bold=True;r.font.size=Pt(22)
        p=doc.add_paragraph(en(1));p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:r.italic=True;r.font.size=Pt(12)
        p=doc.add_paragraph(en(2));p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        doc.add_page_break();doc.add_paragraph('Contents','Heading 1')
        toc=[]
        for n,i in enumerate(HEADINGS):
            if n==24:doc.add_page_break()
            title=en(i).split('\n')[-1] if i==266 else en(i)
            p=doc.add_paragraph();p.paragraph_format.space_after=Pt(11)
            p.paragraph_format.line_spacing=Pt(16);p.paragraph_format.keep_together=True
            p.paragraph_format.tab_stops.add_tab_stop(Pt(482),WD_TAB_ALIGNMENT.RIGHT,WD_TAB_LEADER.DOTS)
            link(p,title,f'section_{i}',colour='000000');p.add_run('\t');num=p.add_run('00');toc.append((i,title,num))
        doc.add_page_break()
        # Numbers refer to physical PDF pages, so readers and download viewers agree.
        footer=section.footer.paragraphs[0];footer.alignment=WD_ALIGN_PARAGRAPH.RIGHT
        footer.add_run()._r.append(element('w:fldChar',w_fldCharType='begin'))
        r=footer.add_run();it=element('w:instrText');it.text=' PAGE ';r._r.append(it)
        footer.add_run()._r.append(element('w:fldChar',w_fldCharType='end'))

        seen_refs=set()
        def paragraph(value,style=None,index=None):
            p=doc.add_paragraph(style=style)
            if index in HEADINGS:bookmark(p,f'section_{index}',1000+index)
            if index and index>=372:bookmark(p,f'def_{index-371}',2000+index)
            # Retain both glossary cross-references and the source's external links.
            source_url=None
            if index and index>=372:
                h=ps[index].xpath('./w:hyperlink[@r:id]')
                if h:source_url=src.part.rels[h[0].get(qn('r:id'))].target_ref
            for token in re.split(r'(\[\d+\]|Source: .*?(?=\. \[Return)|\[Return to the reference in the report\])',value):
                m=re.fullmatch(r'\[(\d+)\]',token)
                if m:
                    n=m.group(1)
                    if n not in seen_refs:bookmark(p,f'ref_{n}',3000+int(n));seen_refs.add(n)
                    link(p,token,f'def_{n}')
                elif token.startswith('Source: ') and source_url:link(p,token,source_url,True)
                elif token=='[Return to the reference in the report]':link(p,token,f'ref_{index-371}')
                else:p.add_run(token)
            return p

        def picture(blob,width,height,caption=None):
            p=doc.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before=Pt(16.5);p.paragraph_format.space_after=Pt(0)
            p.paragraph_format.line_spacing=1;p.paragraph_format.keep_with_next=bool(caption)
            p.paragraph_format.keep_together=True
            scale=min(1,482/width,460/height)
            p.add_run().add_picture(io.BytesIO(blob),width=Pt(width*scale),height=Pt(height*scale))
            if caption:paragraph(caption,'Caption')

        def figure(number,caption):
            picture(*screenshots[number],caption)

        # Caption 23 intentionally repeats the same source screenshot as caption 21.
        figure_map=dict(zip(CAPTIONS,range(1,43)))
        assert len(figure_map)==42
        skip=set(range(274,301))
        for i in range(39,397):
            if i in skip or not text(i).strip():continue
            if i==88:
                picture(chart('cost'),482,256,en(i));continue
            if i in figure_map:figure(figure_map[i],en(i));continue
            if i==266:
                # image43 is fully obscured by image45 in the reference PDF.
                # Use the visible completed rollout evidence, followed by the client list.
                a,b,h=en(i).split('\n');figure(43,a);figure(44,b)
                paragraph(h,'Heading 1',i);continue
            if i==302:picture(chart('time'),482,181,en(i));continue
            if i==342:picture(chart('process'),482,104)
            if i==271:
                paragraph(en(i),'Heading 2',i);continue
            if i==273:
                paragraph(en(i),index=i)
                table=doc.add_table(rows=0,cols=3);table.autofit=False
                widths=[171,242,69]
                for col,width in zip(table.columns,widths):col.width=Pt(width)
                for row_idx in range(9):
                    cells=table.add_row().cells
                    for col,cell in enumerate(cells):
                        cell.width=Pt(widths[col]);j=274+row_idx*3+col
                        cell.text=en(j)
                        for p in cell.paragraphs:
                            p.paragraph_format.line_spacing=1.15;p.paragraph_format.space_after=Pt(7)
                            if row_idx==0:
                                for r in p.runs:r.bold=True
                    table.rows[-1]._tr.get_or_add_trPr().append(element('w:cantSplit'))
                    if row_idx==0:table.rows[-1]._tr.get_or_add_trPr().append(element('w:tblHeader'))
                continue
            value=en(i)
            if i in HEADINGS:
                depth=len(value.split()[0].rstrip('.').split('.')) if not value.startswith('Appendix') else 1
                paragraph(value,f'Heading {min(3,depth)}',i)
            elif i in [342,347,352,357,362,367]:paragraph(value,'Heading 3',i)
            elif 316<=i<=337:
                p=paragraph(value,'List Bullet' if i in [316,319,323,327,332,335] else 'List Bullet 2',i)
                p.paragraph_format.space_after=Pt(2)
                if i in [316,319,323,327,332,335]:p.paragraph_format.keep_with_next=True
            elif i in [125,126,127,255,256,257] or 343<=i<=370:
                paragraph(value,'List Bullet',i)
            else:paragraph(value,index=i)

        path=folder/'IHK_Project_Report_EN.docx'
        # Iterative export resolves all TOC entries against the final pagination.
        old=None
        for iteration in range(5):
            doc.save(path);pdfpath=export(path,folder);pdf=pymupdf.open(pdfpath)
            assert '1. Introduction' in pdf[3].get_text(), 'Contents must occupy exactly two pages'
            found={}
            for page_no,page in enumerate(pdf):
                if page_no<3:continue
                flat=re.sub(r'\s+','',page.get_text())
                for i,title,_ in toc:
                    if re.sub(r'\s+','',title) in flat and i not in found:found[i]=page_no+1
            assert len(found)==len(toc),f'Headings not found: {set(HEADINGS)-found.keys()}'
            for i,_,r in toc:r.text=str(found[i])
            if found==old:break
            old=found
        else:raise RuntimeError('TOC pagination did not converge')
        (OUT/'IHK_Project_Report_EN.pdf').write_bytes(pdfpath.read_bytes())
        # Only the English editable source contains the flattened reference covers.
        # Never publish the working German DOCX: its underlying images are unmasked.
        editable=ROOT/'Projektarbeit/Webfassungen';editable.mkdir(parents=True,exist_ok=True)
        (editable/path.name).write_bytes(path.read_bytes())
        print(json.dumps({'de_pages':49,'en_pages':len(pdf),'toc':found},indent=2))


if __name__=='__main__':main()
