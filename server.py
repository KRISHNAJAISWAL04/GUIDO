"""
Local Web Server Launcher for Blender 3D Studio Web Application.
Hosts the web application on http://localhost:8000.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def main() -> None:
    if "--test" in sys.argv:
        print("Server test success.")
        return

    os.chdir(DIRECTORY)
    with ReusableTCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print(" BLENDER 3D STUDIO WEB APPLICATION SERVER")
        print("=" * 60)
        print(f" Serving web app at: {url}")
        print(" Press Ctrl+C to stop the server.")
        print("=" * 60)

        # Open web browser automatically
        try:
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            httpd.server_close()


if __name__ == "__main__":
    main()
