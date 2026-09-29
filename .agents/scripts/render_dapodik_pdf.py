from pathlib import Path

import fitz


source = Path("attached_assets/DOKUMEN_TEKNIS_API_DAPODIK_1790663950678.pdf")
output_dir = Path(".agents/outputs/dapodik-pdf")
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
print(f"pages={document.page_count}")
for page_number, page in enumerate(document, start=1):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    output_path = output_dir / f"page-{page_number:02d}.png"
    pixmap.save(output_path)
    print(f"{page_number}: {page.rect.width:.0f}x{page.rect.height:.0f} -> {output_path}")