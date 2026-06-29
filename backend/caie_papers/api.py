from __future__ import annotations

import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .catalog import list_subject_catalog
from .config import DEFAULT_DB_PATH
from .db import open_db
from .ocr import OCRUnavailable
from .search import search_image_ocr_with_job, search_text


class CAIEPaperRequestHandler(BaseHTTPRequestHandler):
    db_path: Path = DEFAULT_DB_PATH

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self.respond_json({"ok": True})
            return

        if parsed.path == "/api/search":
            params = parse_qs(parsed.query)
            query = params.get("q", [""])[0]
            limit = parse_int(params.get("limit", ["10"])[0], default=10)
            with open_db(self.db_path) as connection:
                results = [result.to_dict() for result in search_text(connection, query, limit=limit)]
            self.respond_json({"query": query, "results": results})
            return

        if parsed.path == "/api/catalog/subjects":
            params = parse_qs(parsed.query)
            mainstream_only = params.get("mainstream_only", ["1"])[0] not in {"0", "false", "False"}
            with open_db(self.db_path) as connection:
                subjects = list_subject_catalog(connection, mainstream_only=mainstream_only)
            self.respond_json({"subjects": subjects})
            return

        self.respond_json({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/search/ocr":
            payload = self.read_json()
            image_path = payload.get("image_path")
            if not image_path:
                self.respond_json({"error": "image_path is required"}, status=HTTPStatus.BAD_REQUEST)
                return

            limit = parse_int(payload.get("limit", 10), default=10)
            languages = str(payload.get("languages", "eng+chi_sim"))
            try:
                with open_db(self.db_path) as connection:
                    job_id, text, results = search_image_ocr_with_job(
                        connection,
                        Path(str(image_path)),
                        languages=languages,
                        limit=limit,
                        subject_id=parse_optional_int(payload.get("subject_id")),
                        qualification_id=parse_optional_int(payload.get("qualification_id")),
                        syllabus_id=parse_optional_int(payload.get("syllabus_id")),
                    )
            except OCRUnavailable as error:
                self.respond_json({"error": str(error)}, status=HTTPStatus.SERVICE_UNAVAILABLE)
                return

            self.respond_json({"job_id": job_id, "ocr_text": text, "results": [result.to_dict() for result in results]})
            return

        self.respond_json({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)

    def read_json(self) -> dict[str, object]:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf8"))

    def respond_json(self, payload: dict[str, object], *, status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format: str, *args: object) -> None:
        return


def parse_int(value: object, *, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def parse_optional_int(value: object) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def serve(db_path: Path = DEFAULT_DB_PATH, *, host: str = "127.0.0.1", port: int = 8765) -> ThreadingHTTPServer:
    handler_cls = type(
        "ConfiguredCAIEPaperRequestHandler",
        (CAIEPaperRequestHandler,),
        {"db_path": db_path},
    )
    server = ThreadingHTTPServer((host, port), handler_cls)
    print(f"CAIE paper backend listening on http://{host}:{port}")
    print(f"Database: {db_path}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return server
