from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db

# ----------------------------- Constants -----------------------------
class Status:
    PENDING = 'PENDING'
    IN_PROGRESS = 'IN_PROGRESS'
    READY = 'READY'
    COMPLETED = 'COMPLETED'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'
    DONE = 'DONE'
    VERIFIED = 'VERIFIED'
    UNREAD = 'UNREAD'
    READ = 'READ'
    PROCESSED = 'PROCESSED'

    # New workflow statuses
    RM_CHECK = 'RM_CHECK'               # PPC Planner reviewing RM data
    RM_SENT = 'RM_SENT'                 # RM submitted to Store Keeper
    RM_ACCEPTED = 'RM_ACCEPTED'         # Store Keeper accepted RM, sent to plant
    PRODUCTION_DONE = 'PRODUCTION_DONE' # All parts manufactured
    DISPATCHED = 'DISPATCHED'           # Dispatched to client
    SUFFICIENT = 'SUFFICIENT'           # Stock already sufficient
    SHORTAGE = 'SHORTAGE'               # Stock gap found
    IN_PRODUCTION = 'IN_PRODUCTION'     # DEO actively manufacturing

# ----------------------------- Roles -----------------------------
class UserRole:
    ADMIN = 'Admin'
    MANAGER = 'Manager'
    SUPERVISOR = 'Supervisor'
    DEO = 'DEO'
    PPC_PLANNER = 'PPC_Planner'
    STORE_KEEPER = 'Store_Keeper'

# ----------------------------- ProductionData -----------------------------
class ProductionData(db.Model):
    """Stores production-specific metrics for a part."""
    __tablename__ = 'production_data'
    
    id = db.Column(db.Integer, primary_key=True)
    master_data_id = db.Column(db.Integer, db.ForeignKey('master_data.id', ondelete='CASCADE'), unique=True, index=True)
    
    # Specific columns based on most common patterns
    total_value = db.Column(db.String(100))
    model_specific = db.Column(db.String(100)) # Mapping for "Model1" etc
    coverage = db.Column(db.String(100))
    total_production = db.Column(db.String(100))
    total_dispatch = db.Column(db.String(100))
    
    # Structured Fields
    rm_size = db.Column(db.String(100))
    stock = db.Column(db.String(100))
    total_disp = db.Column(db.String(100))
    target_qty = db.Column(db.String(100))
    remain_qty = db.Column(db.String(100))
    sn_no = db.Column(db.String(100))
    today_produced = db.Column(db.String(100))
    row_status = db.Column(db.String(100))

    # Capacity / Industrial Metrics
    machine = db.Column(db.String(100))
    no_of_machines = db.Column(db.String(100))
    strokes_per_part = db.Column(db.String(100))
    part_weight = db.Column(db.String(100))
    
    # Overflow for dynamic headers (minimal use moving forward)
    additional_fields = db.Column(db.JSON, default={})

    master_data = db.relationship('MasterData', back_populates='production_rel', uselist=False)

    def to_dict(self):
        data = {
            "Total value": self.total_value,
            "Model1": self.model_specific,
            "Coverage": self.coverage,
            "Total Production": self.total_production,
            "Total Dispatch": self.total_dispatch,
            "RM SIZE": self.rm_size,
            "STOCK": self.stock,
            "Total disp": self.total_disp,
            "Target Qty": self.target_qty,
            "Remain Qty": self.remain_qty,
            "Today Produced": self.today_produced,
            "SN NO": self.sn_no,
            "row_status": self.row_status,
            "Machine": self.machine,
            "No. of Machines": self.no_of_machines,
            "Strokes / Part": self.strokes_per_part,
            "Part Weight (kg)": self.part_weight
        }
        if self.additional_fields:
            data.update(self.additional_fields)
        # Filter out None values
        return {k: v for k, v in data.items() if v is not None}

# ----------------------------- MaterialData -----------------------------
class MaterialData(db.Model):
    """Stores material-specific details for a part."""
    __tablename__ = 'material_data'
    
    id = db.Column(db.Integer, primary_key=True)
    master_data_id = db.Column(db.Integer, db.ForeignKey('master_data.id', ondelete='CASCADE'), unique=True, index=True)
    
    # Specific columns for material properties
    rm_thk_mm = db.Column(db.String(100))
    sheet_width = db.Column(db.String(100))
    sheet_length = db.Column(db.String(100))
    no_of_comp_per_sheet = db.Column(db.String(100))
    rm_size = db.Column(db.String(100))
    rm_grade = db.Column(db.String(100))
    act_rm_sizes = db.Column(db.String(100))
    revised = db.Column(db.String(100))
    validity = db.Column(db.String(100))
    
    # New Structured Fields from additional_fields
    per_day = db.Column(db.String(100))
    total_scheduled_qty = db.Column(db.String(100))
    
    # Overflow for dynamic headers
    additional_fields = db.Column(db.JSON, default={})

    master_data = db.relationship('MasterData', back_populates='material_rel', uselist=False)

    def to_dict(self):
        data = {
            "RM Thk mm": self.rm_thk_mm,
            "Sheet Width": self.sheet_width,
            "Sheet Length": self.sheet_length,
            "No of comp per sheet": self.no_of_comp_per_sheet,
            "RM SIZE": self.rm_size,
            "RM Grade": self.rm_grade,
            "Act RM Sizes": self.act_rm_sizes,
            "Revised": self.revised,
            "VALIDITY": self.validity,
            "PER DAY": self.per_day,
            "TOTAL SCHEDULE QTY": self.total_scheduled_qty
        }
        if self.additional_fields:
            data.update(self.additional_fields)
        return {k: v for k, v in data.items() if v is not None}

# ----------------------------- PartMachineMapping -----------------------------
class PartMachineMapping(db.Model):
    """Dedicated Master Data table for Part-to-Machine mappings."""
    __tablename__ = 'part_machine_mappings'
    
    id = db.Column(db.Integer, primary_key=True)
    part_number = db.Column(db.String(255))
    sap_part_number = db.Column(db.String(255), unique=True, index=True)
    machine = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

    def __repr__(self):
        return f'<PartMachineMapping {self.sap_part_number} -> {self.machine}>'

    def to_dict(self):
        return {
            "id": self.id,
            "part_number": self.part_number,
            "sap_part_number": self.sap_part_number,
            "machine": self.machine,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

# ----------------------------- MasterData -----------------------------
class MasterData(db.Model):
    """Stores master data for parts, with dynamic JSON fields."""
    __tablename__ = 'master_data'
    
    id = db.Column(db.Integer, primary_key=True)
    model = db.Column(db.String(100), index=True)
    part_number = db.Column(db.String(255))
    sap_part_number = db.Column(db.String(255), index=True)
    description = db.Column(db.Text)
    saleable_no = db.Column(db.String(255))
    assembly_number = db.Column(db.String(255))
    
    # Relationships for refined storage
    production_rel = db.relationship('ProductionData', back_populates='master_data', uselist=False, cascade='all, delete-orphan')
    material_rel = db.relationship('MaterialData', back_populates='master_data', uselist=False, cascade='all, delete-orphan')
    
    # Flag for parts added manually/ad-hoc on the shop floor
    is_ad_hoc = db.Column(db.Boolean, default=False)

    __table_args__ = (
        db.UniqueConstraint('model', 'sap_part_number', name='_model_sap_uc'),
        # Add indexes for performance
        db.Index('ix_master_data_model_sap', 'model', 'sap_part_number'),
    )

    def __repr__(self):
        return f'<MasterData {self.model} {self.sap_part_number}>'

    def to_dict(self):
        # Strict relational data access
        prod_data = self.production_rel.to_dict() if self.production_rel else {}
        mat_data = self.material_rel.to_dict() if self.material_rel else {}
        
        return {
            "common": {
                "id": self.id,
                "model": self.model,
                "part_number": self.part_number,
                "sap_part_number": self.sap_part_number,
                "description": self.description,
                "saleable_no": self.saleable_no,
                "assembly_number": self.assembly_number,
                "is_ad_hoc": self.is_ad_hoc
            },
            "production_data": prod_data,
            "material_data": mat_data
        }

# ----------------------------- User -----------------------------
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, index=True)
    name = db.Column(db.String(255))
    password_hash = db.Column(db.String(255))
    role = db.Column(db.String(50))  # Admin | Manager | Supervisor | DEO | PPC_Planner | Store_Keeper
    shop = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    last_activity = db.Column(db.DateTime, nullable=True)
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)
    assigned_line_id = db.Column(db.Integer, db.ForeignKey('production_lines.id', ondelete='SET NULL'), nullable=True)
    # For DEO: which machine they are assigned to (links to ProductionLine/machine)
    assigned_machine_id = db.Column(db.Integer, db.ForeignKey('production_lines.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    assigned_line = db.relationship('ProductionLine', foreign_keys=[assigned_line_id])
    assigned_machine = db.relationship('ProductionLine', foreign_keys=[assigned_machine_id])

    # ---------------------------------------------------------------------
    # Password handling helpers
    # ---------------------------------------------------------------------
    @property
    def password(self):
        raise AttributeError("Password is write\u2011only; use set via the property setter.")

    @password.setter
    def password(self, raw_password: str):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash or "", raw_password)

    def __repr__(self):
        return f'<User {self.username} ({self.role})>'

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "name": self.name,
            "role": self.role,
            "shop": self.shop,
            "isActive": self.is_active,
            "lastActivity": self.last_activity.isoformat() if self.last_activity else None,
            "assigned_line_id": self.assigned_line_id,
            "assigned_line_name": self.assigned_line.name if self.assigned_line else None,
            "assigned_machine_id": self.assigned_machine_id,
            "assigned_machine_name": self.assigned_machine.name if self.assigned_machine else None
        }

# ----------------------------- AuditLog -----------------------------
class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), index=True)
    username = db.Column(db.String(100))  # Snapshot for easy reading
    action = db.Column(db.String(100))    # e.g., 'LOGIN', 'UPDATE_BOM', 'DELETE_EMAIL'
    ip_address = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=db.func.now(), index=True)

    user = db.relationship('User', backref='logs')

    def __repr__(self):
        return f'<AuditLog {self.action} by {self.username} at {self.timestamp}>'

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "username": self.username,
            "action": self.action,
            "ipAddress": self.ip_address,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }

# ----------------------------- ProductionLine -----------------------------
class ProductionLine(db.Model):
    __tablename__ = 'production_lines'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    line_name = db.Column(db.String(100))  # Area/Category (e.g. ABC)
    description = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('production_lines.id', ondelete='CASCADE'), nullable=True)
    status = db.Column(db.String(20), default='AVAILABLE') # AVAILABLE, BUSY, MAINTENANCE

    # Self-referencing relationship for child machines
    children = db.relationship('ProductionLine', backref=db.backref('parent', remote_side=[id]), cascade='all, delete-orphan')

    def __repr__(self):
        return f'<ProductionLine {self.name}>'

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "line_name": self.line_name,
            "description": self.description,
            "isActive": self.is_active,
            "parent_id": self.parent_id,
            "status": self.status,
            "children": [child.to_dict() for child in self.children]
        }

# ----------------------------- CarModel -----------------------------
class CarModel(db.Model):
    __tablename__ = 'car_models'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    model_code = db.Column(db.String(50), unique=True, index=True)
    type = db.Column(db.String(50))  # SUV, Sedan, etc.

    # Assignments
    production_line_id = db.Column(db.Integer, db.ForeignKey('production_lines.id', ondelete='SET NULL'), nullable=True, index=True)
    supervisor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    assigned_deo_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    deo_accepted = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default=Status.PENDING)  # Use constant

    identification_headers = db.Column(db.JSON)
    production_headers = db.Column(db.JSON)
    material_headers = db.Column(db.JSON)

    # Relationships
    line = db.relationship('ProductionLine', backref='models')
    supervisor = db.relationship('User', foreign_keys=[supervisor_id], backref='supervised_models')
    deo = db.relationship('User', foreign_keys=[assigned_deo_id], backref='assigned_models')

    def __repr__(self):
        return f'<CarModel {self.name} ({self.model_code})>'

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "model_code": self.model_code,
            "type": self.type,
            "line_id": self.production_line_id,
            "line_name": self.line.name if self.line else None,
            "supervisor_id": self.supervisor_id,
            "supervisor_name": self.supervisor.name if self.supervisor else None,
            "assigned_deo_id": self.assigned_deo_id,
            "deo_accepted": self.deo_accepted,
            "assigned_deo_name": self.deo.name if self.deo else None,
            "status": self.status,
            "identification_headers": self.identification_headers,
            "production_headers": self.production_headers,
            "material_headers": self.material_headers
        }

# ----------------------------- DailyWorkStatus -----------------------------
class DailyWorkStatus(db.Model):
    __tablename__ = 'daily_work_status'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, default=db.func.current_date(), index=True)
    car_model_id = db.Column(db.Integer, db.ForeignKey('car_models.id'), nullable=False, index=True)
    deo_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # KPIs from DailyProduction
    shift = db.Column(db.String(20))  # e.g. Shift A, Shift B
    planned_qty = db.Column(db.Integer, default=0)
    actual_qty = db.Column(db.Integer, default=0)
    
    status = db.Column(db.String(20), default=Status.PENDING)  # Use constant
    supervisor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    verified_at = db.Column(db.DateTime, nullable=True)

    # Relationships (added missing ones)
    car_model = db.relationship('CarModel', backref='daily_work_statuses')
    deo = db.relationship('User', foreign_keys=[deo_id], backref='daily_work_statuses')
    supervisor = db.relationship('User', foreign_keys=[supervisor_id], backref='verified_work_statuses')

    def __repr__(self):
        return f'<DailyWorkStatus {self.date} model={self.car_model_id} deo={self.deo_id}>'

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.isoformat() if self.date else None,
            "car_model_id": self.car_model_id,
            "deo_id": self.deo_id,
            "shift": self.shift,
            "planned_qty": self.planned_qty,
            "actual_qty": self.actual_qty,
            "status": self.status,
            "supervisor_id": self.supervisor_id,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None
        }

# ----------------------------- Demand -----------------------------
class Demand(db.Model):
    __tablename__ = 'demands'
    
    id = db.Column(db.Integer, primary_key=True)
    formatted_id = db.Column(db.String(50), unique=True)
    model_id = db.Column(db.Integer, db.ForeignKey('car_models.id'), index=True)
    model_name = db.Column(db.String(100))
    quantity = db.Column(db.Integer)
    start_date = db.Column(db.String(20))  # Storing as string YYYY-MM-DD
    end_date = db.Column(db.String(20))
    status = db.Column(db.String(50), default=Status.PENDING)  # Use constant
    line = db.Column(db.String(50))
    manager = db.Column(db.String(100))
    customer = db.Column(db.String(100))
    company = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=db.func.now(), index=True)
    # Soft delete fields — demand is hidden from UI but preserved in DB as backup
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

    # Relationship
    model = db.relationship('CarModel', backref='demands_list')

    # Computed properties for cleaner to_dict
    @property
    def line_name(self):
        if self.line:
            return self.line
        if self.model and self.model.line:
            return self.model.line.name
        return None

    @property
    def assigned_deo_name(self):
        if self.model and self.model.deo:
            return self.model.deo.name
        return None

    @property
    def deo_email(self):
        if self.model and self.model.deo:
            return f"{self.model.deo.username}@gmail.com"
        return None

    @property
    def supervisor_name(self):
        if self.model and self.model.supervisor:
            return self.model.supervisor.name
        return None

    @property
    def supervisor_email(self):
        if self.model and self.model.supervisor:
            return f"{self.model.supervisor.username}@gmail.com"
        return None

    @staticmethod
    def check_and_update_status(demand_id):
        """
        New logic:
        - SUFFICIENT items are excluded from production check (no manufacturing needed)
        - Demand moves to PRODUCTION_DONE only when all SHORTAGE items reach PRODUCTION_DONE
        - Demand moves to DISPATCHED when Store Keeper dispatches
        """
        if not demand_id:
            return
        demand = Demand.query.get(demand_id)
        if not demand:
            return

        from app.models.models import InventoryItem
        items = InventoryItem.query.filter_by(demand_id=demand_id).all()
        if not items:
            return

        # Only items that need manufacturing
        production_items = [it for it in items if it.status != 'SUFFICIENT']

        if not production_items:
            # All parts were already in stock — mark done
            demand.status = 'PRODUCTION_DONE'
            db.session.commit()
            return

        all_production_done = all(
            it.status in ['PRODUCTION_DONE', 'DISPATCHED'] for it in production_items
        )

        if all_production_done and demand.status not in ['PRODUCTION_DONE', 'DISPATCHED', 'COMPLETED']:
            demand.status = 'PRODUCTION_DONE'
            db.session.commit()

    def __repr__(self):
        return f'<Demand {self.formatted_id} - {self.model_name} qty={self.quantity}>'

    def to_dict(self):
        return {
            "id": self.id,
            "formatted_id": self.formatted_id,
            "model_id": self.model_id,
            "model_name": self.model.name if self.model else self.model_name,
            "quantity": self.quantity,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "status": self.status,
            "line": self.line_name,
            "manager": self.manager,
            "assigned_deo_name": self.assigned_deo_name,
            "deo_email": self.deo_email,
            "supervisor_name": self.supervisor_name,
            "supervisor_email": self.supervisor_email,
            "customer": self.customer,
            "company": self.company,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }

# ----------------------------- DEOProductionEntry -----------------------------
class DEOProductionEntry(db.Model):
    """
    Relational storage for individual production rows. 
    Replaces the JSON log_data snapshot with queryable columns.
    """
    __tablename__ = 'deo_production_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.Integer, db.ForeignKey('daily_production_logs.id', ondelete='CASCADE'), index=True)
    
    # Identification
    sn_no = db.Column(db.Integer)
    sap_part_number = db.Column(db.String(255), index=True)
    part_number = db.Column(db.String(255))
    part_description = db.Column(db.Text)
    adhoc_part_id = db.Column(db.Integer, db.ForeignKey('deo_adhoc_parts.id', ondelete='SET NULL'), nullable=True, index=True)
    adhoc_part = db.relationship('DeoAdHocPart', backref='deo_production_entries')
    
    # Production Data (Separate Columns)
    per_day = db.Column(db.Float, default=0.0)
    sap_stock = db.Column(db.Float, default=0.0)
    opening_stock = db.Column(db.Float, default=0.0)
    todays_stock = db.Column(db.Float, default=0.0)
    coverage_days = db.Column(db.Float, default=0.0)
    
    # Status
    status = db.Column(db.String(20), default=Status.PENDING)
    row_status = db.Column(db.String(100))
    supervisor_reviewed = db.Column(db.Boolean, default=False)
    rejection_reason = db.Column(db.Text)
    deo_reply = db.Column(db.Text)
    
    # Metadata
    date = db.Column(db.Date, index=True)
    car_model_id = db.Column(db.Integer, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "log_id": self.log_id,
            "SN NO": self.sn_no,
            "SAP PART NUMBER": self.sap_part_number,
            "PART NUMBER": self.part_number,
            "PART DESCRIPTION": self.part_description,
            "PER DAY": self.per_day,
            "SAP Stock": self.sap_stock,
            "Opening Stock": self.opening_stock,
            "Todays Stock": self.todays_stock,
            "Coverage Days": self.coverage_days,
            "Production Status": self.status,
            "row_status": self.row_status,
            "supervisor_reviewed": self.supervisor_reviewed,
            "rejection_reason": self.rejection_reason,
            "deo_reply": self.deo_reply,
            "adhoc_part_id": self.adhoc_part_id,
            "is_adhoc": self.adhoc_part_id is not None
        }

# ----------------------------- DailyProductionLog -----------------------------
class DailyProductionLog(db.Model):
    __tablename__ = 'daily_production_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, default=db.func.current_date(), index=True)
    deo_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    car_model_id = db.Column(db.Integer, db.ForeignKey('car_models.id'), nullable=True, index=True)
    demand_id = db.Column(db.Integer, db.ForeignKey('demands.id'), nullable=True, index=True)
    model_name = db.Column(db.String(100), nullable=False)  # Keep for historical/display
    status = db.Column(db.String(20), default=Status.PENDING)  # Overall log status
    supervisor_comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=db.func.now(), index=True)

    deo = db.relationship('User', foreign_keys=[deo_id], backref='daily_logs')
    car_model = db.relationship('CarModel', backref='daily_logs')
    demand = db.relationship('Demand', backref='daily_logs')
    entries = db.relationship('DEOProductionEntry', backref='log', cascade='all, delete-orphan')

    # Computed properties for derived stats
    @property
    def total_unique_parts(self):
        return len(self.entries)
    
    @property
    def total_requirements(self):
        total = 0
        for entry in self.entries:
            total += (entry.per_day or 0)
        return int(total)

    @property
    def target_vehicles(self):
        return self.demand.quantity if self.demand else 0

    @property
    def line_name(self):
        if self.car_model and self.car_model.line:
            return self.car_model.line.name
        return "LINE 1"

    @property
    def customer_name(self):
        return self.demand.customer if self.demand else "T4"

    @property
    def manager_name(self):
        return self.demand.manager if self.demand else "Admin"

    def __repr__(self):
        return f'<DailyProductionLog {self.date} deo={self.deo_id} status={self.status}>'

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.isoformat() if self.date else None,
            "deo_id": self.deo_id,
            "deo_name": self.deo.name if self.deo else 'Unknown',
            "car_model_id": self.car_model_id,
            "demand_id": self.demand_id,
            "model_name": self.model_name,
            "status": self.status,
            "supervisor_comment": self.supervisor_comment,
            "log_data": [e.to_dict() for e in self.entries], # Replaces JSON with Relational Entries (Frontend bridge)
            "entries": [e.to_dict() for e in self.entries],
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "target_vehicles": self.target_vehicles,
            "line_name": self.line_name,
            "customer_name": self.customer_name,
            "manager_name": self.manager_name,
            "total_unique_parts": self.total_unique_parts,
            "total_requirements": self.total_requirements
        }

# ----------------------------- EmailRequest -----------------------------
class EmailRequest(db.Model):
    __tablename__ = 'email_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    imap_uid = db.Column(db.String(50), unique=True, index=True)
    message_id = db.Column(db.Text, index=True)
    sender = db.Column(db.Text)
    sender_email = db.Column(db.Text)
    subject = db.Column(db.Text)
    body = db.Column(db.Text)
    received_at = db.Column(db.DateTime, index=True)
    status = db.Column(db.String(20), default=Status.UNREAD, index=True)
    created_at = db.Column(db.DateTime, default=db.func.now())

    def __repr__(self):
        return f'<EmailRequest {self.imap_uid} from {self.sender_email} status={self.status}>'

    def to_dict(self):
        return {
            "id": self.id,
            "imap_uid": self.imap_uid,
            "message_id": self.message_id,
            "sender": self.sender,
            "sender_email": self.sender_email,
            "subject": self.subject,
            "body": self.body,
            "received_date": self.received_at.isoformat() if self.received_at else None,
            "status": self.status,
            "is_read": self.status != Status.UNREAD
        }


# ----------------------------- InventoryItem -----------------------------
class InventoryItem(db.Model):
    """
    Tracks parts/components for a car model against a demand requirement.
    Auto-populated from MasterData when a demand is created.

    Stock tracking (no double-counting):
      initial_stock  → set once by PPC Planner via Excel upload
      produced_qty   → cumulative total added by DEO machine entries
      current_stock  → computed: initial_stock + produced_qty (property)
    """
    __tablename__ = 'inventory_items'

    id = db.Column(db.Integer, primary_key=True)
    serial_number = db.Column(db.Integer)                          # Display order
    car_model_id = db.Column(db.Integer, db.ForeignKey('car_models.id', ondelete='SET NULL'), nullable=True, index=True)
    demand_id = db.Column(db.Integer, db.ForeignKey('demands.id', ondelete='SET NULL'), nullable=True, index=True)
    vehicle_name = db.Column(db.String(100))                       # Denormalized: car model name
    sap_part_number = db.Column(db.String(255), index=True)
    part_description = db.Column(db.String(500))

    # Split stock fields to prevent double-counting
    initial_stock = db.Column(db.Float, default=0.0)   # Set once by PPC Planner via Excel
    produced_qty = db.Column(db.Float, default=0.0)    # Cumulative from DEO machine entries
    # Legacy field kept for backward compatibility — now auto-synced
    current_stock = db.Column(db.Float, default=0.0)

    demand_quantity = db.Column(db.Float, default=0.0)
    # SUFFICIENT | SHORTAGE | IN_PRODUCTION | PRODUCTION_DONE | DISPATCHED
    status = db.Column(db.String(30), default='SUFFICIENT')

    # RM check status for PPC Planner workflow
    rm_status = db.Column(db.String(30), default='PENDING')  # PENDING | RM_SUBMITTED | RM_ACCEPTED | RM_REJECTED

    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

    # Relationships
    car_model = db.relationship('CarModel', backref='inventory_items')
    demand = db.relationship('Demand', backref='inventory_items')
    shortage_requests = db.relationship('PartShortageRequest', back_populates='inventory_item', cascade='all, delete-orphan')
    rm_check_requests = db.relationship('RMCheckRequest', back_populates='inventory_item', cascade='all, delete-orphan', lazy='dynamic')

    def sync_current_stock(self):
        """Keep legacy current_stock in sync. Call after updating initial_stock or produced_qty."""
        self.current_stock = (self.initial_stock or 0.0) + (self.produced_qty or 0.0)

    @property
    def effective_stock(self):
        """Always computed — the true stock value."""
        return (self.initial_stock or 0.0) + (self.produced_qty or 0.0)

    @property
    def shortage_quantity(self):
        """How many units are missing. 0 if sufficient."""
        gap = self.demand_quantity - self.effective_stock
        return max(gap, 0.0)

    @property
    def action(self):
        """Computed action status for the action column in the UI."""
        if self.status == 'PRODUCTION_DONE':
            return 'READY_FOR_DISPATCH'
        if self.status in ['IN_PRODUCTION']:
            return 'IN_PRODUCTION'
        if self.status == 'DISPATCHED':
            return 'DISPATCHED'
        if self.status in ['WAITING_RM_APPROVAL', 'PENDING_DEO']:
            return self.status
        if self.effective_stock >= self.demand_quantity:
            return 'STOCK_OK'
        return 'NEW_DEMAND'

    def __repr__(self):
        return f'<InventoryItem {self.sap_part_number} stock={self.effective_stock} demand={self.demand_quantity}>'

    def to_dict(self):
        # Get machine group from PartMachineMapping
        machine_group = None
        from app.models import PartMachineMapping
        mapping = PartMachineMapping.query.filter_by(sap_part_number=self.sap_part_number).first()
        if mapping and mapping.machine:
            machine_group = mapping.machine.replace(', ', ' -> ')

        # Get demand formatted_id for display
        demand_formatted_id = self.demand.formatted_id if self.demand else None

        return {
            "id": self.id,
            "serial_number": self.serial_number,
            "car_model_id": self.car_model_id,
            "demand_id": self.demand_id,
            "demand_formatted_id": demand_formatted_id,
            "vehicle_name": self.vehicle_name,
            "sap_part_number": self.sap_part_number,
            "part_description": self.part_description,
            "initial_stock": self.initial_stock,
            "produced_qty": self.produced_qty,
            "current_stock": self.effective_stock,
            "demand_quantity": self.demand_quantity,
            "shortage_quantity": self.shortage_quantity,
            "status": self.status,
            "rm_status": self.rm_status,
            "action": self.action,
            "machine_group": machine_group,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ----------------------------- PartShortageRequest -----------------------------
shortage_machine_association = db.Table('shortage_machine_association',
    db.Column('shortage_id', db.Integer, db.ForeignKey('part_shortage_requests.id', ondelete='CASCADE'), primary_key=True),
    db.Column('machine_id', db.Integer, db.ForeignKey('production_lines.id', ondelete='CASCADE'), primary_key=True)
)

class PartShortageRequest(db.Model):
    """
    Created by Admin when a part's stock is below the demand requirement.
    DEO fills in the stock details within the given deadline/timeline.
    Admin then approves and updates the InventoryItem stock.
    """
    __tablename__ = 'part_shortage_requests'

    id = db.Column(db.Integer, primary_key=True)
    formatted_id = db.Column(db.String(50), unique=True, index=True)   # e.g. PSR-001
    inventory_item_id = db.Column(db.Integer, db.ForeignKey('inventory_items.id', ondelete='CASCADE'), nullable=False, index=True)
    shortage_quantity = db.Column(db.Float, default=0.0)                # How many units needed
    deadline = db.Column(db.Date, nullable=True)                        # Timeline for DEO to fill
    status = db.Column(db.String(30), default='PENDING')                # PENDING | DEO_FILLED | COMPLETED | REJECTED

    # DEO assignment
    deo_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    supervisor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    line_id = db.Column(db.Integer, db.ForeignKey('production_lines.id', ondelete='SET NULL'), nullable=True, index=True)

    # Fields filled by DEO (kept for legacy/simple case, but daily_entries is preferred for daily logs)
    sap_stock = db.Column(db.Float, nullable=True)
    opening_stock = db.Column(db.Float, nullable=True)
    todays_stock = db.Column(db.Float, nullable=True)
    deo_notes = db.Column(db.Text, nullable=True)
    deo_filled_at = db.Column(db.DateTime, nullable=True)

    # Admin approval
    admin_approved_at = db.Column(db.DateTime, nullable=True)
    admin_notes = db.Column(db.Text, nullable=True)

    # Specific machine assigned
    machine_id = db.Column(db.Integer, db.ForeignKey('production_lines.id', ondelete='SET NULL'), nullable=True)

    created_at = db.Column(db.DateTime, default=db.func.now())

    # Relationships
    inventory_item = db.relationship('InventoryItem', back_populates='shortage_requests')
    deo = db.relationship('User', foreign_keys=[deo_id], backref='shortage_assignments')
    supervisor = db.relationship('User', foreign_keys=[supervisor_id], backref='supervised_shortages')
    production_line = db.relationship('ProductionLine', foreign_keys=[line_id])
    machine = db.relationship('ProductionLine', foreign_keys=[machine_id]) # Legacy single machine
    assigned_machines = db.relationship('ProductionLine', secondary=shortage_machine_association, backref='assigned_shortages')
    daily_entries = db.relationship('ShortageDailyEntry', back_populates='shortage_request', cascade='all, delete-orphan')

    @property
    def days_remaining(self):
        """Days left until deadline. Negative = overdue."""
        import datetime
        if not self.deadline:
            return None
        delta = self.deadline - datetime.date.today()
        return delta.days

    @property
    def is_overdue(self):
        r = self.days_remaining
        return r is not None and r < 0

    def __repr__(self):
        return f'<PartShortageRequest {self.formatted_id} status={self.status}>'

    def to_dict(self):
        import datetime
        total_days = 1
        if self.deadline and self.created_at:
            delta = (self.deadline - self.created_at.date()) if isinstance(self.created_at, datetime.datetime) else (self.deadline - self.created_at)
            total_days = max(delta.days, 1)

        return {
            "id": self.id,
            "formatted_id": self.formatted_id,
            "inventory_item_id": self.inventory_item_id,
            "inventory_item": self.inventory_item.to_dict() if self.inventory_item else None,
            "shortage_quantity": self.shortage_quantity,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "days_remaining": self.days_remaining,
            "total_days": total_days,
            "per_day": round(self.shortage_quantity / total_days, 2) if total_days > 0 else self.shortage_quantity,
            "is_overdue": self.is_overdue,
            "status": self.status,
            "deo_id": self.deo_id,
            "deo_name": self.deo.name if self.deo else None,
            "sap_stock": self.sap_stock,
            "opening_stock": self.opening_stock,
            "todays_stock": self.todays_stock,
            "deo_notes": self.deo_notes,
            "deo_filled_at": self.deo_filled_at.isoformat() if self.deo_filled_at else None,
            "admin_approved_at": self.admin_approved_at.isoformat() if self.admin_approved_at else None,
            "admin_notes": self.admin_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "supervisor_id": self.supervisor_id,
            "supervisor_name": self.supervisor.name if self.supervisor else None,
            "line_id": self.line_id,
            "line_name": self.production_line.name if self.production_line else None,
            "machine_id": self.machine_id,
            "machine_name": self.machine.name if self.machine else None,
            "master_machine": next((m.machine for m in [PartMachineMapping.query.filter_by(sap_part_number=self.inventory_item.sap_part_number).first()] if m), None) if self.inventory_item else None,
            "sub_machines": [{"id": m.id, "name": m.name, "parent_id": m.parent_id} for m in self.assigned_machines],
            "rejection_reason": next((e.rejection_reason for e in sorted(self.daily_entries, key=lambda x: x.id, reverse=True) if e.rejection_reason), None)
        }

# ----------------------------- ShortageDailyEntry -----------------------------
class ShortageDailyEntry(db.Model):
    """
    Daily entry by DEO for a specifically assigned shortage request.
    This tracks day-to-day progress toward fulfilling the shortage gap.
    """
    __tablename__ = 'shortage_daily_entries'

    id = db.Column(db.Integer, primary_key=True)
    shortage_request_id = db.Column(db.Integer, db.ForeignKey('part_shortage_requests.id', ondelete='CASCADE'), nullable=False, index=True)
    deo_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    date = db.Column(db.Date, nullable=False, default=db.func.current_date())
    
    # Production values for the day
    sap_stock = db.Column(db.Float, default=0.0)
    opening_stock = db.Column(db.Float, default=0.0)
    todays_stock = db.Column(db.Float, default=0.0)
    
    notes = db.Column(db.Text, nullable=True)
    
    # Verification workflow
    status = db.Column(db.String(30), default='PENDING_SUPERVISOR') # PENDING_SUPERVISOR | VERIFIED | REJECTED
    rejection_reason = db.Column(db.Text, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=db.func.now())

    # Relationships
    shortage_request = db.relationship('PartShortageRequest', back_populates='daily_entries')
    deo = db.relationship('User', foreign_keys=[deo_id])

    def to_dict(self):
        return {
            "id": self.id,
            "shortage_request_id": self.shortage_request_id,
            "deo_id": self.deo_id,
            "deo_name": self.deo.name if self.deo else None,
            "date": self.date.isoformat() if self.date else None,
            "sap_stock": self.sap_stock,
            "opening_stock": self.opening_stock,
            "todays_stock": self.todays_stock,
            "notes": self.notes,
            "status": self.status,
            "rejection_reason": self.rejection_reason,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ----------------------------- RMCheckRequest -----------------------------
class RMCheckRequest(db.Model):
    """
    Created by PPC Planner when they verify and edit RM (raw material) data
    for a specific part in a demand. Sent one-by-one to Store Keeper.
    RM edits are stored here — never directly in MasterData.
    """
    __tablename__ = 'rm_check_requests'

    id = db.Column(db.Integer, primary_key=True)
    formatted_id = db.Column(db.String(50), unique=True, index=True)  # e.g. RMR-001

    # Links
    inventory_item_id = db.Column(db.Integer, db.ForeignKey('inventory_items.id', ondelete='CASCADE'), nullable=False, index=True)
    demand_id = db.Column(db.Integer, db.ForeignKey('demands.id', ondelete='CASCADE'), nullable=True, index=True)
    ppc_planner_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    store_keeper_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)

    # RM data filled by PPC Planner (snapshot — not modifying MasterData)
    rm_thk_mm = db.Column(db.String(100))
    sheet_width = db.Column(db.String(100))
    sheet_length = db.Column(db.String(100))
    no_of_comp_per_sheet = db.Column(db.String(100))
    rm_size = db.Column(db.String(100))
    rm_grade = db.Column(db.String(100))
    act_rm_sizes = db.Column(db.String(100))
    ppc_notes = db.Column(db.Text, nullable=True)

    # Workflow status
    # PENDING | SUBMITTED | ACCEPTED | REJECTED
    status = db.Column(db.String(30), default='PENDING', index=True)

    # Store Keeper response
    sk_notes = db.Column(db.Text, nullable=True)
    sk_actioned_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)

    submitted_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.now())

    # Relationships
    inventory_item = db.relationship('InventoryItem', back_populates='rm_check_requests')
    demand = db.relationship('Demand', backref='rm_check_requests')
    ppc_planner = db.relationship('User', foreign_keys=[ppc_planner_id])
    store_keeper = db.relationship('User', foreign_keys=[store_keeper_id])

    def __repr__(self):
        return f'<RMCheckRequest {self.formatted_id} status={self.status}>'

    def to_dict(self):
        return {
            "id": self.id,
            "formatted_id": self.formatted_id,
            "inventory_item_id": self.inventory_item_id,
            "inventory_item": self.inventory_item.to_dict() if self.inventory_item else None,
            "demand_id": self.demand_id,
            "demand_formatted_id": self.demand.formatted_id if self.demand else None,
            "ppc_planner_id": self.ppc_planner_id,
            "ppc_planner_name": self.ppc_planner.name if self.ppc_planner else None,
            "store_keeper_id": self.store_keeper_id,
            "rm_thk_mm": self.rm_thk_mm,
            "sheet_width": self.sheet_width,
            "sheet_length": self.sheet_length,
            "no_of_comp_per_sheet": self.no_of_comp_per_sheet,
            "rm_size": self.rm_size,
            "rm_grade": self.rm_grade,
            "act_rm_sizes": self.act_rm_sizes,
            "ppc_notes": self.ppc_notes,
            "status": self.status,
            "sk_notes": self.sk_notes,
            "sk_actioned_at": self.sk_actioned_at.isoformat() if self.sk_actioned_at else None,
            "rejection_reason": self.rejection_reason,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ----------------------------- DispatchRecord -----------------------------
class DispatchRecord(db.Model):
    """
    Created by Store Keeper when dispatching completed production to client.
    Verified dispatch record with full traceability.
    """
    __tablename__ = 'dispatch_records'

    id = db.Column(db.Integer, primary_key=True)
    formatted_id = db.Column(db.String(50), unique=True, index=True)  # e.g. DSP-001

    # Links
    demand_id = db.Column(db.Integer, db.ForeignKey('demands.id', ondelete='SET NULL'), nullable=True, index=True)
    inventory_item_id = db.Column(db.Integer, db.ForeignKey('inventory_items.id', ondelete='SET NULL'), nullable=True, index=True)
    store_keeper_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)

    # Dispatch details
    dispatch_date = db.Column(db.Date, nullable=False, default=db.func.current_date())
    quantity_dispatched = db.Column(db.Float, default=0.0)
    vehicle_count = db.Column(db.Integer, default=0)
    client_name = db.Column(db.String(255))
    challan_number = db.Column(db.String(100), nullable=True)   # Document/challan reference
    dispatch_notes = db.Column(db.Text, nullable=True)

    # Logistics details (filled by Store Keeper)
    vehicle_name = db.Column(db.String(100), nullable=True)
    vehicle_number = db.Column(db.String(50), nullable=True)
    driver_name = db.Column(db.String(100), nullable=True)
    driver_contact = db.Column(db.String(50), nullable=True)
    transporter_name = db.Column(db.String(150), nullable=True)

    # Verification
    status = db.Column(db.String(30), default='DISPATCHED')  # DISPATCHED | VERIFIED | RETURNED
    verified_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=db.func.now())

    # Relationships
    demand = db.relationship('Demand', backref='dispatch_records')
    inventory_item = db.relationship('InventoryItem', backref='dispatch_records')
    store_keeper = db.relationship('User', foreign_keys=[store_keeper_id])

    def __repr__(self):
        return f'<DispatchRecord {self.formatted_id} qty={self.quantity_dispatched}>'

    def to_dict(self):
        return {
            "id": self.id,
            "formatted_id": self.formatted_id,
            "demand_id": self.demand_id,
            "demand_formatted_id": self.demand.formatted_id if self.demand else None,
            "inventory_item_id": self.inventory_item_id,
            "store_keeper_id": self.store_keeper_id,
            "store_keeper_name": self.store_keeper.name if self.store_keeper else None,
            "dispatch_date": self.dispatch_date.isoformat() if self.dispatch_date else None,
            "quantity_dispatched": self.quantity_dispatched,
            "vehicle_count": self.vehicle_count,
            "client_name": self.client_name,
            "challan_number": self.challan_number,
            "dispatch_notes": self.dispatch_notes,
            "vehicle_name": self.vehicle_name,
            "vehicle_number": self.vehicle_number,
            "driver_name": self.driver_name,
            "driver_contact": self.driver_contact,
            "transporter_name": self.transporter_name,
            "status": self.status,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ----------------------------- MachineProductionEntry -----------------------------
class MachineProductionEntry(db.Model):
    """
    DEO fills this daily — per machine, per shift, per part.
    Tracks parts produced AND machine runtime separately.
    On save: InventoryItem.produced_qty is auto-incremented (cumulative).

    Shift Schedule:
      Shift 1: 06:00 - 15:00
      Shift 2: 15:00 - 23:00
      Shift 3: 23:00 - 06:00 (next day)
    Shift is auto-detected from DEO login time.
    """
    __tablename__ = 'machine_production_entries'

    id = db.Column(db.Integer, primary_key=True)

    # Links
    deo_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    inventory_item_id = db.Column(db.Integer, db.ForeignKey('inventory_items.id', ondelete='SET NULL'), nullable=True, index=True)
    adhoc_part_id = db.Column(db.Integer, db.ForeignKey('deo_adhoc_parts.id', ondelete='SET NULL'), nullable=True, index=True)
    demand_id = db.Column(db.Integer, db.ForeignKey('demands.id', ondelete='SET NULL'), nullable=True, index=True)
    machine_id = db.Column(db.Integer, db.ForeignKey('production_lines.id', ondelete='SET NULL'), nullable=True, index=True)

    # Entry data
    date = db.Column(db.Date, nullable=False, default=db.func.current_date(), index=True)
    shift = db.Column(db.String(20), nullable=False)    # 'Shift 1' | 'Shift 2' | 'Shift 3'
    shift_start = db.Column(db.String(10))              # e.g. "06:00"
    shift_end = db.Column(db.String(10))                # e.g. "15:00"

    sap_part_number = db.Column(db.String(255), index=True)
    parts_produced = db.Column(db.Float, default=0.0)   # Qty produced this entry
    machine_runtime_mins = db.Column(db.Float, default=0.0)  # Runtime in minutes (separate from qty)
    deo_notes = db.Column(db.Text, nullable=True)

    # Verification
    status = db.Column(db.String(30), default='PENDING')  # PENDING | VERIFIED | REJECTED
    supervisor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    supervisor_notes = db.Column(db.Text, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=db.func.now())

    # Relationships
    deo = db.relationship('User', foreign_keys=[deo_id], backref='machine_entries')
    supervisor = db.relationship('User', foreign_keys=[supervisor_id], backref='supervised_machine_entries')
    inventory_item = db.relationship('InventoryItem', backref='machine_entries')
    adhoc_part = db.relationship('DeoAdHocPart', backref='machine_entries')
    demand = db.relationship('Demand', backref='machine_entries')
    machine = db.relationship('ProductionLine', foreign_keys=[machine_id])

    @staticmethod
    def detect_shift(login_time=None):
        """
        Auto-detect shift from login time (or current time if not provided).
        Shift 1: 06:00 - 14:59
        Shift 2: 15:00 - 22:59
        Shift 3: 23:00 - 05:59
        """
        import datetime
        t = login_time or datetime.datetime.now().time()
        if isinstance(t, datetime.datetime):
            t = t.time()
        hour = t.hour
        if 6 <= hour < 15:
            return 'Shift 1', '06:00', '15:00'
        elif 15 <= hour < 23:
            return 'Shift 2', '15:00', '23:00'
        else:
            return 'Shift 3', '23:00', '06:00'

    def apply_to_inventory(self):
        """
        After saving, increment produced_qty on linked InventoryItem.
        Also re-evaluates item status.
        """
        if not self.inventory_item_id or not self.parts_produced:
            return
        item = InventoryItem.query.get(self.inventory_item_id)
        if not item:
            return
        item.produced_qty = (item.produced_qty or 0.0) + self.parts_produced
        item.sync_current_stock()
        # Auto-update status
        if item.produced_qty >= item.demand_quantity:
            item.status = 'PRODUCTION_DONE'
            
            # Complete shortages and vacate occupied machines
            psrs = PartShortageRequest.query.filter_by(inventory_item_id=item.id).all()
            for psr in psrs:
                if psr.status != 'COMPLETED':
                    psr.status = 'COMPLETED'
                    psr.assigned_machines = []  # Vacate machines
                    
        else:
            item.status = 'IN_PRODUCTION'
        db.session.flush()
        # Check if whole demand is done
        if item.demand_id:
            Demand.check_and_update_status(item.demand_id)

    def __repr__(self):
        return f'<MachineProductionEntry {self.date} {self.shift} qty={self.parts_produced}>'

    def to_dict(self):
        return {
            "id": self.id,
            "deo_id": self.deo_id,
            "deo_name": self.deo.name if self.deo else None,
            "inventory_item_id": self.inventory_item_id,
            "demand_id": self.demand_id,
            "demand_formatted_id": self.demand.formatted_id if self.demand else None,
            "machine_id": self.machine_id,
            "machine_name": self.machine.parent.name if self.machine and self.machine.parent else (self.machine.name if self.machine else None),
            "sub_machine_name": self.machine.name if self.machine and self.machine.parent else None,
            "date": self.date.isoformat() if self.date else None,
            "shift": self.shift,
            "shift_start": self.shift_start,
            "shift_end": self.shift_end,
            "sap_part_number": self.sap_part_number,
            "parts_produced": self.parts_produced,
            "adhoc_part_id": self.adhoc_part_id,
            "is_adhoc": self.adhoc_part_id is not None,
            "machine_runtime_mins": self.machine_runtime_mins,
            "deo_notes": self.deo_notes,
            "status": self.status,
            "supervisor_id": self.supervisor_id,
            "supervisor_name": self.supervisor.name if self.supervisor else None,
            "supervisor_notes": self.supervisor_notes,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "rejection_reason": self.rejection_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ----------------------------- DeoAdHocPart -----------------------------
class DeoAdHocPart(db.Model):
    """
    Stored parts entered manually by DEO that are NOT found in master InventoryItem.
    """
    __tablename__ = 'deo_adhoc_parts'
    id = db.Column(db.Integer, primary_key=True)
    sap_part_number = db.Column(db.String(255), unique=True, index=True)
    description = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "sap_part_number": self.sap_part_number,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ----------------------------- Notification -----------------------------
class Notification(db.Model):
    """
    In-app bell notifications for all roles.
    Supervisor gets notified when SK accepts RM.
    Store Keeper gets notified when production is done.
    """
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)

    # Target
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    role = db.Column(db.String(50), nullable=True, index=True)  # Optional: broadcast to role

    # Content
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), default='INFO')
    # Types: INFO | RM_ACCEPTED | PRODUCTION_DONE | DISPATCH_READY | RM_REJECTED

    # Links (optional context)
    demand_id = db.Column(db.Integer, db.ForeignKey('demands.id', ondelete='SET NULL'), nullable=True)
    rm_request_id = db.Column(db.Integer, db.ForeignKey('rm_check_requests.id', ondelete='SET NULL'), nullable=True)
    dispatch_id = db.Column(db.Integer, db.ForeignKey('dispatch_records.id', ondelete='SET NULL'), nullable=True)
    shortage_request_id = db.Column(db.Integer, db.ForeignKey('part_shortage_requests.id', ondelete='SET NULL'), nullable=True)

    # Read state
    is_read = db.Column(db.Boolean, default=False, index=True)
    read_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=db.func.now(), index=True)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='notifications')
    demand = db.relationship('Demand', backref='notifications')

    @staticmethod
    def send(user_id, title, message, notification_type='INFO', demand_id=None, rm_request_id=None, dispatch_id=None, shortage_request_id=None):
        """Helper to quickly create and commit a notification."""
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            demand_id=demand_id,
            rm_request_id=rm_request_id,
            dispatch_id=dispatch_id,
            shortage_request_id=shortage_request_id,
        )
        db.session.add(notif)
        return notif

    def __repr__(self):
        return f'<Notification {self.notification_type} -> user={self.user_id} read={self.is_read}>'

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "demand_id": self.demand_id,
            "rm_request_id": self.rm_request_id,
            "dispatch_id": self.dispatch_id,
            "shortage_request_id": self.shortage_request_id,
            "is_read": self.is_read,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
