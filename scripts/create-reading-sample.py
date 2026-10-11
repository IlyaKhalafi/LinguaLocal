"""Build a small printable greeting worksheet without third-party libraries."""
from pathlib import Path

lines = [
    ("EVERYDAY ENGLISH", 24),
    ("A little conversation practice", 16),
    ("", 12),
    ("Say hello", 16),
    ("Alex: Hello! My name is Alex. What is your name?", 12),
    ("Sam: Hi, Alex. I am Sam. It is nice to meet you.", 12),
    ("Alex: It is nice to meet you too. How are you today?", 12),
    ("Sam: I am well, thank you. How are you?", 12),
    ("", 12),
    ("Make it your own", 16),
    ("Practise the conversation with a partner.", 12),
    ("Replace Alex and Sam with your own names.", 12),
    ("Ask one more question about a favourite book or food.", 12),
    ("", 12),
    ("Your turn", 16),
    ("My name is _____________________________________", 12),
    ("Today I feel _____________________________________", 12),
    ("A question I could ask ____________________________", 12),
    ("", 12),
    ("Small steps. Endless possibilities.", 11),
]
commands = ["BT", "0.13 0.30 0.22 rg", "54 770 Td"]
for text, size in lines:
    escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    commands.extend([f"/F1 {size} Tf", f"({escaped}) Tj", "0 -29 Td"])
commands.append("ET")
stream = "\n".join(commands).encode("ascii")
objects = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
]
document = bytearray(b"%PDF-1.4\n")
offsets = [0]
for index, value in enumerate(objects, 1):
    offsets.append(len(document))
    document.extend(f"{index} 0 obj\n".encode() + value + b"\nendobj\n")
start = len(document)
document.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
for offset in offsets[1:]:
    document.extend(f"{offset:010d} 00000 n \n".encode())
document.extend(f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n".encode())
Path("public/demo/greetings.pdf").write_bytes(document)
