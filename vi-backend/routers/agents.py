from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import get_supabase
from dependencies import get_current_user, AuthUser
from pydantic import BaseModel

router = APIRouter()


class AssignAgent(BaseModel):
    agent_id: int


@router.get("/agents")
def list_agents(user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    agents = supabase.table('agents').select('*').eq('is_active', True).execute()
    return agents.data


@router.get("/agents/{agent_id}")
def get_agent(agent_id: int, user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    agent = supabase.table('agents').select('*').eq('id', agent_id).execute()
    if not agent.data:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent.data[0]


@router.put("/businesses/{business_id}/agent")
def assign_agent(business_id: int, data: AssignAgent, user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    biz = supabase.table('business_profiles').select('user_id').eq('id', business_id).execute()
    if not biz.data or biz.data[0]['user_id'] != user.id:
        raise HTTPException(status_code=404, detail="Business not found")

    agent = supabase.table('agents').select('*').eq('id', data.agent_id).execute()
    if not agent.data:
        raise HTTPException(status_code=404, detail="Agent not found")

    supabase.table('business_profiles').update({
        'active_agent_id': data.agent_id
    }).eq('id', business_id).execute()

    return {"status": "success", "agent": agent.data[0]}
