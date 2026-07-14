# scripts/test_services.py
#!/usr/bin/env python3
"""
Script de test complet pour tous les services
"""

import sys
import json
import time
import socket
import requests
from datetime import datetime
import subprocess

# Couleurs pour le terminal
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'

def print_header(text):
    print(f"\n{Colors.CYAN}{'='*60}{Colors.RESET}")
    print(f"{Colors.PURPLE}{text}{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*60}{Colors.RESET}")

def test_http_service(name, url, expected_status=200):
    """Test un service HTTP"""
    print(f"Testing {name}...", end=" ")
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == expected_status:
            print(f"{Colors.GREEN}✅ OK{Colors.RESET}")
            return True
        else:
            print(f"{Colors.RED}❌ Status {response.status_code}{Colors.RESET}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"{Colors.RED}❌ Connection refused{Colors.RESET}")
        return False
    except requests.exceptions.Timeout:
        print(f"{Colors.RED}❌ Timeout{Colors.RESET}")
        return False
    except Exception as e:
        print(f"{Colors.RED}❌ Error: {e}{Colors.RESET}")
        return False

def test_mongodb():
    """Test la connexion MongoDB"""
    print("Testing MongoDB...", end=" ")
    try:
        # Utiliser pymongo si disponible
        try:
            from pymongo import MongoClient
            client = MongoClient('mongodb://admin:password@localhost:27017', serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            print(f"{Colors.GREEN}✅ OK{Colors.RESET}")
            return True
        except ImportError:
            # Fallback: tester le port
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex(('localhost', 27017))
            sock.close()
            if result == 0:
                print(f"{Colors.GREEN}✅ OK (port ouvert){Colors.RESET}")
                return True
            else:
                print(f"{Colors.RED}❌ Port fermé{Colors.RESET}")
                return False
    except Exception as e:
        print(f"{Colors.RED}❌ Error: {e}{Colors.RESET}")
        return False

def test_minio():
    """Test la connexion MinIO"""
    print("Testing MinIO...", end=" ")
    try:
        # Utiliser minio-py si disponible
        try:
            from minio import Minio
            client = Minio(
                'localhost:9000',
                access_key='minioadmin',
                secret_key='minioadmin',
                secure=False
            )
            client.list_buckets()
            print(f"{Colors.GREEN}✅ OK{Colors.RESET}")
            return True
        except ImportError:
            # Fallback: tester le port
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex(('localhost', 9000))
            sock.close()
            if result == 0:
                print(f"{Colors.GREEN}✅ OK (port ouvert){Colors.RESET}")
                return True
            else:
                print(f"{Colors.RED}❌ Port fermé{Colors.RESET}")
                return False
    except Exception as e:
        print(f"{Colors.RED}❌ Error: {e}{Colors.RESET}")
        return False

def test_sonarqube():
    """Test SonarQube"""
    return test_http_service("SonarQube", "http://localhost:9002/api/system/status", 200)

def test_grafana():
    """Test Grafana"""
    return test_http_service("Grafana", "http://localhost:3000/api/health", 200)

def test_prometheus():
    """Test Prometheus"""
    return test_http_service("Prometheus", "http://localhost:9090/-/healthy", 200)

def test_kafka():
    """Test Kafka"""
    print("Testing Kafka...", end=" ")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('localhost', 9092))
        sock.close()
        if result == 0:
            print(f"{Colors.GREEN}✅ OK (port ouvert){Colors.RESET}")
            return True
        else:
            print(f"{Colors.RED}❌ Port fermé{Colors.RESET}")
            return False
    except Exception as e:
        print(f"{Colors.RED}❌ Error: {e}{Colors.RESET}")
        return False

def test_neo4j():
    """Test Neo4j"""
    print("Testing Neo4j...", end=" ")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('localhost', 7687))
        sock.close()
        if result == 0:
            print(f"{Colors.GREEN}✅ OK (port ouvert){Colors.RESET}")
            return True
        else:
            print(f"{Colors.RED}❌ Port fermé{Colors.RESET}")
            return False
    except Exception as e:
        print(f"{Colors.RED}❌ Error: {e}{Colors.RESET}")
        return False

def test_backend():
    """Test le backend API"""
    return test_http_service("Backend API", "http://localhost:8000/health", 200)

def test_pipeline():
    """Test le pipeline Neo4j"""
    print("Testing Pipeline (Neo4j transactions)...", end=" ")
    try:
        response = requests.get("http://localhost:8000/api/v1/neo4j/transactions?limit=1", timeout=5)
        if response.status_code == 200:
            data = response.json()
            total = data.get('total', 0)
            print(f"{Colors.GREEN}✅ OK ({total} transactions){Colors.RESET}")
            return True
        else:
            print(f"{Colors.RED}❌ Status {response.status_code}{Colors.RESET}")
            return False
    except Exception as e:
        print(f"{Colors.RED}❌ Error: {e}{Colors.RESET}")
        return False

def test_xai():
    """Test Explainable AI"""
    print("Testing XAI Service...", end=" ")
    try:
        response = requests.get("http://localhost:8000/api/v1/xai/health", timeout=5)
        if response.status_code == 200:
            print(f"{Colors.GREEN}✅ OK{Colors.RESET}")
            return True
        else:
            print(f"{Colors.RED}❌ Status {response.status_code}{Colors.RESET}")
            return False
    except Exception as e:
        print(f"{Colors.RED}❌ Error: {e}{Colors.RESET}")
        return False

def run_all_tests():
    """Exécute tous les tests"""
    print_header("🧪 TEST DE TOUS LES SERVICES")
    
    results = {}
    
    # Services de stockage
    print_header("📦 SERVICES DE STOCKAGE")
    results['mongodb'] = test_mongodb()
    results['minio'] = test_minio()
    
    # Services de monitoring
    print_header("📊 SERVICES DE MONITORING")
    results['sonarqube'] = test_sonarqube()
    results['grafana'] = test_grafana()
    results['prometheus'] = test_prometheus()
    
    # Services de pipeline
    print_header("🔧 SERVICES DE PIPELINE")
    results['kafka'] = test_kafka()
    results['neo4j'] = test_neo4j()
    results['backend'] = test_backend()
    results['pipeline'] = test_pipeline()
    results['xai'] = test_xai()
    
    # Résumé
    print_header("📊 RÉSUMÉ")
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    print(f"Total: {total} tests")
    print(f"{Colors.GREEN}✅ Passés: {passed}{Colors.RESET}")
    print(f"{Colors.RED}❌ Échoués: {failed}{Colors.RESET}")
    
    if failed > 0:
        print(f"\n{Colors.YELLOW}⚠️ Services échoués:{Colors.RESET}")
        for name, status in results.items():
            if not status:
                print(f"  - {name}")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)