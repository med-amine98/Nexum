from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, to_json, struct
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, LongType

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

# Spark session
spark = SparkSession.builder \
    .appName("NexumFraudDetection") \
    .config("spark.master", "spark://spark-master:7077") \
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0") \
    .getOrCreate()

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
df_enriched = df.withColumn("risk_score", 
    when(col("amount") > 50000, 0.85)
    .when(col("amount") > 10000, 0.4)
    .otherwise(0.05)
)

# Écrire vers Kafka (topic enrichi)
query = df_enriched.select(to_json(struct("*")).alias("value")) \
    .writeStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "kafka:9092") \
    .option("topic", "transactions-enriched") \
    .option("checkpointLocation", "/tmp/spark-checkpoint") \
    .start()

query.awaitTermination()
