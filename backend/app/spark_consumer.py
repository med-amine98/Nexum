# /app/spark_consumer.py - Version Spark
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, to_json, struct, when
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, LongType
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Schéma des transactions
schema = StructType([
    StructField("transaction_id", StringType()),
    StructField("timestamp", StringType()),
    StructField("amount", DoubleType()),
    StructField("currency", StringType()),
    StructField("sender", StructType([
        StructField("id", StringType()),
        StructField("name", StringType()),
        StructField("history", StringType())
    ])),
    StructField("recipient", StructType([
        StructField("id", StringType()),
        StructField("name", StringType()),
        StructField("risk_level", StringType())
    ])),
    StructField("metadata", StructType([
        StructField("risk_score", DoubleType()),
        StructField("test_type", StringType())
    ]))
])

# Connexion Spark
spark = SparkSession.builder \
    .appName("NexumSparkToNeo4j") \
    .config("spark.master", "spark://spark-master:7077") \
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,org.neo4j:neo4j-connector-apache-spark_2.12:5.0.0") \
    .config("spark.neo4j.bolt.url", "bolt://neo4j:7687") \
    .config("spark.neo4j.bolt.user", "neo4j") \
    .config("spark.neo4j.bolt.password", "neo4j123") \
    .getOrCreate()

logger.info("⚡ Spark connecté")

# Lire depuis Kafka
df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "kafka:9092") \
    .option("subscribe", "transactions") \
    .option("startingOffsets", "latest") \
    .load() \
    .select(from_json(col("value").cast("string"), schema).alias("data")) \
    .select("data.*")

# Enrichir avec Spark (calculs)
df_enriched = df.withColumn("fraud_score",
    when(col("amount") > 50000, 0.85)
    .when(col("amount") > 10000, 0.4)
    .otherwise(0.05)
).withColumn("risk_level",
    when(col("amount") > 50000, "high")
    .when(col("amount") > 10000, "medium")
    .otherwise("low")
).withColumn("processed_at", col("timestamp"))

logger.info("📊 Données enrichies")

# Écrire vers Neo4j via Spark
def write_to_neo4j(batch_df, batch_id):
    """Écrit un batch dans Neo4j"""
    try:
        batch_df.write \
            .format("org.neo4j.spark.DataSource") \
            .mode("Append") \
            .option("query", """
                MERGE (s:Account {id: event.sender.id})
                ON CREATE SET s.name = event.sender.name
                MERGE (r:Account {id: event.recipient.id})
                ON CREATE SET r.name = event.recipient.name
                CREATE (s)-[:SENT {
                    amount: event.amount,
                    transaction_id: event.transaction_id,
                    timestamp: datetime(event.timestamp),
                    fraud_score: event.fraud_score,
                    risk_level: event.risk_level
                }]->(r)
            """) \
            .save()
        logger.info(f"✅ Batch {batch_id} écrit dans Neo4j")
    except Exception as e:
        logger.error(f"❌ Erreur écriture Neo4j: {e}")

# Écrire vers Neo4j
query = df_enriched.writeStream \
    .foreachBatch(write_to_neo4j) \
    .outputMode("append") \
    .start()

# Afficher dans la console pour debug
console_query = df_enriched.writeStream \
    .outputMode("append") \
    .format("console") \
    .option("truncate", False) \
    .start()

logger.info("✅ Spark Streaming démarré")

query.awaitTermination()