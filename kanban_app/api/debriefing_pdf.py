"""
Utility to render a Debriefing instance into a PDF.
– Probiert zuerst WeasyPrint (HTML → PDF).
– Fällt auf ReportLab‑Stub zurück, falls WeasyPrint fehlt.
"""
from io import BytesIO
from reportlab.pdfgen import canvas

try:
    from django.conf import settings
    from django.template.loader import render_to_string
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except Exception as exc:          # ImportError + native‑OSError
    WEASYPRINT_AVAILABLE = False
    print(f"[Debriefing PDF] WeasyPrint not available – using stub. ({exc})")


def generate_pdf(debriefing):
    """Erzeugt PDF‑Bytes – mit WeasyPrint oder als Fallback ReportLab."""
    if WEASYPRINT_AVAILABLE:
        html = render_to_string("debriefing_pdf.html", {"debriefing": debriefing})
        return HTML(string=html, base_url=settings.BASE_DIR).write_pdf()

    # -------- Fallback --------
    buffer = BytesIO()
    p = canvas.Canvas(buffer)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(72, 770, f"Debriefing #{debriefing.id}")
    p.setFont("Helvetica", 12)
    p.drawString(72, 745, f"Board: {debriefing.board.title}")
    p.drawString(72, 730, f"Match‑Date: {debriefing.match_date}")
    p.drawString(72, 715, "⚠  WeasyPrint missing – placeholder PDF.")
    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer.read()