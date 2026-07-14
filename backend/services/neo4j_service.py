from neo4j import GraphDatabase
import os

class Neo4jService:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            os.getenv('NEO4J_URI', 'bolt://neo4j:7687'),
            auth=(
                os.getenv('NEO4J_USER', 'neo4j'),
                os.getenv('NEO4J_PASSWORD', 'password')
            )
        )
    
    def close(self):
        self.driver.close()
    
    def create_client_node(self, client_id, name, email):
        with self.driver.session() as session:
            session.run(
                "MERGE (c:Client {id: $id}) "
                "SET c.name = $name, c.email = $email",
                id=client_id, name=name, email=email
            )
    
    def create_product_node(self, product_id, name, price):
        with self.driver.session() as session:
            session.run(
                "MERGE (p:Product {id: $id}) "
                "SET p.name = $name, p.price = $price",
                id=product_id, name=name, price=price
            )
    
    def create_order_relationship(self, client_id, order_id, amount):
        with self.driver.session() as session:
            session.run(
                "MATCH (c:Client {id: $client_id}) "
                "MERGE (o:Order {id: $order_id, amount: $amount}) "
                "MERGE (c)-[:PLACED]->(o)",
                client_id=client_id, order_id=order_id, amount=amount
            )
    
    def get_client_risk_score(self, client_id):
        with self.driver.session() as session:
            result = session.run(
                "MATCH (c:Client {id: $id}) "
                "OPTIONAL MATCH (c)-[:PLACED]->(o:Order) "
                "RETURN c.id as id, c.name as name, "
                "count(o) as order_count, avg(o.amount) as avg_amount",
                id=client_id
            )
            return result.single()