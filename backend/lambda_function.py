"""
Jal-Alert AI - AWS Lambda Serverless Function
Tracks: Heat & Water | Urban Flood & Waterlogging Action Engine

This Lambda function interfaces with Amazon DynamoDB ('jal_reports')
and provides resilient fallback to mock seed data if AWS services or table
are unreachable, ensuring zero-downtime demonstration.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

# Attempt boto3 import (available in standard AWS Lambda runtime)
try:
    import boto3
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    ClientError = Exception

TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "jal_reports")
AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")

# Default mock seed data for urban waterlogging hotspots
DEFAULT_HOTSPOTS = [
    {
        "id": "spot-delhi-01",
        "name": "Minto Road Railway Underpass",
        "zone": "Central Delhi",
        "coordinates": {"lat": 28.6358, "lng": 77.2285},
        "severity": "HIGH",
        "depth_cm": 85,
        "drainage_status": "Pumps Overwhelmed (3/4 Offline)",
        "traffic_impact": "Completely Blocked",
        "recommended_detour": "Divert via Barakhamba Road & Connaught Place Outer Circle",
        "last_updated": "5 mins ago",
        "alert_type": "Severe Inundation"
    },
    {
        "id": "spot-mum-02",
        "name": "Hindmata Flyover Subway",
        "zone": "Dadar / Parel, Mumbai",
        "coordinates": {"lat": 19.0118, "lng": 72.8428},
        "severity": "HIGH",
        "depth_cm": 72,
        "drainage_status": "Heavy Backflow (High Tide 4.2m)",
        "traffic_impact": "Subway Closed, Flyover Crawling",
        "recommended_detour": "Use Dr. B.A. Road elevated lane or Senapati Bapat Marg",
        "last_updated": "12 mins ago",
        "alert_type": "Tidal Backflow Inundation"
    },
    {
        "id": "spot-blr-03",
        "name": "Silk Board Junction - Service Road",
        "zone": "South Bengaluru",
        "coordinates": {"lat": 12.9177, "lng": 77.6238},
        "severity": "MODERATE",
        "depth_cm": 38,
        "drainage_status": "Desilting Required, Flow Constricted",
        "traffic_impact": "Heavy Congestion (Slow Movement)",
        "recommended_detour": "Reroute via HSR 27th Main or BTM Ring Road Flyover",
        "last_updated": "18 mins ago",
        "alert_type": "Stormwater Drain Overflow"
    },
    {
        "id": "spot-delhi-04",
        "name": "Pul Prahladpur Underpass",
        "zone": "South Delhi",
        "coordinates": {"lat": 28.5034, "lng": 77.2917},
        "severity": "HIGH",
        "depth_cm": 64,
        "drainage_status": "Stormwater Sump Saturated",
        "traffic_impact": "Closed for Two-Wheelers & Sedans",
        "recommended_detour": "Divert via Mehrauli-Badarpur Road bypass",
        "last_updated": "25 mins ago",
        "alert_type": "Underpass Sump Overflow"
    },
    {
        "id": "spot-blr-05",
        "name": "Bellandur EcoSpace Outer Ring Road",
        "zone": "Mahadevapura, Bengaluru",
        "coordinates": {"lat": 12.9260, "lng": 77.6762},
        "severity": "MODERATE",
        "depth_cm": 32,
        "drainage_status": "Lakeside Culvert High-Discharge",
        "traffic_impact": "Single Lane Passable",
        "recommended_detour": "Use Sarjapur Road or Internal Campus Access",
        "last_updated": "34 mins ago",
        "alert_type": "Lake Runoff Buffer"
    },
    {
        "id": "spot-mum-06",
        "name": "Milan Subway - Santacruz",
        "zone": "Western Suburbs, Mumbai",
        "coordinates": {"lat": 19.0833, "lng": 72.8415},
        "severity": "LOW",
        "depth_cm": 14,
        "drainage_status": "Pumps Operational (Flow Normal)",
        "traffic_impact": "Normal Flow with Caution",
        "recommended_detour": "Milan Flyover recommended during squalls",
        "last_updated": "42 mins ago",
        "alert_type": "Monitored Low Risk"
    }
]

# In-memory storage fallback for reports when DynamoDB is offline/mock
_in_memory_reports = [
    {
        "report_id": "rep-seed-001",
        "location": "Minto Bridge Underpass, Connaught Place",
        "estimated_depth_cm": 85,
        "severity": "HIGH",
        "notes": "Bus stalled in underpass. Water rising steadily above bumper level.",
        "reporter_name": "Traffic Warden R. Sharma",
        "reporter_role": "Traffic Official",
        "coordinates": {"lat": 28.6358, "lng": 77.2285},
        "timestamp": "2026-10-11T08:30:00Z",
        "status": "VERIFIED_ALERT"
    },
    {
        "report_id": "rep-seed-002",
        "location": "Silk Board Junction, Outer Ring Rd",
        "estimated_depth_cm": 40,
        "severity": "MODERATE",
        "notes": "Storm drain clogged by construction debris. 2-wheelers skidding.",
        "reporter_name": "Civic Volunteer Priya K.",
        "reporter_role": "Citizen Volunteer",
        "coordinates": {"lat": 12.9177, "lng": 77.6238},
        "timestamp": "2026-10-11T08:45:00Z",
        "status": "INVESTIGATING"
    }
]

class DecimalEncoder(json.JSONEncoder):
    """Encodes DynamoDB Decimal types to standard int/float for JSON."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def get_dynamo_table():
    """Initializes and returns DynamoDB table resource if possible."""
    if not BOTO3_AVAILABLE:
        return None
    try:
        dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
        table = dynamodb.Table(TABLE_NAME)
        # Quick validation check
        _ = table.table_status
        return table
    except Exception as e:
        print(f"[Jal-Alert] DynamoDB unavailable ({e}). Operating in resilient fallback mode.")
        return None

def build_response(status_code: int, body_data: dict) -> dict:
    """Builds standard API Gateway HTTP proxy response with full CORS support."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        },
        "body": json.dumps(body_data, cls=DecimalEncoder)
    }

def handle_get(table) -> dict:
    """Handles GET requests: returns flood hotspots, active reports, and hydro-advisory stats."""
    reports = list(_in_memory_reports)
    storage_engine = "in-memory-fallback"

    if table is not None:
        try:
            response = table.scan(Limit=50)
            dynamo_items = response.get("Items", [])
            if dynamo_items:
                reports = dynamo_items + [r for r in _in_memory_reports if r["report_id"] not in {d.get("report_id") for d in dynamo_items}]
                storage_engine = "AWS DynamoDB ('jal_reports')"
        except Exception as e:
            print(f"[Jal-Alert] DynamoDB Scan error: {e}. Defaulting to resilient seed store.")

    # Sort reports newest first
    reports.sort(key=lambda r: r.get("timestamp", ""), reverse=True)

    high_risk_count = sum(1 for h in DEFAULT_HOTSPOTS if h["severity"] == "HIGH")
    moderate_risk_count = sum(1 for h in DEFAULT_HOTSPOTS if h["severity"] == "MODERATE")
    max_depth = max((h["depth_cm"] for h in DEFAULT_HOTSPOTS), default=0)

    # Dynamic Hydro Advisory
    if high_risk_count >= 2 or max_depth >= 60:
        overall_risk = "CRITICAL"
        advisory_level = "FLASH_FLOOD_WARNING"
        advisory_title = "CRITICAL HYDRO-ADVISORY: Severe Urban Inundation Detected"
        advisory_message = "Multiple arterial underpasses submerged (>60cm). Avoid low-lying corridors. Divert commercial & personal transit to elevated radial expressways."
    elif high_risk_count == 1 or moderate_risk_count >= 2:
        overall_risk = "ELEVATED"
        advisory_level = "MODERATE_WATERLOGGING_WATCH"
        advisory_title = "HYDRO-ADVISORY: Moderate Waterlogging in Prone Corridors"
        advisory_message = "Drainage bottlenecks reported in transit hubs. Reduce speed, avoid sedan transit through known underpasses, and monitor live sensors."
    else:
        overall_risk = "NOMINAL"
        advisory_level = "STANDARD_MONITORING"
        advisory_title = "HYDRO-ADVISORY: Drainage Flow Operating Normally"
        advisory_message = "All urban stormwater channels within permissible capacity. Regular telemetry monitoring active."

    payload = {
        "status": "success",
        "service": "Jal-Alert AI Urban Flood Engine",
        "version": "1.0.0",
        "engine": storage_engine,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_monitored_hotspots": len(DEFAULT_HOTSPOTS),
            "high_risk_zones": high_risk_count,
            "moderate_risk_zones": moderate_risk_count,
            "max_water_depth_cm": max_depth,
            "active_citizen_reports": len(reports),
            "overall_risk": overall_risk,
            "drainage_stress_index": 78 if overall_risk == "CRITICAL" else 45
        },
        "advisory": {
            "level": advisory_level,
            "risk": overall_risk,
            "title": advisory_title,
            "recommendation": advisory_message,
            "reroute_active": overall_risk in ["CRITICAL", "ELEVATED"]
        },
        "hotspots": DEFAULT_HOTSPOTS,
        "reports": reports
    }
    return build_response(200, payload)

def handle_post(event, table) -> dict:
    """Handles POST requests: validates and records new waterlogging incident reports."""
    try:
        raw_body = event.get("body", "{}")
        if isinstance(raw_body, str):
            data = json.loads(raw_body) if raw_body else {}
        elif isinstance(raw_body, dict):
            data = raw_body
        else:
            data = {}
    except Exception as e:
        return build_response(400, {"status": "error", "message": f"Malformed JSON payload: {str(e)}"})

    location = data.get("location", "").strip()
    if not location:
        return build_response(400, {"status": "error", "message": "Field 'location' is required."})

    try:
        depth_val = float(data.get("estimated_depth_cm", 0))
    except (ValueError, TypeError):
        return build_response(400, {"status": "error", "message": "'estimated_depth_cm' must be a valid number."})

    severity = str(data.get("severity", "MODERATE")).upper()
    if severity not in ["HIGH", "MODERATE", "LOW"]:
        severity = "MODERATE"

    report_id = f"rep-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_report = {
        "report_id": report_id,
        "location": location,
        "estimated_depth_cm": int(depth_val) if depth_val.is_integer() else depth_val,
        "severity": severity,
        "notes": data.get("notes", "").strip() or "Citizen field observation logged.",
        "reporter_name": data.get("reporter_name", "Anonymous Citizen").strip() or "Anonymous Citizen",
        "reporter_role": data.get("reporter_role", "Citizen").strip() or "Citizen",
        "coordinates": data.get("coordinates") or {"lat": 28.6139, "lng": 77.2090},
        "timestamp": now_iso,
        "status": "VERIFIED_ALERT" if severity == "HIGH" else "INVESTIGATING"
    }

    persisted_to_dynamo = False
    if table is not None:
        try:
            # DynamoDB requires Decimal for floats
            item_to_save = dict(new_report)
            item_to_save["estimated_depth_cm"] = Decimal(str(new_report["estimated_depth_cm"]))
            table.put_item(Item=item_to_save)
            persisted_to_dynamo = True
        except Exception as e:
            print(f"[Jal-Alert] DynamoDB write error: {e}. Fallback to memory store.")

    # Always persist to in-memory store so local/demo experience is immediate
    _in_memory_reports.insert(0, new_report)

    return build_response(201, {
        "status": "success",
        "message": "Waterlogging incident report successfully registered.",
        "storage": "DynamoDB" if persisted_to_dynamo else "In-Memory Store (Resilient Fallback)",
        "report": new_report
    })

def lambda_handler(event, context):
    """Main AWS Lambda entry point supporting API Gateway HTTP and REST proxies."""
    # Extract HTTP method (handles REST API and HTTP API payloads)
    http_method = event.get("httpMethod")
    if not http_method:
        http_method = event.get("requestContext", {}).get("http", {}).get("method", "GET")

    http_method = http_method.upper()

    # Preflight CORS
    if http_method == "OPTIONS":
        return build_response(200, {"message": "CORS preflight OK"})

    table = get_dynamo_table()

    if http_method == "GET":
        return handle_get(table)
    elif http_method == "POST":
        return handle_post(event, table)
    else:
        return build_response(405, {"status": "error", "message": f"Method {http_method} not allowed."})
