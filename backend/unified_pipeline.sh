#!/bin/bash
echo "PIPELINE UNIFIE ERP"
echo "==================="

# 1. PostgreSQL vers MinIO
echo "[1/3] Export PostgreSQL vers MinIO..."
docker exec neura-postgres psql -U odoo -d erp -c "\\COPY employees TO '/tmp/employees.csv' CSV HEADER"
docker exec neura-postgres psql -U odoo -d erp -c "\\COPY departments TO '/tmp/departments.csv' CSV HEADER"
docker exec neura-postgres psql -U odoo -d erp -c "\\COPY leaves TO '/tmp/leaves.csv' CSV HEADER"

docker cp neura-postgres:/tmp/employees.csv /tmp/employees.csv
docker cp neura-postgres:/tmp/departments.csv /tmp/departments.csv
docker cp neura-postgres:/tmp/leaves.csv /tmp/leaves.csv

docker cp /tmp/employees.csv neura-minio:/tmp/
docker cp /tmp/departments.csv neura-minio:/tmp/
docker cp /tmp/leaves.csv neura-minio:/tmp/

docker exec neura-minio mc cp /tmp/employees.csv myminio/erp-postgres/
docker exec neura-minio mc cp /tmp/departments.csv myminio/erp-postgres/
docker exec neura-minio mc cp /tmp/leaves.csv myminio/erp-postgres/

echo "OK"

# 2. Spark
echo "[2/3] Analyse Spark..."
docker exec neura-spark-jupyter python /home/jovyan/work/spark_minio_test.py

# 3. Neo4j
echo "[3/3] Synchronisation Neo4j..."
docker exec neura-backend python /app/sync_postgres_neo4j.py

echo "Pipeline termine!"
