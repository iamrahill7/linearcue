import socket
import sys

def main():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect(('127.0.0.1', 9876))
        s.sendall(b"OCR")
        result = ""
        while True:
            chunk = s.recv(4096).decode()
            if "__END__" in chunk:
                result += chunk.replace("__END__", "").strip()
                break
            result += chunk
        s.close()
        print(result)
    except Exception as e:
        print("", file=sys.stderr)

if __name__ == "__main__":
    main()
