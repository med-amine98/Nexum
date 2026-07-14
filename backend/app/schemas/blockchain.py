from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# Transaction schemas
class TransactionBase(BaseModel):
    tx_hash: str
    from_address: str
    to_address: str
    value: float
    tx_type: str = "transfer"
    status: str = "pending"

class TransactionCreate(TransactionBase):
    block_id: int
    gas_price: Optional[int] = 0
    gas_used: Optional[int] = 0
    nonce: Optional[int] = 0
    data: Optional[str] = None

class TransactionInDB(TransactionBase):
    id: int
    block_id: int
    gas_price: int
    gas_used: int
    nonce: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Block schemas
class BlockBase(BaseModel):
    block_number: int
    block_hash: str
    previous_hash: str
    merkle_root: str
    transaction_count: int
    size_bytes: int
    validator: str

class BlockCreate(BlockBase):
    gas_used: Optional[int] = 0
    gas_limit: Optional[int] = 0
    difficulty: Optional[int] = 1
    nonce: Optional[str] = None
    extra_data: Optional[str] = None

class BlockInDB(BlockBase):
    id: int
    timestamp: datetime
    gas_used: int
    gas_limit: int
    difficulty: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class BlockWithTransactions(BlockInDB):
    transactions: List[TransactionInDB] = []

# Node schemas
class NodeBase(BaseModel):
    node_id: str
    node_address: str
    node_type: str = "validator"
    node_name: Optional[str] = None
    is_active: bool = True
    stake_amount: float = 0.0

class NodeCreate(NodeBase):
    ip_address: Optional[str] = None
    version: Optional[str] = "1.0.0"

class NodeInDB(NodeBase):
    id: int
    last_seen: datetime
    blocks_validated: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Contract schemas
class ContractBase(BaseModel):
    contract_address: str
    contract_name: str
    contract_type: str = "erc20"
    creator: str
    creation_tx: str
    creation_block: int

class ContractCreate(ContractBase):
    bytecode: Optional[str] = None
    abi: Optional[str] = None
    source_code: Optional[str] = None

class ContractInDB(ContractBase):
    id: int
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Stats schemas
class BlockchainStats(BaseModel):
    total_blocks: int
    total_transactions: int
    total_nodes: int
    active_nodes: int
    avg_block_time: float
    total_value: float
    consensus: str = "PoA"
    network_hashrate: Optional[int] = None
    pending_transactions: int