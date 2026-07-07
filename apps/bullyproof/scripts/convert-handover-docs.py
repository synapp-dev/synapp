"""
Converts the handover markdown documents (deliverable D6 and the acceptance
paperwork) to Word .docx for the client package.

Usage (from apps/bullyproof):
    python scripts/convert-handover-docs.py docs/handover/admin-user-guide.md ...

Writes a .docx next to each input with the same basename. Handles the
markdown subset the handover docs use: headings, paragraphs, bullet and
numbered lists (one nesting level), GFM pipe tables, fenced code blocks,
horizontal rules, bold / italic / inline code / links.
"""

import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, RGBColor

INK = RGBColor(0x1F, 0x29, 0x37)
CODE_INK = RGBColor(0x3E, 0x45, 0x4E)

INLINE_TOKEN = re.compile(
    r"(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))"
)
LINK = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def add_inline(paragraph, text):
    """Render markdown inline formatting into runs on the paragraph."""
    for part in INLINE_TOKEN.split(text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run = paragraph.add_run(part[2:-2])
            run.bold = True
        elif part.startswith("*") and part.endswith("*") and len(part) > 2:
            run = paragraph.add_run(part[1:-1])
            run.italic = True
        elif part.startswith("`") and part.endswith("`"):
            run = paragraph.add_run(part[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt(9.5)
            run.font.color.rgb = CODE_INK
        else:
            match = LINK.fullmatch(part)
            if match:
                label, url = match.group(1), match.group(2)
                run = paragraph.add_run(label)
                run.bold = True
                if url != label:
                    paragraph.add_run(f" ({url})")
            else:
                paragraph.add_run(part)


def is_table_row(line):
    return line.strip().startswith("|") and line.strip().endswith("|")


def split_row(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def convert(md_path: Path) -> Path:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(10.5)
    style.font.color.rgb = INK

    lines = md_path.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped.startswith("```"):
            i += 1
            code_lines = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1  # closing fence
            for code_line in code_lines or [""]:
                paragraph = doc.add_paragraph()
                paragraph.paragraph_format.left_indent = Pt(18)
                paragraph.paragraph_format.space_after = Pt(0)
                run = paragraph.add_run(code_line if code_line else " ")
                run.font.name = "Consolas"
                run.font.size = Pt(9)
                run.font.color.rgb = CODE_INK
            continue

        heading = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if heading:
            level = len(heading.group(1))
            paragraph = doc.add_heading("", level=level)
            add_inline(paragraph, heading.group(2).strip())
            for run in paragraph.runs:
                run.font.color.rgb = INK
            i += 1
            continue

        if re.fullmatch(r"[-*_]{3,}", stripped):
            paragraph = doc.add_paragraph()
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = paragraph.add_run("•  •  •")
            run.font.size = Pt(8)
            i += 1
            continue

        if is_table_row(stripped) and i + 1 < len(lines) and re.match(
            r"^\|[\s:|-]+\|$", lines[i + 1].strip()
        ):
            header = split_row(stripped)
            i += 2
            body = []
            while i < len(lines) and is_table_row(lines[i]):
                body.append(split_row(lines[i]))
                i += 1
            table = doc.add_table(rows=1, cols=len(header))
            table.style = "Table Grid"
            table.alignment = WD_TABLE_ALIGNMENT.LEFT
            for col, text in enumerate(header):
                cell = table.rows[0].cells[col]
                cell.text = ""
                paragraph = cell.paragraphs[0]
                add_inline(paragraph, text)
                for run in paragraph.runs:
                    run.bold = True
                    run.font.size = Pt(9.5)
            for row_values in body:
                row = table.add_row()
                for col in range(len(header)):
                    value = row_values[col] if col < len(row_values) else ""
                    cell = row.cells[col]
                    cell.text = ""
                    paragraph = cell.paragraphs[0]
                    add_inline(paragraph, value)
                    for run in paragraph.runs:
                        if run.font.size is None:
                            run.font.size = Pt(9.5)
            doc.add_paragraph()
            continue

        bullet = re.match(r"^(\s*)[-*]\s+(.*)$", line)
        if bullet:
            level = 2 if len(bullet.group(1)) >= 2 else 1
            style_name = "List Bullet" if level == 1 else "List Bullet 2"
            paragraph = doc.add_paragraph(style=style_name)
            add_inline(paragraph, bullet.group(2).strip())
            i += 1
            continue

        numbered = re.match(r"^(\s*)\d+\.\s+(.*)$", line)
        if numbered:
            level = 2 if len(numbered.group(1)) >= 2 else 1
            style_name = "List Number" if level == 1 else "List Number 2"
            paragraph = doc.add_paragraph(style=style_name)
            add_inline(paragraph, numbered.group(2).strip())
            i += 1
            continue

        if stripped.startswith(">"):
            paragraph = doc.add_paragraph(style="Intense Quote")
            add_inline(paragraph, stripped.lstrip("> "))
            i += 1
            continue

        # Plain paragraph: merge soft-wrapped continuation lines.
        text_lines = [stripped]
        i += 1
        while i < len(lines):
            nxt = lines[i].strip()
            if (
                not nxt
                or nxt.startswith(("#", "```", "|", "- ", "* ", ">"))
                or re.match(r"^\d+\.\s", nxt)
                or re.fullmatch(r"[-*_]{3,}", nxt)
            ):
                break
            text_lines.append(nxt)
            i += 1
        paragraph = doc.add_paragraph()
        add_inline(paragraph, " ".join(text_lines))

    out_path = md_path.with_suffix(".docx")
    doc.save(out_path)
    return out_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    for arg in sys.argv[1:]:
        path = Path(arg)
        out = convert(path)
        print(f"{path} -> {out}")
