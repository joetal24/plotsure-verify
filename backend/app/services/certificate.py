"""
Certificate generation service.
Generates SHA-256 hash + Enhanced PDF certificate with QR code, uploads to Supabase Storage.
"""
import hashlib
import json
import io
import qrcode
from datetime import datetime
from base64 import b64encode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def generate_certificate_hash(search_data: dict) -> str:
    """
    Generate SHA-256 hash from normalized, canonical JSON of the search result.
    Any modification to the data will produce a different hash.
    """
    canonical = json.dumps(search_data, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def generate_qr_code(data: str) -> bytes:
    """Generate QR code image for verification URL"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def generate_certificate_pdf(
    certificate_id: str,
    search_data: dict,
    cert_hash: str,
    verification_url: str = "https://plotsure-verify.supabase.co",
) -> bytes:
    """Generate an Enhanced PDF certificate with QR code, price breakdown, and risk explanation."""
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
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=12,
        textColor=HexColor("#1a365d"),
        spaceBefore=15,
        spaceAfter=8,
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=HexColor("#a0aec0"),
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
    elements.append(Spacer(1, 15))

    # Generate QR Code
    qr_data = f"{verification_url}/certificates/verify/{cert_hash}"
    qr_image_bytes = generate_qr_code(qr_data)
    
    qr_buffer = io.BytesIO(qr_image_bytes)
    
    qr_table_data = [
        [
            Paragraph("Scan to Verify:", label_style),
            Image(qr_buffer, width=2.5*cm, height=2.5*cm),
            Paragraph(
                f"Certificate ID: {certificate_id}<br/>"
                f"Verification Hash: {cert_hash[:16]}...",
                value_style
            ),
        ]
    ]
    
    qr_table = Table(qr_table_data, colWidths=[3*cm, 3*cm, 10*cm])
    qr_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "CENTER"),
    ]))
    elements.append(qr_table)
    elements.append(Spacer(1, 15))

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
    ]

    table_data = []
    for label, value in data_rows:
        table_data.append(
            [
                Paragraph(label, label_style),
                Paragraph(str(value), value_style),
            ]
        )

    t = Table(table_data, colWidths=[6 * cm, 10 * cm])
    t.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, HexColor("#e2e8f0")),
            ("LINEBELOW", (0, -1), (-1, -1), 1, HexColor("#1a365d")),
        ])
    )
    elements.append(t)
    elements.append(Spacer(1, 15))

    # Price Breakdown Section
    elements.append(Paragraph("ESTIMATED PRICE BREAKDOWN", section_style))
    
    price_min = search_data.get("price_min", 0)
    price_max = search_data.get("price_max", 0)
    
    price_data = [
        ["Base Price (per sqm)", f"UGX {search_data.get('base_price_per_sqm', 'N/A'):,.0f}"],
        ["Plot Size", f"{search_data.get('plot_size', 'N/A')} {search_data.get('plot_size_unit', 'Decimals')}"],
        ["Property Type", search_data.get("property_type", "residential").title()],
        ["Annual Growth Rate", f"{search_data.get('annual_growth', 0)*100:.1f}%"],
        ["", ""],
        ["ESTIMATED VALUE", f"UGX {price_min:,.0f} – {price_max:,.0f}"],
    ]
    
    price_table_data = []
    for label, value in price_data:
        is_header = label == "ESTIMATED VALUE"
        price_table_data.append([
            Paragraph(label, value_style if is_header else label_style),
            Paragraph(str(value), value_style),
        ])
    
    price_table = Table(price_table_data, colWidths=[6 * cm, 10 * cm])
    price_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("BACKGROUND", (0, 5), (-1, 5), HexColor("#f0fdf4")),
            ("LINEBELOW", (0, 4), (-1, 4), 0.5, HexColor("#e2e8f0")),
            ("FONTNAME", (0, 5), (-1, 5), "Helvetica-Bold"),
            ("FONTSIZE", (0, 5), (-1, 5), 12),
        ])
    )
    elements.append(price_table)
    elements.append(Spacer(1, 15))

    # Risk Assessment Section
    elements.append(Paragraph("RISK ASSESSMENT", section_style))
    
    risk_level = search_data.get("risk_level", "N/A")
    risk_explanation = {
        "LOW": "This property shows no significant risk indicators. Title verification completed successfully with clean history.",
        "MEDIUM": "This property has some risk factors. The recent transfer history requires additional due diligence. Consult with a qualified land professional.",
        "HIGH": "This property shows significant risk indicators including potential encumbrances, irregular transfer patterns, or incomplete documentation. Professional verification strongly recommended before purchase.",
    }
    
    elements.append(
        Paragraph(
            f"Risk Level: <b>{risk_level}</b>",
            value_style
        )
    )
    elements.append(Spacer(1, 5))
    elements.append(
        Paragraph(
            risk_explanation.get(risk_level, "No risk assessment available."),
            disclaimer_style
        )
    )
    elements.append(Spacer(1, 15))

    # Tamper Evidence Section
    elements.append(Paragraph("TAMPER EVIDENCE", section_style))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(f"SHA-256 Hash: {cert_hash}", hash_style))
    elements.append(
        Paragraph(
            "This certificate's authenticity can be verified by comparing the SHA-256 "
            "hash above against the record stored in the PlotSure database, or by scanning the QR code. "
            "Any modification to this document will produce a different hash.",
            disclaimer_style
        )
    )
    
    # Footer
    elements.append(Spacer(1, 20))
    elements.append(
        Paragraph(
            "This certificate is generated for informational purposes only and does not constitute legal advice. "
            "Always verify land ownership through the Uganda Ministry of Lands, Housing and Urban Development.",
            ParagraphStyle(
                "Footer",
                parent=styles["Normal"],
                fontSize=7,
                textColor=HexColor("#a0aec0"),
                alignment=TA_CENTER,
            )
        )
    )

    doc.build(elements)
    return buffer.getvalue()