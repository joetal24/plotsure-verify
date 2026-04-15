"""
Certificate generation service.
Generates SHA-256 hash + PDF certificate, uploads to Supabase Storage.
"""
import hashlib
import json
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER


def generate_certificate_hash(search_data: dict) -> str:
    """
    Generate SHA-256 hash from normalized, canonical JSON of the search result.
    Any modification to the data will produce a different hash.
    """
    # Normalize into canonical format (sorted keys, no whitespace)
    canonical = json.dumps(search_data, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def generate_certificate_pdf(
    certificate_id: str,
    search_data: dict,
    cert_hash: str,
) -> bytes:
    """Generate a tamper-evident PDF certificate."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Title"],
        fontSize=18,
        textColor=HexColor("#1a365d"),
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        "CertSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=HexColor("#4a5568"),
        alignment=TA_CENTER,
        spaceAfter=20,
    )
    label_style = ParagraphStyle(
        "Label",
        parent=styles["Normal"],
        fontSize=9,
        textColor=HexColor("#718096"),
    )
    value_style = ParagraphStyle(
        "Value",
        parent=styles["Normal"],
        fontSize=10,
        textColor=HexColor("#1a202c"),
        fontName="Helvetica-Bold",
    )
    hash_style = ParagraphStyle(
        "Hash",
        parent=styles["Normal"],
        fontSize=7,
        textColor=HexColor("#2d3748"),
        fontName="Courier",
        spaceAfter=10,
    )

    elements = []

    # Header
    elements.append(Paragraph("PLOTSURE LAND VERIFICATION CERTIFICATE", title_style))
    elements.append(
        Paragraph(
            "Issued under the PlotSure Land Intelligence Platform", subtitle_style
        )
    )
    elements.append(Spacer(1, 10))

    # Certificate info table
    data_rows = [
        ["Certificate ID", certificate_id],
        ["Date Issued", datetime.now().strftime("%d %B %Y")],
        ["Plot Reference", search_data.get("plot_reference", "N/A")],
        ["Location", f"{search_data.get('location', 'N/A')}, Uganda"],
        ["Land Type", search_data.get("land_type", "N/A")],
        ["Registered Owner", search_data.get("owner", "N/A")],
        ["Title Status", search_data.get("title_status", "N/A")],
        [
            "Encumbrances",
            ", ".join(search_data.get("encumbrances", [])) or "None detected",
        ],
        ["Ownership Transfers", str(search_data.get("transfer_count", 0))],
        ["Risk Level", search_data.get("risk_level", "N/A")],
        [
            "Estimated Price Range",
            f"UGX {search_data.get('price_min', 0):,.0f} – {search_data.get('price_max', 0):,.0f}",
        ],
    ]

    table_data = []
    for label, value in data_rows:
        table_data.append(
            [
                Paragraph(label, label_style),
                Paragraph(value, value_style),
            ]
        )

    t = Table(table_data, colWidths=[6 * cm, 10 * cm])
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LINEBELOW", (0, 0), (-1, -2), 0.5, HexColor("#e2e8f0")),
                ("LINEBELOW", (0, -1), (-1, -1), 1, HexColor("#1a365d")),
            ]
        )
    )
    elements.append(t)
    elements.append(Spacer(1, 20))

    # Tamper evidence section
    elements.append(Paragraph("TAMPER EVIDENCE", title_style))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(f"SHA-256 Hash: {cert_hash}", hash_style))
    elements.append(
        Paragraph(
            "This certificate's authenticity can be verified by comparing the SHA-256 "
            "hash above against the record stored in the PlotSure database. Any modification "
            "to this document will produce a different hash.",
            ParagraphStyle(
                "Disclaimer",
                parent=styles["Normal"],
                fontSize=8,
                textColor=HexColor("#a0aec0"),
                spaceAfter=10,
            ),
        )
    )

    doc.build(elements)
    return buffer.getvalue()
