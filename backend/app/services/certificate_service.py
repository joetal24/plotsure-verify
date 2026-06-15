import hashlib
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def generate_certificate_hash(search_record: dict) -> str:
    canonical = "|".join([
        str(search_record.get("plot_reference", "")),
        str(search_record.get("fraud_risk_level", "")),
        str(search_record.get("created_at", "")),
        str(search_record.get("user_id", "")),
    ])
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def generate_certificate_pdf(search_record: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=20 * mm, bottomMargin=20 * mm,
        leftMargin=20 * mm, rightMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertTitle", parent=styles["Title"],
        fontSize=20, leading=24, spaceAfter=12, alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        "CertSubtitle", parent=styles["Normal"],
        fontSize=11, leading=14, textColor=colors.HexColor("#555555"),
        alignment=TA_CENTER, spaceAfter=24,
    )
    heading_style = ParagraphStyle(
        "CertHeading", parent=styles["Heading2"],
        fontSize=13, leading=16, spaceAfter=6, spaceBefore=12,
    )
    label_style = ParagraphStyle(
        "CertLabel", parent=styles["Normal"],
        fontSize=10, leading=14, textColor=colors.HexColor("#888888"),
    )
    value_style = ParagraphStyle(
        "CertValue", parent=styles["Normal"],
        fontSize=11, leading=15, spaceAfter=8,
    )

    plot_ref = search_record.get("plot_reference", "N/A")
    risk_level = search_record.get("fraud_risk_level") or search_record.get("risk_level", "N/A")
    created_raw = search_record.get("created_at", "")
    try:
        dt = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
        verified_at = dt.strftime("%d %B %Y at %H:%M UTC")
    except (ValueError, AttributeError):
        verified_at = str(created_raw)

    elements = []
    elements.append(Paragraph("PlotSure", title_style))
    elements.append(Paragraph("Land Title Verification Certificate", subtitle_style))
    elements.append(Spacer(1, 12))

    data = [
        ["Plot Reference:", plot_ref],
        ["Fraud Risk Level:", risk_level],
        ["Verified At:", verified_at],
    ]
    col_widths = [120, 380]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#555555")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (1, 0), (1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F5F5F5")),
    ]))
    elements.append(t)

    elements.append(Spacer(1, 24))
    cert_hash = generate_certificate_hash(search_record)
    hash_style = ParagraphStyle(
        "Hash", parent=styles["Code"],
        fontSize=7, leading=9, textColor=colors.HexColor("#999999"),
        alignment=TA_CENTER,
    )
    elements.append(Paragraph(
        f"SHA-256: {cert_hash}",
        hash_style,
    ))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(
        "Verify this certificate at plotsure.ug/certificate-check",
        ParagraphStyle(
            "Footer", parent=styles["Normal"],
            fontSize=8, leading=10, textColor=colors.HexColor("#AAAAAA"),
            alignment=TA_CENTER,
        ),
    ))

    doc.build(elements)
    return buf.getvalue()
