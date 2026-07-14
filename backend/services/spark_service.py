from pyspark.sql import SparkSession
import os

class SparkService:
    def __init__(self):
        self.spark = SparkSession.builder \
            .appName("NeuraDecide") \
            .master(os.getenv('SPARK_MASTER', 'spark://spark-master:7077')) \
            .config("spark.sql.adaptive.enabled", "true") \
            .getOrCreate()
    
    def stop(self):
        self.spark.stop()
    
    def analyze_sales(self, sales_df):
        """Analyze sales data with Spark"""
        df = self.spark.createDataFrame(sales_df)
        
        # Top products
        top_products = df.groupBy("product_id") \
            .sum("quantity") \
            .orderBy("sum(quantity)", ascending=False) \
            .limit(10)
        
        # Monthly sales
        from pyspark.sql.functions import month, year, sum
        monthly_sales = df.groupBy(
            year("date").alias("year"),
            month("date").alias("month")
        ).agg(sum("amount").alias("total"))
        
        return {
            'top_products': top_products.toPandas().to_dict('records'),
            'monthly_sales': monthly_sales.toPandas().to_dict('records')
        }
    
    def fraud_detection(self, transactions_df):
        """Detect anomalies using Spark ML"""
        from pyspark.ml.feature import VectorAssembler
        from pyspark.ml.clustering import KMeans
        
        df = self.spark.createDataFrame(transactions_df)
        
        # Prepare features
        assembler = VectorAssembler(
            inputCols=["amount", "hour", "day_of_week"],
            outputCol="features"
        )
        data = assembler.transform(df)
        
        # K-means clustering for anomaly detection
        kmeans = KMeans().setK(3).setSeed(1)
        model = kmeans.fit(data)
        predictions = model.transform(data)
        
        return predictions.select("id", "prediction").toPandas()