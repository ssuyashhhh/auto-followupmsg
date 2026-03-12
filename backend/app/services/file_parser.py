"""
File parsing service — handles CSV, TXT, and Excel files.

Responsibilities:
- Read file content from bytes (downloaded from Supabase)
- Detect and parse based on file type
- Map columns to contact fields using fuzzy matching
- Validate and normalize each row
- Return structured contact data
"""

import csv
import io
import logging
import re
from dataclasses import dataclass, field

import pandas as pd

logger = logging.getLogger(__name__)


# ============================================
# Column Mapping — fuzzy match user columns to our schema
# ============================================

# Each key is our internal field name, values are patterns that match common column headers
COLUMN_PATTERNS: dict[str, list[str]] = {
    "full_name": [
        r"^name$", r"^full.?name$", r"^contact.?name$", r"^person$",
        r"^first.?name.*last.?name$",
    ],
    "first_name": [
        r"^first.?name$", r"^fname$", r"^given.?name$", r"^first$",
    ],
    "last_name": [
        r"^last.?name$", r"^lname$", r"^surname$", r"^family.?name$", r"^last$",
    ],
    "email": [
        r"^e.?mail$", r"^email.?address$", r"^contact.?email$", r"^mail$",
    ],
    "linkedin_url": [
        r"^linkedin$", r"^linkedin.?url$", r"^linkedin.?profile$",
        r"^linkedin.?link$", r"^profile.?url$",
    ],
    "company": [
        r"^company$", r"^company.?name$", r"^organization$", r"^org$",
        r"^employer$", r"^business$",
    ],
    "role": [
        r"^role$", r"^title$", r"^job.?title$", r"^position$",
        r"^designation$", r"^job.?role$",
    ],
    "notes": [
        r"^notes?$", r"^comment$", r"^comments$", r"^description$", r"^bio$",
    ],
}


def _normalize_header(header: str) -> str:
    """Normalize a column header for matching."""
    return re.sub(r"[^a-z0-9]", "", header.lower().strip())


def _match_column(header: str) -> str | None:
    """Match a column header to an internal field name. Returns None if no match."""
    normalized = _normalize_header(header)
    for field_name, patterns in COLUMN_PATTERNS.items():
        for pattern in patterns:
            # Normalize the pattern too (remove special chars for comparison)
            if re.match(pattern, normalized) or re.match(pattern, header.lower().strip()):
                return field_name
    return None


def map_columns(headers: list[str]) -> dict[str, str]:
    """
    Map DataFrame column names to internal field names.

    Returns:
        Dict of {original_column_name: internal_field_name}
    """
    mapping: dict[str, str] = {}
    mapped_fields: set[str] = set()

    for header in headers:
        field_name = _match_column(header)
        if field_name and field_name not in mapped_fields:
            mapping[header] = field_name
            mapped_fields.add(field_name)

    return mapping


# ============================================
# Contact Data Classes
# ============================================

@dataclass
class ParsedContact:
    """A single parsed and validated contact."""
    full_name: str
    email: str | None = None
    linkedin_url: str | None = None
    company: str | None = None
    role: str | None = None
    notes: str | None = None
    raw_data: dict = field(default_factory=dict)


@dataclass
class ParseResult:
    """Result of parsing a file."""
    contacts: list[ParsedContact]
    total_rows: int
    parsed_count: int
    failed_count: int
    errors: list[str]
    column_mapping: dict[str, str]


# ============================================
# Row Validation & Normalization
# ============================================

def _clean_string(value) -> str | None:
    """Clean a cell value — convert to string, strip, return None if empty."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    s = str(value).strip()
    return s if s else None


def _validate_email(email: str | None) -> str | None:
    """Basic email validation."""
    if not email:
        return None
    # Simple pattern — catches most valid emails
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return email if re.match(pattern, email) else None


def _validate_linkedin_url(url: str | None) -> str | None:
    """Validate and normalize LinkedIn URL."""
    if not url:
        return None
    url = url.strip()
    # Accept various LinkedIn URL formats
    if re.match(r"^https?://(www\.)?linkedin\.com/in/[\w\-%.]+/?$", url, re.IGNORECASE):
        return url
    # If it's just a path like "/in/johndoe"
    if re.match(r"^/?in/[\w\-%.]+/?$", url):
        return f"https://www.linkedin.com{url if url.startswith('/') else '/' + url}"
    # If it's just a username
    if re.match(r"^[\w\-%.]+$", url) and len(url) > 2:
        return f"https://www.linkedin.com/in/{url}"
    return url  # Return as-is, don't reject


def _build_full_name(row: dict, column_mapping: dict[str, str]) -> str | None:
    """Build full_name from first_name + last_name if full_name isn't directly mapped."""
    # Check if full_name is directly available
    for orig_col, field_name in column_mapping.items():
        if field_name == "full_name":
            name = _clean_string(row.get(orig_col))
            if name:
                return name

    # Try combining first_name + last_name
    first = None
    last = None
    for orig_col, field_name in column_mapping.items():
        if field_name == "first_name":
            first = _clean_string(row.get(orig_col))
        elif field_name == "last_name":
            last = _clean_string(row.get(orig_col))

    parts = [p for p in [first, last] if p]
    return " ".join(parts) if parts else None


def parse_row(row: dict, column_mapping: dict[str, str], row_index: int) -> ParsedContact | str:
    """
    Parse and validate a single row of data.

    Returns:
        ParsedContact on success, or error string on failure.
    """
    # Build full name
    full_name = _build_full_name(row, column_mapping)
    if not full_name:
        return f"Row {row_index}: Missing name (no 'name', 'first_name', or 'last_name' column found)"

    # Extract other fields
    email = None
    linkedin_url = None
    company = None
    role = None
    notes = None

    for orig_col, field_name in column_mapping.items():
        value = _clean_string(row.get(orig_col))
        if not value:
            continue
        if field_name == "email":
            email = _validate_email(value)
        elif field_name == "linkedin_url":
            linkedin_url = _validate_linkedin_url(value)
        elif field_name == "company":
            company = value
        elif field_name == "role":
            role = value
        elif field_name == "notes":
            notes = value

    # Store the raw row data (all columns, not just mapped ones)
    raw_data = {k: _clean_string(v) for k, v in row.items() if _clean_string(v)}

    return ParsedContact(
        full_name=full_name,
        email=email,
        linkedin_url=linkedin_url,
        company=company,
        role=role,
        notes=notes,
        raw_data=raw_data,
    )


# ============================================
# File Parsers
# ============================================

def parse_csv_content(content: bytes) -> pd.DataFrame:
    """Parse CSV file content into a DataFrame."""
    # Try UTF-8 first, fall back to Latin-1
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    # Detect delimiter (comma, semicolon, tab, pipe)
    sniffer = csv.Sniffer()
    try:
        sample = text[:8192]
        dialect = sniffer.sniff(sample, delimiters=",;\t|")
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ","

    df = pd.read_csv(io.StringIO(text), delimiter=delimiter, dtype=str, keep_default_na=False)
    return df


def parse_txt_content(content: bytes) -> pd.DataFrame:
    """Parse tab-separated TXT file into a DataFrame."""
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    # Try tab first, then comma
    if "\t" in text[:2048]:
        delimiter = "\t"
    elif "," in text[:2048]:
        delimiter = ","
    else:
        delimiter = "\t"

    df = pd.read_csv(io.StringIO(text), delimiter=delimiter, dtype=str, keep_default_na=False)
    return df


def parse_excel_content(content: bytes, file_type: str) -> pd.DataFrame:
    """Parse Excel file (.xlsx or .xls) into a DataFrame."""
    engine = "openpyxl" if file_type == "xlsx" else "xlrd"
    df = pd.read_excel(io.BytesIO(content), dtype=str, keep_default_na=False, engine=engine)
    return df


# ============================================
# Main Parser
# ============================================

def parse_file(content: bytes, file_type: str) -> ParseResult:
    """
    Parse file content and extract contacts.

    Args:
        content: Raw file bytes
        file_type: Extension string — 'csv', 'txt', 'xlsx', 'xls'

    Returns:
        ParseResult with contacts, counts, and any errors
    """
    # 1. Parse into DataFrame
    if file_type == "csv":
        df = parse_csv_content(content)
    elif file_type == "txt":
        df = parse_txt_content(content)
    elif file_type in ("xlsx", "xls"):
        df = parse_excel_content(content, file_type)
    else:
        return ParseResult(
            contacts=[], total_rows=0, parsed_count=0, failed_count=0,
            errors=[f"Unsupported file type: {file_type}"], column_mapping={},
        )

    # Drop completely empty rows
    df = df.dropna(how="all")

    if df.empty:
        return ParseResult(
            contacts=[], total_rows=0, parsed_count=0, failed_count=0,
            errors=["File contains no data rows"], column_mapping={},
        )

    # 2. Map columns
    column_mapping = map_columns(list(df.columns))
    logger.info("Column mapping: %s", column_mapping)

    if not column_mapping:
        # If no columns match, use first column as name
        first_col = df.columns[0]
        column_mapping = {first_col: "full_name"}
        logger.warning("No column patterns matched. Using '%s' as full_name.", first_col)

    # Check if we have at least a name field
    mapped_fields = set(column_mapping.values())
    has_name = "full_name" in mapped_fields or ("first_name" in mapped_fields)
    if not has_name:
        return ParseResult(
            contacts=[], total_rows=len(df), parsed_count=0, failed_count=len(df),
            errors=["Could not identify a name column. Expected: name, full_name, first_name, etc."],
            column_mapping=column_mapping,
        )

    # 3. Parse each row
    contacts: list[ParsedContact] = []
    errors: list[str] = []
    total_rows = len(df)

    for idx, row in df.iterrows():
        row_dict = row.to_dict()
        result = parse_row(row_dict, column_mapping, int(idx) + 2)  # +2 for header + 0-index

        if isinstance(result, str):
            errors.append(result)
        else:
            contacts.append(result)

    logger.info(
        "Parsed %d/%d contacts (%d failed) from %s file",
        len(contacts), total_rows, len(errors), file_type,
    )

    return ParseResult(
        contacts=contacts,
        total_rows=total_rows,
        parsed_count=len(contacts),
        failed_count=len(errors),
        errors=errors[:50],  # Cap error list to prevent massive payloads
        column_mapping=column_mapping,
    )
