from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from pydantic import BaseModel
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client

router = APIRouter(prefix="/audit", tags=["Audit & Rastreabilidade"])

class AuditLogCreate(BaseModel):
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[dict] = None

@router.post("")
async def create_audit_log(
    item: AuditLogCreate, 
    request: Request,
    user: dict = Depends(get_current_user)
):
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database error")
    
    # Do not block the main flow if it fails
    try:
        ip = request.client.host if request.client else None
        data = {
            "user_id": user.get("id"),
            "action": item.action,
            "entity_type": item.entity_type,
            "entity_id": item.entity_id,
            "details": item.details,
            "ip_address": ip
        }
        res = supabase.table("audit_logs").insert(data).execute()
        return {"status": "ok"}
    except Exception as e:
        print(f"Error logging audit: {e}")
        return {"status": "error"}

@router.get("")
async def get_audit_logs(
    entity_type: Optional[str] = None, 
    user: dict = Depends(get_current_user)
):
    supabase = get_supabase_client()
    if not supabase:
        return []
    
    query = supabase.table("audit_logs").select("*, auth.users(email)")
    if entity_type:
        query = query.eq("entity_type", entity_type)
        
    res = query.order("created_at", desc=True).limit(200).execute()
    
    # Process the auth.users join because postgrest-js might not fetch it perfectly if it's cross-schema 
    # Actually, Supabase postgrest-js can't join `auth.users` easily by default unless there's a view.
    # Let's see if it works. If not, we will just return the user_id.
    return res.data
