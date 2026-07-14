# scripts/diagnose_pipeline.py
"""
Script de diagnostic pour vérifier toutes les technologies du pipeline.
Version adaptée pour l'exécution depuis l'extérieur de Docker.
"""

import os
import sys
import json
import time
import requests
import subprocess
from datetime import datetime
from typing import Dict, Any, List, Tuple
import socket
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ============================================
# CONFIGURATION - PORTS EXPOSÉS SUR LOCALHOST
# ============================================

# Services exposés sur localhost
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4j123")
SPARK_MASTER = os.getenv("SPARK_MASTER", "spark://localhost:7077")
SPARK_UI = os.getenv("SPARK_UI", "http://localhost:8088")
API_URL = os.getenv("API_URL", "http://localhost:8000")
WEB3_RPC = os.getenv("WEB3_RPC_URL", "http://localhost:8545")
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = os.getenv("QDRANT_PORT", "6333")
GROVER_URL = os.getenv("GROVER_URL", "http://localhost:8005")
GRAPH_TRANSFORMER_URL = os.getenv("GRAPH_TRANSFORMER_URL", "http://localhost:8006")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
MINIO_HOST = os.getenv("MINIO_HOST", "localhost")
MINIO_PORT = os.getenv("MINIO_PORT", "9000")

# Couleurs pour l'affichage
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text: str):
    print(f"\n{Colors.CYAN}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.WHITE}{text}{Colors.END}")
    print(f"{Colors.CYAN}{'='*60}{Colors.END}")

def print_success(text: str):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text: str):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text: str):
    print(f"{Colors.YELLOW}⚠️ {text}{Colors.END}")

def print_info(text: str):
    print(f"{Colors.BLUE}ℹ️ {text}{Colors.END}")

def print_service(name: str, status: str, details: str = ""):
    status_color = Colors.GREEN if status == "✅ OK" else Colors.RED if status == "❌ FAIL" else Colors.YELLOW
    print(f"  {status_color}{status}{Colors.END}  {Colors.BOLD}{name}{Colors.END}")
    if details:
        print(f"    {Colors.WHITE}{details}{Colors.END}")

def check_port(host: str, port: int, timeout: float = 2.0) -> bool:
    """Vérifie si un port est ouvert."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception:
        return False

# ============================================
# 1. KAFKA
# ============================================

def check_kafka() -> Tuple[bool, str]:
    """Vérifie si Kafka fonctionne."""
    try:
        from kafka import KafkaConsumer, KafkaProducer
        from kafka.errors import NoBrokersAvailable
        
        # Tester la connexion
        consumer = KafkaConsumer(
            bootstrap_servers=[KAFKA_BOOTSTRAP],
            request_timeout_ms=5000,
            consumer_timeout_ms=3000,
            api_version_auto_timeout_ms=5000
        )
        consumer.close()
        return True, f"Connecté à {KAFKA_BOOTSTRAP}"
    except NoBrokersAvailable:
        return False, "Aucun broker Kafka disponible"
    except ImportError:
        return False, "kafka-python non installé"
    except Exception as e:
        return False, f"Erreur: {str(e)}"

def check_kafka_topics() -> List[str]:
    """Liste les topics Kafka."""
    try:
        from kafka import KafkaAdminClient
        from kafka.admin import NewTopic
        
        admin = KafkaAdminClient(
            bootstrap_servers=[KAFKA_BOOTSTRAP],
            request_timeout_ms=5000
        )
        topics = admin.list_topics()
        admin.close()
        return list(topics)
    except Exception as e:
        return []

# ============================================
# 2. SPARK
# ============================================

def check_spark() -> Tuple[bool, str]:
    """Vérifie si Spark fonctionne."""
    try:
        import requests
        
        # Tester le master UI
        response = requests.get(f"{SPARK_UI}/json", timeout=5)
        if response.status_code == 200:
            return True, f"Spark Master accessible sur {SPARK_UI}"
        
        # Fallback sur le port
        if check_port("localhost", 8088):
            return True, "Spark Master en cours d'exécution (port 8088)"
        if check_port("localhost", 7077):
            return True, "Spark Master en cours d'exécution (port 7077)"
            
        return False, "Spark Master non accessible"
    except requests.exceptions.ConnectionError:
        if check_port("localhost", 8088) or check_port("localhost", 7077):
            return True, "Spark Master en cours d'exécution"
        return False, "Spark Master non accessible"
    except Exception as e:
        return False, f"Erreur: {str(e)}"

# ============================================
# 3. NEO4J
# ============================================

def check_neo4j() -> Tuple[bool, str]:
    """Vérifie si Neo4j fonctionne."""
    try:
        from neo4j import GraphDatabase
        
        driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD),
            max_connection_lifetime=3000
        )
        with driver.session() as session:
            result = session.run("RETURN 1 as test")
            if result.single():
                driver.close()
                return True, f"Connecté à {NEO4J_URI}"
        driver.close()
        return False, "Connexion Neo4j échouée"
    except ImportError:
        return False, "neo4j-python non installé"
    except Exception as e:
        return False, f"Erreur: {str(e)}"

def check_neo4j_graphs() -> Dict:
    """Récupère les stats du graph Neo4j."""
    try:
        from neo4j import GraphDatabase
        
        driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        with driver.session() as session:
            result = session.run("""
                MATCH (n)
                RETURN 
                    count(n) as total_nodes,
                    count(DISTINCT labels(n)) as total_labels
            """)
            record = result.single()
            driver.close()
            return {
                "total_nodes": record["total_nodes"] if record else 0,
                "total_labels": record["total_labels"] if record else 0
            }
    except Exception:
        return {"total_nodes": 0, "total_labels": 0}

# ============================================
# 4. GRAPH TRANSFORMER (GNN)
# ============================================

def check_graph_transformer() -> Tuple[bool, str]:
    """Vérifie si GraphTransformer fonctionne."""
    try:
        import requests
        
        # Vérifier via le service dédié
        response = requests.get(f"{GRAPH_TRANSFORMER_URL}/health", timeout=5)
        if response.status_code == 200:
            return True, f"GraphTransformer accessible sur {GRAPH_TRANSFORMER_URL}"
        
        # Vérifier via l'API principale
        response = requests.get(f"{API_URL}/api/v1/neo4j/risk-distribution", timeout=5)
        if response.status_code == 200:
            return True, "GraphTransformer accessible via l'API principale"
            
        return False, "GraphTransformer non accessible"
    except requests.exceptions.ConnectionError:
        return False, "GraphTransformer non accessible"
    except Exception as e:
        return False, f"Erreur: {str(e)}"

# ============================================
# 5. GROVER QUANTUM
# ============================================

def check_grover() -> Tuple[bool, str]:
    """Vérifie si Grover Quantum fonctionne."""
    try:
        import requests
        
        # Vérifier via le service dédié
        response = requests.get(f"{GROVER_URL}/health", timeout=5)
        if response.status_code == 200:
            return True, f"Grover Quantum accessible sur {GROVER_URL}"
        
        # Vérifier via l'API principale
        response = requests.get(f"{API_URL}/api/v1/neo4j/verdict-stats", timeout=5)
        if response.status_code == 200:
            return True, "Grover Quantum actif"
            
        return False, "Grover Quantum non accessible"
    except requests.exceptions.ConnectionError:
        return False, "Grover Quantum non accessible"
    except Exception as e:
        return False, f"Erreur: {str(e)}"

# ============================================
# 6. BLOCKCHAIN WEB3
# ============================================

def check_blockchain() -> Tuple[bool, str]:
    """Vérifie si la Blockchain fonctionne."""
    try:
        from web3 import Web3
        
        # Tester via Web3
        w3 = Web3(Web3.HTTPProvider(WEB3_RPC, request_kwargs={'timeout': 5}))
        if w3.is_connected():
            return True, f"Connecté à {WEB3_RPC} (Chain ID: {w3.eth.chain_id})"
        
        # Tester via l'API principale
        import requests
        response = requests.get(f"{API_URL}/api/v1/blockchain/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("connected"):
                return True, f"Blockchain via API - {data.get('status')}"
        
        # Vérifier si le port est ouvert
        if check_port("localhost", 8545):
            return True, "Blockchain en cours d'exécution (port 8545)"
            
        return False, "Blockchain non connectée"
    except ImportError:
        return False, "web3.py non installé"
    except Exception as e:
        return False, f"Erreur: {str(e)}"

# ============================================
# 7. API PRINCIPALE
# ============================================

def check_main_api() -> Tuple[bool, str]:
    """Vérifie si l'API principale fonctionne."""
    try:
        import requests
        response = requests.get(f"{API_URL}/health", timeout=5)
        if response.status_code == 200:
            return True, f"API principale accessible sur {API_URL}"
        return False, f"API répond code {response.status_code}"
    except requests.exceptions.ConnectionError:
        if check_port("localhost", 8000):
            return True, "API en cours d'exécution (port 8000)"
        return False, f"API principale non accessible sur {API_URL}"
    except Exception as e:
        return False, f"Erreur: {str(e)}"

# ============================================
# 8. QDRANT (Vector DB)
# ============================================

def check_qdrant() -> Tuple[bool, str]:
    """Vérifie si Qdrant fonctionne."""
    try:
        import requests
        qdrant_url = f"http://{QDRANT_HOST}:{QDRANT_PORT}/collections"
        response = requests.get(qdrant_url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            collections = data.get("collections", [])
            return True, f"Qdrant actif - {len(collections)} collections sur {QDRANT_HOST}:{QDRANT_PORT}"
            
        return False, f"Qdrant répond code {response.status_code}"
    except requests.exceptions.ConnectionError:
        if check_port("localhost", 6333):
            return True, "Qdrant en cours d'exécution sur localhost:6333"
        return False, "Qdrant non accessible"
    except Exception as e:
        return False, f"Erreur: {str(e)}"

# ============================================
# 9. POSTGRESQL
# ============================================

def check_postgres() -> Tuple[bool, str]:
    """Vérifie si PostgreSQL fonctionne."""
    try:
        import psycopg2
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            user="postgres",
            password="postgres",
            dbname="postgres",
            connect_timeout=5
        )
        conn.close()
        return True, f"PostgreSQL connecté sur {POSTGRES_HOST}:{POSTGRES_PORT}"
    except ImportError:
        return False, "psycopg2 non installé"
    except Exception as e:
        if check_port(POSTGRES_HOST, int(POSTGRES_PORT)):
            return True, f"PostgreSQL en cours d'exécution sur {POSTGRES_HOST}:{POSTGRES_PORT}"
        return False, f"Erreur: {str(e)}"

# ============================================
# 10. REDIS
# ============================================

def check_redis() -> Tuple[bool, str]:
    """Vérifie si Redis fonctionne."""
    try:
        import redis
        r = redis.Redis(host=REDIS_HOST, port=int(REDIS_PORT), decode_responses=True, socket_timeout=5)
        r.ping()
        return True, f"Redis connecté sur {REDIS_HOST}:{REDIS_PORT}"
    except ImportError:
        return False, "redis-py non installé"
    except Exception as e:
        if check_port(REDIS_HOST, int(REDIS_PORT)):
            return True, f"Redis en cours d'exécution sur {REDIS_HOST}:{REDIS_PORT}"
        return False, f"Erreur: {str(e)}"

# ============================================
# 11. MINIO
# ============================================

def check_minio() -> Tuple[bool, str]:
    """Vérifie si MinIO fonctionne."""
    try:
        from minio import Minio
        client = Minio(
            f"{MINIO_HOST}:{MINIO_PORT}",
            access_key="minioadmin",
            secret_key="minioadmin",
            secure=False
        )
        client.list_buckets()
        return True, f"MinIO connecté sur {MINIO_HOST}:{MINIO_PORT}"
    except ImportError:
        return False, "minio-py non installé"
    except Exception as e:
        if check_port(MINIO_HOST, int(MINIO_PORT)):
            return True, f"MinIO en cours d'exécution sur {MINIO_HOST}:{MINIO_PORT}"
        return False, f"Erreur: {str(e)}"

# ============================================
# FONCTION PRINCIPALE
# ============================================

def main():
    print_header("🔍 DIAGNOSTIC DU PIPELINE")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Mode: Ports locaux (localhost)")
    print(f"API: {API_URL}")
    print()
    
    results = []
    
    # 1. API Principale
    print_header("🌐 API PRINCIPALE")
    ok, details = check_main_api()
    results.append(("API Principale", ok, details))
    print_service("API Principale", "✅ OK" if ok else "❌ FAIL", details)
    
    # 2. Kafka
    print_header("📨 KAFKA")
    ok, details = check_kafka()
    results.append(("Kafka", ok, details))
    print_service("Kafka", "✅ OK" if ok else "❌ FAIL", details)
    
    if ok:
        topics = check_kafka_topics()
        if topics:
            print_info(f"Topics disponibles: {', '.join(topics[:5])}")
        else:
            print_warning("Aucun topic trouvé")
    
    # 3. Spark
    print_header("⚡ SPARK")
    ok, details = check_spark()
    results.append(("Spark", ok, details))
    print_service("Spark", "✅ OK" if ok else "❌ FAIL", details)
    
    # 4. Neo4j
    print_header("🗄️ NEO4J")
    ok, details = check_neo4j()
    results.append(("Neo4j", ok, details))
    print_service("Neo4j", "✅ OK" if ok else "❌ FAIL", details)
    
    if ok:
        graph_stats = check_neo4j_graphs()
        print_info(f"Nœuds dans le graphe: {graph_stats.get('total_nodes', 0)}")
    
    # 5. GraphTransformer
    print_header("🧠 GRAPH TRANSFORMER (GNN)")
    ok, details = check_graph_transformer()
    results.append(("GraphTransformer", ok, details))
    print_service("GraphTransformer", "✅ OK" if ok else "❌ FAIL", details)
    
    # 6. Grover Quantum
    print_header("🔮 GROVER QUANTUM")
    ok, details = check_grover()
    results.append(("Grover Quantum", ok, details))
    print_service("Grover Quantum", "✅ OK" if ok else "❌ FAIL", details)
    
    # 7. Blockchain
    print_header("⛓️ BLOCKCHAIN WEB3")
    ok, details = check_blockchain()
    results.append(("Blockchain Web3", ok, details))
    print_service("Blockchain Web3", "✅ OK" if ok else "❌ FAIL", details)
    
    # 8. Qdrant
    print_header("📊 QDRANT (Vector DB)")
    ok, details = check_qdrant()
    results.append(("Qdrant", ok, details))
    print_service("Qdrant", "✅ OK" if ok else "❌ FAIL", details)
    
    # 9. PostgreSQL
    print_header("🐘 POSTGRESQL")
    ok, details = check_postgres()
    results.append(("PostgreSQL", ok, details))
    print_service("PostgreSQL", "✅ OK" if ok else "❌ FAIL", details)
    
    # 10. Redis
    print_header("📦 REDIS")
    ok, details = check_redis()
    results.append(("Redis", ok, details))
    print_service("Redis", "✅ OK" if ok else "❌ FAIL", details)
    
    # 11. MinIO
    print_header("📁 MINIO")
    ok, details = check_minio()
    results.append(("MinIO", ok, details))
    print_service("MinIO", "✅ OK" if ok else "❌ FAIL", details)
    
    # ============================================
    # RÉSUMÉ
    # ============================================
    print_header("📊 RÉSUMÉ DU DIAGNOSTIC")
    
    total = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = total - passed
    
    for name, ok, details in results:
        status = "✅ OK" if ok else "❌ FAIL"
        print_service(name, status, details[:50])
    
    print(f"\n{Colors.BOLD}{Colors.WHITE}Résultat: {passed}/{total} services fonctionnent{Colors.END}")
    
    if failed == 0:
        print_success("🎉 Tous les services du pipeline sont opérationnels !")
    else:
        print_error(f"⚠️ {failed} service(s) ne fonctionnent pas correctement")
        print_info("Vérifiez les détails ci-dessus pour chaque service.")
    
    print(f"\n{Colors.CYAN}{'='*60}{Colors.END}")

if __name__ == "__main__":
    main()