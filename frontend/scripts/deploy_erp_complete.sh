# scripts/deploy_erp_complete.sh
#!/bin/bash
echo "🚀 Déploiement de l'ERP complet..."

# 1. MongoDB
echo "📦 Déploiement MongoDB..."
docker run -d \
  --name neura-mongodb \
  --network mon-erp_neura-network \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7

# 2. MinIO
echo "📦 Déploiement MinIO..."
docker run -d \
  --name neura-minio \
  --network mon-erp_neura-network \
  -p 9000:9000 \
  -p 9010:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio:latest \
  server /data --console-address ":9001"

# 3. SonarQube
echo "📊 Déploiement SonarQube..."
docker run -d \
  --name neura-sonarqube \
  --network mon-erp_neura-network \
  -p 9002:9000 \
  -e SONAR_JDBC_URL=jdbc:postgresql://neura-postgres:5432/sonar \
  -e SONAR_JDBC_USERNAME=sonar \
  -e SONAR_JDBC_PASSWORD=sonar \
  sonarqube:latest

# 4. Prometheus
echo "📊 Déploiement Prometheus..."
docker run -d \
  --name neura-prometheus \
  --network mon-erp_neura-network \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus:latest

# 5. Grafana
echo "📊 Déploiement Grafana..."
docker run -d \
  --name neura-grafana \
  --network mon-erp_neura-network \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana:latest

# 6. Initialisation MongoDB
echo "📦 Initialisation MongoDB..."
docker exec -i neura-mongodb mongosh -u admin -p password < scripts/mongodb_sector_init.js

# 7. Initialisation MinIO
echo "📦 Initialisation MinIO..."
docker run --rm \
  --network mon-erp_neura-network \
  -v $(pwd)/scripts:/scripts \
  minio/mc \
  /scripts/minio_sectors_init.sh

echo "✅ ERP complet déployé!"
echo ""
echo "📊 Accès aux services :"
echo "  SonarQube: http://localhost:9002 (admin/admin)"
echo "  Grafana: http://localhost:3000 (admin/admin)"
echo "  MongoDB: mongodb://admin:password@localhost:27017"
echo "  MinIO: http://localhost:9000 (minioadmin/minioadmin)"