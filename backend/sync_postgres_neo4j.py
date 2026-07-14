import psycopg2
import time

logger.info("Synchronisation PostgreSQL -> Neo4j")
logger.info("-" * 40)

# Connexion PostgreSQL
try:
    pg_conn = psycopg2.connect(
        host="postgres",
        database="erp",
        user="odoo",
        password="odoo"
    )
    pg_cur = pg_conn.cursor()
    logger.info("✅ Connecte a PostgreSQL")
except Exception as e:
    logger.error(f"❌ Erreur PostgreSQL: {e}")
    exit(1)

# Connexion Neo4j
try:
    from neo4j import GraphDatabase
    neo4j_driver = GraphDatabase.driver(
        "bolt://neo4j:7687",
        auth=("neo4j", "neo4j123")
    )
    logger.info("✅ Connecte a Neo4j")
except Exception as e:
    logger.error(f"❌ Erreur Neo4j: {e}")
    logger.info("Installation de neo4j...")
    import subprocess
    subprocess.run(["pip", "install", "neo4j"])
    from neo4j import GraphDatabase
    neo4j_driver = GraphDatabase.driver(
        "bolt://neo4j:7687",
        auth=("neo4j", "neo4j123")
    )
    logger.info("✅ Neo4j installe et connecte")

def sync_data():
    with neo4j_driver.session() as session:
        # Départements
        pg_cur.execute("SELECT id, name, code FROM departments")
        depts = pg_cur.fetchall()
        for id, name, code in depts:
            session.run(
                "MERGE (d:Department {id: $id}) SET d.name = $name, d.code = $code",
                id=id, name=name, code=code
            )
        logger.info(f"✅ {len(depts)} departements synchronises")
        
        # Employés
        pg_cur.execute("SELECT id, first_name, last_name, email, department_id FROM employees")
        emps = pg_cur.fetchall()
        for id, first, last, email, dept_id in emps:
            session.run(
                "MERGE (e:Employee {id: $id}) SET e.firstName = $first, e.lastName = $last, e.email = $email",
                id=id, first=first, last=last, email=email
            )
            if dept_id:
                session.run(
                    "MATCH (e:Employee {id: $eid}), (d:Department {id: $did}) MERGE (e)-[:WORKS_IN]->(d)",
                    eid=id, did=dept_id
                )
        logger.info(f"✅ {len(emps)} employes synchronises")
        
        # Compter les noeuds
        result = session.run("MATCH (n) RETURN count(n) as total")
        total = result.single()["total"]
        logger.info(f"✅ Total noeuds dans Neo4j: {total}")

sync_data()
pg_conn.close()
neo4j_driver.close()
logger.info("🎉 Synchronisation terminee!")
