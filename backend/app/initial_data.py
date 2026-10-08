import logging
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.models.hosted_zone import HostedZone
from app.schemas.hosted_zone import HostedZoneCreate
from app.schemas.dns_record import DNSRecordCreate
from app.services.zone_service import create_hosted_zone
from app.services.record_service import create_dns_record

logger = logging.getLogger(__name__)

def seed_db_if_empty(db: Session):
    # Check if users exist
    user_count = db.query(User).count()
    if user_count == 0:
        logger.info("Seeding initial users...")
        admin = User(
            username="admin",
            email="admin@example.com",
            account_id="123456789012",
            hashed_password=hash_password("password123")
        )
        demo_user = User(
            username="paul-philip",
            email="paul@example.com",
            account_id="987654321098",
            hashed_password=hash_password("password123")
        )
        db.add(admin)
        db.add(demo_user)
        db.commit()

    # Check if zones exist
    zone_count = db.query(HostedZone).count()
    if zone_count == 0:
        logger.info("Seeding initial hosted zones and records...")
        # 1. Public Zone: myexamplewebsite.xyz.
        zone1_in = HostedZoneCreate(
            name="myexamplewebsite.xyz",
            description="Production web presence for myexamplewebsite",
            type="Public",
            created_by="Route 53"
        )
        zone1 = create_hosted_zone(db, zone1_in)

        # Add records to zone 1 matching screenshot
        # www A record (13.60.23.250)
        create_dns_record(db, zone1.id, DNSRecordCreate(
            name=f"www.{zone1.name}",
            type="A",
            routing_policy="Simple",
            set_identifier="",
            ttl=300,
            records=["13.60.23.250"],
            is_alias=False
        ))

        # MX record
        create_dns_record(db, zone1.id, DNSRecordCreate(
            name=zone1.name,
            type="MX",
            routing_policy="Simple",
            set_identifier="",
            ttl=300,
            records=["10 mail.myexamplewebsite.xyz."],
            is_alias=False
        ))

        # TXT record
        create_dns_record(db, zone1.id, DNSRecordCreate(
            name=zone1.name,
            type="TXT",
            routing_policy="Simple",
            set_identifier="",
            ttl=300,
            records=['"v=spf1 include:_spf.google.com ~all"'],
            is_alias=False
        ))

        # Weighted records for api
        create_dns_record(db, zone1.id, DNSRecordCreate(
            name=f"api.{zone1.name}",
            type="A",
            routing_policy="Weighted",
            set_identifier="us-east-cluster",
            weight=100,
            ttl=60,
            records=["54.210.10.1"],
            is_alias=False
        ))

        create_dns_record(db, zone1.id, DNSRecordCreate(
            name=f"api.{zone1.name}",
            type="A",
            routing_policy="Weighted",
            set_identifier="eu-west-cluster",
            weight=50,
            ttl=60,
            records=["52.18.20.2"],
            is_alias=False
        ))

        # 2. Private Zone: internal.corp.
        zone2_in = HostedZoneCreate(
            name="internal.corp",
            description="Internal corporate resources VPC",
            type="Private",
            vpc_id="vpc-0a1b2c3d4e5f67890",
            vpc_region="us-east-1",
            created_by="Route 53"
        )
        zone2 = create_hosted_zone(db, zone2_in)

        create_dns_record(db, zone2.id, DNSRecordCreate(
            name=f"database.{zone2.name}",
            type="A",
            routing_policy="Simple",
            set_identifier="",
            ttl=300,
            records=["10.0.1.50"],
            is_alias=False
        ))

        logger.info("Seeding completed successfully.")
