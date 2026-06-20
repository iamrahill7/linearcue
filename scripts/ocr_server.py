import sys
import os
import re
import json
import socket
import threading

SENSITIVE_PATTERNS = [
    r'(?i)(api[_-]?key|secret|token|password|sk-|gsk_|bearer)\s*[=:]\s*\S+',
    r'gsk_[a-zA-Z0-9]+',
    r'sk-[a-zA-Z0-9]+',
]

def is_sensitive(text):
    for pattern in SENSITIVE_PATTERNS:
        if re.search(pattern, text):
            return True
    return False

def extract_text(ocr, image_path="/tmp/linearcue_screen.png"):
    if not os.path.exists(image_path):
        return ""
    result = ocr.ocr(image_path)
    if not result:
        return ""
    lines = []
    for page in result:
        if not page:
            continue
        if isinstance(page, dict):
            texts = page.get('rec_texts', [])
            scores = page.get('rec_scores', [])
            for text, score in zip(texts, scores):
                if score > 0.6 and text.strip() and not is_sensitive(text):
                    lines.append(text.strip())
        elif isinstance(page, list):
            for item in page:
                try:
                    text = item[1][0]
                    score = item[1][1]
                    if score > 0.6 and text.strip() and not is_sensitive(text):
                        lines.append(text.strip())
                except Exception:
                    continue
    return "\n".join(lines)

def handle_client(conn, ocr):
    try:
        data = conn.recv(1024).decode().strip()
        if data == "OCR":
            text = extract_text(ocr)
            conn.sendall((text + "\n__END__\n").encode())
    except Exception as e:
        conn.sendall(f"ERROR: {e}\n__END__\n".encode())
    finally:
        conn.close()

def main():
    print("Loading OCR models...", flush=True)
    from paddleocr import PaddleOCR
    ocr = PaddleOCR(use_textline_orientation=True, lang="en")
    print("OCR ready", flush=True)

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('127.0.0.1', 9876))
    server.listen(5)
    print("Listening on port 9876", flush=True)

    while True:
        conn, _ = server.accept()
        threading.Thread(target=handle_client, args=(conn, ocr)).start()

if __name__ == "__main__":
    main()
