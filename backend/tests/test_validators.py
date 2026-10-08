import pytest
from app.services.validators import validate_record_value, validate_domain_name

def test_validate_domain_name():
    assert validate_domain_name("example.com") is True
    assert validate_domain_name("sub.domain.co.uk") is True
    assert validate_domain_name("@") is True
    assert validate_domain_name("") is False
    assert validate_domain_name("invalid..domain") is False

def test_validate_a_record():
    valid, _ = validate_record_value("A", "192.168.1.1")
    assert valid is True
    valid, msg = validate_record_value("A", "256.0.0.1")
    assert valid is False
    assert "Invalid IPv4" in msg

def test_validate_aaaa_record():
    valid, _ = validate_record_value("AAAA", "2001:0db8:85a3:0000:0000:8a2e:0370:7334")
    assert valid is True
    valid, _ = validate_record_value("AAAA", "::1")
    assert valid is True
    valid, msg = validate_record_value("AAAA", "invalid-ipv6")
    assert valid is False

def test_validate_cname_record():
    valid, _ = validate_record_value("CNAME", "target.example.com")
    assert valid is True
    valid, msg = validate_record_value("CNAME", "bad domain with spaces")
    assert valid is False

def test_validate_mx_record():
    valid, _ = validate_record_value("MX", "10 mail.example.com")
    assert valid is True
    valid, msg = validate_record_value("MX", "not-a-number mail.example.com")
    assert valid is False
    valid, msg = validate_record_value("MX", "justmail.com")
    assert valid is False

def test_validate_txt_record():
    valid, _ = validate_record_value("TXT", '"v=spf1 include:_spf.google.com ~all"')
    assert valid is True
    valid, _ = validate_record_value("TXT", "raw text message")
    assert valid is True

def test_validate_srv_record():
    valid, _ = validate_record_value("SRV", "10 5 5060 sipserver.example.com")
    assert valid is True
    valid, msg = validate_record_value("SRV", "10 5 invalid")
    assert valid is False

def test_validate_caa_record():
    valid, _ = validate_record_value("CAA", '0 issue "letsencrypt.org"')
    assert valid is True
    valid, msg = validate_record_value("CAA", '0 unknowntag "domain.com"')
    assert valid is False
