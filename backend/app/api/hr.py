# app/api/hr.py - Version améliorée

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from app.database import get_db
from app.models.hr import Employee, Department, Leave, EmployeeStatus, LeaveType, LeaveStatus
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ===== EMPLOYÉS =====

@router.get("/employees")
async def get_employees(
    department_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Récupérer la liste des employés avec filtres"""
    from sqlalchemy import or_
    
    query = db.query(Employee)
    
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    
    if status:
        try:
            status_enum = EmployeeStatus(status.upper())
            query = query.filter(Employee.status == status_enum)
        except ValueError:
            pass
    
    if search:
        query = query.filter(
            or_(
                Employee.first_name.ilike(f"%{search}%"),
                Employee.last_name.ilike(f"%{search}%"),
                Employee.email.ilike(f"%{search}%")
            )
        )
    
    total = query.count()
    employees = query.offset(offset).limit(limit).all()
    
    return {
        "success": True,
        "data": [
            {
                "id": e.id,
                "first_name": e.first_name,
                "last_name": e.last_name,
                "email": e.email,
                "phone": e.phone,
                "position": e.position,
                "department_id": e.department_id,
                "status": e.status.value.lower() if e.status else "active",
                "hire_date": e.hire_date.isoformat() if e.hire_date else None,
                "birth_date": e.birth_date.isoformat() if hasattr(e, 'birth_date') and e.birth_date else None,
                "address": getattr(e, 'address', None),
                "city": getattr(e, 'city', None),
                "created_at": e.created_at.isoformat() if hasattr(e, 'created_at') and e.created_at else None
            }
            for e in employees
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }

# app/api/hr.py - Version améliorée avec gestion des doublons

@router.post("/employees")
async def create_employee(
    employee_data: dict,
    db: Session = Depends(get_db)
):
    """Créer ou mettre à jour un employé"""
    try:
        logger.info(f"📝 Création employé: {employee_data}")
        
        email = employee_data.get("email")
        
        # Vérifier si l'employé existe déjà avec cet email
        existing_employee = None
        if email:
            existing_employee = db.query(Employee).filter(
                Employee.email == email
            ).first()
        
        # Si l'employé existe, le mettre à jour
        if existing_employee:
            logger.info(f"🔄 Mise à jour de l'employé existant: ID={existing_employee.id}")
            
            # Mettre à jour les champs
            if employee_data.get("first_name"):
                existing_employee.first_name = employee_data.get("first_name")
            if employee_data.get("last_name"):
                existing_employee.last_name = employee_data.get("last_name")
            if employee_data.get("phone"):
                existing_employee.phone = employee_data.get("phone")
            if employee_data.get("position") or employee_data.get("job_title"):
                existing_employee.position = employee_data.get("position") or employee_data.get("job_title")
            if employee_data.get("department_id"):
                existing_employee.department_id = employee_data.get("department_id")
            if employee_data.get("address"):
                existing_employee.address = employee_data.get("address")
            if employee_data.get("city"):
                existing_employee.city = employee_data.get("city")
            
            db.commit()
            db.refresh(existing_employee)
            
            return {
                "success": True,
                "message": "Employé mis à jour avec succès",
                "data": {
                    "id": existing_employee.id,
                    "first_name": existing_employee.first_name,
                    "last_name": existing_employee.last_name,
                    "email": existing_employee.email,
                    "status": existing_employee.status.value.lower() if existing_employee.status else "active"
                }
            }
        
        # Sinon, créer un nouvel employé
        # Gérer la date d'embauche
        hire_date = date.today()
        if employee_data.get("hire_date"):
            try:
                hire_date = datetime.fromisoformat(employee_data.get("hire_date")).date()
            except:
                pass
        
        # Gérer la date de naissance
        birth_date = None
        if employee_data.get("birth_date"):
            try:
                birth_date = datetime.fromisoformat(employee_data.get("birth_date")).date()
            except:
                pass
        
        # Créer l'employé
        new_employee = Employee(
            first_name=employee_data.get("first_name"),
            last_name=employee_data.get("last_name"),
            email=email,
            phone=employee_data.get("phone"),
            position=employee_data.get("position") or employee_data.get("job_title"),
            department_id=employee_data.get("department_id"),
            status=EmployeeStatus.ACTIVE,
            hire_date=hire_date,
            birth_date=birth_date,
            address=employee_data.get("address"),
            city=employee_data.get("city")
        )
        
        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)
        
        logger.info(f"✅ Employé créé: ID={new_employee.id}")
        
        return {
            "success": True,
            "message": "Employé créé avec succès",
            "data": {
                "id": new_employee.id,
                "first_name": new_employee.first_name,
                "last_name": new_employee.last_name,
                "email": new_employee.email,
                "phone": new_employee.phone,
                "position": new_employee.position,
                "department_id": new_employee.department_id,
                "status": new_employee.status.value.lower() if new_employee.status else "active",
                "hire_date": new_employee.hire_date.isoformat() if new_employee.hire_date else None,
                "birth_date": new_employee.birth_date.isoformat() if new_employee.birth_date else None,
                "address": new_employee.address,
                "city": new_employee.city
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_employee: {e}", exc_info=True)
        # Retourner une erreur plus claire
        return {
            "success": False,
            "error": str(e),
            "message": "Erreur lors de la création de l'employé"
        }



@router.get("/employees/{employee_id}")
async def get_employee_detail(
    employee_id: int,
    db: Session = Depends(get_db)
):
    """Récupérer les détails d'un employé"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    return {
        "success": True,
        "data": {
            "id": employee.id,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "email": employee.email,
            "phone": employee.phone,
            "position": employee.position,
            "department_id": employee.department_id,
            "status": employee.status.value.lower() if employee.status else "active",
            "hire_date": employee.hire_date.isoformat() if employee.hire_date else None,
            "birth_date": employee.birth_date.isoformat() if hasattr(employee, 'birth_date') and employee.birth_date else None,
            "address": getattr(employee, 'address', None),
            "city": getattr(employee, 'city', None)
        }
    }


# ===== DÉPARTEMENTS =====

@router.get("/departments")
async def get_departments(
    db: Session = Depends(get_db)
):
    """Récupérer la liste des départements"""
    departments = db.query(Department).all()
    
    return {
        "success": True,
        "data": [
            {
                "id": d.id,
                "name": d.name,
                "code": d.code,
                "color": getattr(d, 'color', '#1a56db'),
                "description": getattr(d, 'description', None)
            }
            for d in departments
        ],
        "total": len(departments)
    }


@router.post("/departments")
async def create_department(
    department_data: dict,
    db: Session = Depends(get_db)
):
    """Créer un nouveau département"""
    logger.info(f"📝 Création département: {department_data}")
    
    name = department_data.get("name")
    code = department_data.get("code")
    
    if not name:
        raise HTTPException(status_code=400, detail="Le nom du département est requis")
    
    # Vérifier si le département existe déjà
    existing = db.query(Department).filter(Department.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Le département '{name}' existe déjà")
    
    # Créer le département
    new_department = Department(
        name=name,
        code=code or name[:3].upper(),
        color=department_data.get("color", "#1a56db"),
        description=department_data.get("description", "")
    )
    
    db.add(new_department)
    db.commit()
    db.refresh(new_department)
    
    logger.info(f"✅ Département créé: ID={new_department.id}, Nom={new_department.name}")
    
    return {
        "success": True,
        "message": "Département créé avec succès",
        "data": {
            "id": new_department.id,
            "name": new_department.name,
            "code": new_department.code,
            "color": new_department.color,
            "description": new_department.description
        }
    }


# ===== CONGÉS =====

@router.get("/leaves")
async def get_leaves(
    status: Optional[str] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Récupérer les demandes de congé"""
    query = db.query(Leave)
    
    if status:
        try:
            status_enum = LeaveStatus(status.upper())
            query = query.filter(Leave.status == status_enum)
        except ValueError:
            pass
    
    if employee_id:
        query = query.filter(Leave.employee_id == employee_id)
    
    leaves = query.all()
    
    return {
        "success": True,
        "data": [
            {
                "id": l.id,
                "employee_id": l.employee_id,
                "leave_type": l.leave_type.value.lower() if l.leave_type else "annual",
                "start_date": l.start_date.isoformat() if l.start_date else None,
                "end_date": l.end_date.isoformat() if l.end_date else None,
                "duration": l.duration,
                "reason": l.reason,
                "status": l.status.value.lower() if l.status else "pending",
                "created_at": l.created_at.isoformat() if hasattr(l, 'created_at') and l.created_at else None
            }
            for l in leaves
        ],
        "total": len(leaves)
    }


@router.post("/leaves")
async def create_leave(
    leave_data: dict,
    db: Session = Depends(get_db)
):
    """Créer une demande de congé"""
    try:
        logger.info(f"📝 Demande de congé: {leave_data}")
        
        # Récupérer les dates
        start_date = datetime.fromisoformat(leave_data.get("start_date")).date() if leave_data.get("start_date") else date.today()
        end_date = datetime.fromisoformat(leave_data.get("end_date")).date() if leave_data.get("end_date") else date.today()
        
        # Calculer la durée
        duration = (end_date - start_date).days + 1
        
        # Déterminer le type de congé
        leave_type_str = leave_data.get("leave_type", "annual")
        try:
            leave_type = LeaveType(leave_type_str.upper())
        except ValueError:
            leave_type = LeaveType.ANNUAL
        
        new_leave = Leave(
            employee_id=leave_data.get("employee_id"),
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            duration=duration,
            reason=leave_data.get("reason"),
            status=LeaveStatus.PENDING
        )
        
        db.add(new_leave)
        db.commit()
        db.refresh(new_leave)
        
        logger.info(f"✅ Demande de congé créée: ID={new_leave.id}")
        
        return {
            "success": True,
            "message": "Demande de congé créée avec succès",
            "data": {
                "id": new_leave.id,
                "status": new_leave.status.value.lower() if new_leave.status else "pending"
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_leave: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/leaves/{leave_id}/approve")
async def approve_leave(
    leave_id: int,
    db: Session = Depends(get_db)
):
    """Approuver une demande de congé"""
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Demande de congé non trouvée")
    
    if leave.status == LeaveStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Cette demande est déjà approuvée")
    
    leave.status = LeaveStatus.APPROVED
    leave.approved_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"✅ Congé {leave_id} approuvé")
    
    return {
        "success": True,
        "message": "Congé approuvé avec succès",
        "data": {
            "id": leave.id,
            "status": leave.status.value.lower() if leave.status else "approved"
        }
    }


@router.put("/leaves/{leave_id}/reject")
async def reject_leave(
    leave_id: int,
    db: Session = Depends(get_db)
):
    """Rejeter une demande de congé"""
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Demande de congé non trouvée")
    
    if leave.status == LeaveStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Cette demande est déjà approuvée")
    
    leave.status = LeaveStatus.REJECTED
    db.commit()
    
    logger.info(f"❌ Congé {leave_id} rejeté")
    
    return {
        "success": True,
        "message": "Congé rejeté",
        "data": {
            "id": leave.id,
            "status": leave.status.value.lower() if leave.status else "rejected"
        }
    }


# ===== DASHBOARD =====

@router.get("/dashboard/kpi")
async def get_dashboard_kpi(
    db: Session = Depends(get_db)
):
    """Récupérer les KPIs du dashboard RH"""
    total_employees = db.query(Employee).count()
    active_employees = db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE).count()
    on_leave = db.query(Employee).filter(Employee.status == EmployeeStatus.ON_LEAVE).count()
    pending_leaves = db.query(Leave).filter(Leave.status == LeaveStatus.PENDING).count()
    
    # Calculer le taux d'absentéisme
    attendance_rate = round((active_employees / total_employees * 100) if total_employees > 0 else 0, 1)
    
    return {
        "success": True,
        "data": [
            {
                "title": "Total employés",
                "value": total_employees,
                "icon": "TeamOutlined",
                "color": "#1a56db",
                "trend": 5
            },
            {
                "title": "Employés actifs",
                "value": active_employees,
                "icon": "UserOutlined",
                "color": "#059669",
                "trend": 3
            },
            {
                "title": "En congé",
                "value": on_leave,
                "icon": "CalendarOutlined",
                "color": "#d97706",
                "trend": -2
            },
            {
                "title": "Demandes en attente",
                "value": pending_leaves,
                "icon": "ClockCircleOutlined",
                "color": "#dc2626",
                "trend": 10
            }
        ]
    }


@router.get("/dashboard/departments")
async def get_departments_stats(
    db: Session = Depends(get_db)
):
    """Récupérer les statistiques des départements"""
    departments = db.query(Department).all()
    total_employees = db.query(Employee).count()
    
    result = []
    for dept in departments:
        employees_count = db.query(Employee).filter(Employee.department_id == dept.id).count()
        result.append({
            "id": dept.id,
            "name": dept.name,
            "employees_count": employees_count,
            "percentage": round((employees_count / total_employees * 100) if total_employees > 0 else 0, 1),
            "color": getattr(dept, 'color', '#1a56db')
        })
    
    return {
        "success": True,
        "data": result,
        "total": len(result)
    }


@router.get("/dashboard/birthdays")
async def get_upcoming_birthdays(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Récupérer les anniversaires à venir"""
    from sqlalchemy import extract
    
    today = date.today()
    end_date = today + timedelta(days=days)
    
    # Récupérer les employés avec une date de naissance
    employees = db.query(Employee).filter(
        Employee.birth_date.isnot(None),
        Employee.status == EmployeeStatus.ACTIVE
    ).all()
    
    birthdays = []
    for emp in employees:
        if emp.birth_date:
            # Calculer le prochain anniversaire
            birth_date = emp.birth_date
            next_birthday = birth_date.replace(year=today.year)
            if next_birthday < today:
                next_birthday = next_birthday.replace(year=today.year + 1)
            
            days_until = (next_birthday - today).days
            
            if days_until <= days:
                age = today.year - birth_date.year
                if next_birthday.year > today.year:
                    age = age + 1
                
                birthdays.append({
                    "id": emp.id,
                    "name": f"{emp.first_name} {emp.last_name}",
                    "birth_date": emp.birth_date.isoformat() if emp.birth_date else None,
                    "days_until": days_until,
                    "age": age
                })
    
    birthdays.sort(key=lambda x: x["days_until"])
    
    return {
        "success": True,
        "data": birthdays[:10],
        "total": len(birthdays)
    }


# ===== IMPORT TIMEDELTA =====
from datetime import timedelta