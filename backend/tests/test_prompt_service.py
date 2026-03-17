"""Tests for prompt_service template rendering and validation."""
from app.services.prompt_service import (
    render_template,
    extract_variables,
    validate_template,
    build_contact_variables,
    SUPPORTED_VARIABLES,
)


class TestRenderTemplate:
    def test_simple_replacement(self):
        result = render_template("Hello {{name}} from {{company}}", {
            "name": "Alice",
            "company": "Acme",
        })
        assert result == "Hello Alice from Acme"

    def test_missing_variable_shows_not_provided(self):
        result = render_template("Hello {{name}}, your role is {{role}}", {
            "name": "Bob",
            "role": None,
        })
        assert result == "Hello Bob, your role is Not provided"

    def test_unknown_variable_preserved(self):
        result = render_template("{{name}} has {{unknown_var}}", {"name": "Test"})
        assert "{{unknown_var}}" in result
        assert "Test" in result

    def test_empty_template(self):
        result = render_template("", {"name": "Test"})
        assert result == ""

    def test_no_variables(self):
        result = render_template("Plain text no variables", {"name": "Test"})
        assert result == "Plain text no variables"

    def test_all_supported_variables(self):
        variables: dict[str, str | None] = {var: f"value_{var}" for var in SUPPORTED_VARIABLES}
        template = " ".join(f"{{{{{v}}}}}" for v in SUPPORTED_VARIABLES)
        result = render_template(template, variables)
        for var in SUPPORTED_VARIABLES:
            assert f"value_{var}" in result


class TestExtractVariables:
    def test_extracts_variables(self):
        result = extract_variables("Hello {{name}}, you work at {{company}}")
        assert result == {"name", "company"}

    def test_no_variables(self):
        result = extract_variables("No placeholders here")
        assert result == set()

    def test_duplicate_variables(self):
        result = extract_variables("{{name}} and {{name}} again")
        assert result == {"name"}

    def test_unknown_variables_extracted(self):
        result = extract_variables("{{name}} {{custom_thing}}")
        assert "custom_thing" in result


class TestValidateTemplate:
    def test_valid_template_no_warnings(self):
        warnings = validate_template(
            "You are a sales assistant.",
            "Write a message to {{name}} at {{company}}.",
        )
        assert len(warnings) == 0

    def test_unknown_variable_warning(self):
        warnings = validate_template(
            "System prompt",
            "Hello {{name}} {{unknown_var}}",
        )
        assert any("Unknown variables" in w for w in warnings)

    def test_no_variables_warning(self):
        warnings = validate_template("System prompt", "Write a generic message")
        assert any("no variables" in w for w in warnings)


class TestBuildContactVariables:
    def test_minimal(self):
        result = build_contact_variables(contact_name="Alice")
        assert result["name"] == "Alice"
        assert result["company"] is None

    def test_full(self):
        result = build_contact_variables(
            contact_name="Alice",
            contact_company="Acme",
            contact_role="CTO",
            contact_linkedin="https://linkedin.com/in/alice",
            contact_email="alice@acme.com",
            contact_notes="Met at conference",
            previous_message="Hi Alice",
            sender_name="Bob",
            sender_company="SalesOrg",
        )
        assert result["name"] == "Alice"
        assert result["company"] == "Acme"
        assert result["role"] == "CTO"
        assert result["linkedin_url"] == "https://linkedin.com/in/alice"
        assert result["email"] == "alice@acme.com"
        assert result["notes"] == "Met at conference"
        assert result["previous_message"] == "Hi Alice"
        assert result["sender_name"] == "Bob"
        assert result["sender_company"] == "SalesOrg"
