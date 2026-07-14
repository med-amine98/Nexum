# app/ml/graph_risk.py
import numpy as np
from typing import List, Dict, Tuple
import networkx as nx
from sklearn.cluster import SpectralClustering
import logging

logger = logging.getLogger(__name__)

class SupplyChainGraphAnalyzer:
    """
    Analyse des graphes de la chaîne d'approvisionnement
    Détection des nœuds critiques et des dépendances
    """
    
    def __init__(self):
        self.graph = nx.DiGraph()
        self.node_risks = {}
        
    def build_graph(self, suppliers: List[Dict], transactions: List[Dict]):
        """
        Construit le graphe à partir des données fournisseurs
        """
        # Ajout des nœuds
        for supplier in suppliers:
            self.graph.add_node(
                supplier['id'],
                name=supplier['name'],
                type=supplier.get('type', 'supplier'),
                risk_score=supplier.get('risk_score', 0)
            )
            self.node_risks[supplier['id']] = supplier.get('risk_score', 0)
        
        # Ajout des arêtes (dépendances)
        for trans in transactions:
            self.graph.add_edge(
                trans['supplier_id'],
                trans['customer_id'],
                weight=trans.get('amount', 1.0),
                frequency=trans.get('frequency', 1)
            )
        
        logger.info(f"Graphe construit: {self.graph.number_of_nodes()} nœuds, {self.graph.number_of_edges()} arêtes")
    
    def detect_critical_nodes(self) -> List[Dict]:
        """
        Détecte les nœuds critiques avec PageRank personnalisé
        """
        # Calcul du PageRank
        pagerank = nx.pagerank(self.graph, weight='weight')
        
        # Calcul de la centralité d'intermédiarité
        betweenness = nx.betweenness_centrality(self.graph, weight='weight')
        
        # Calcul de la centralité de proximité
        closeness = nx.closeness_centrality(self.graph)
        
        critical_nodes = []
        for node in self.graph.nodes():
            risk = self.node_risks.get(node, 0)
            
            # Score composite
            composite_score = (
                pagerank[node] * 0.4 +
                betweenness[node] * 0.3 +
                closeness[node] * 0.2 +
                (risk / 100) * 0.1
            )
            
            is_critical = composite_score > np.percentile(list(pagerank.values()), 80)
            
            critical_nodes.append({
                'id': node,
                'name': self.graph.nodes[node].get('name', f'Node_{node}'),
                'pagerank': pagerank[node],
                'betweenness': betweenness[node],
                'closeness': closeness[node],
                'risk_score': risk,
                'composite_score': composite_score,
                'is_critical': is_critical,
                'dependencies': list(self.graph.successors(node)),
                'dependents': list(self.graph.predecessors(node))
            })
        
        return sorted(critical_nodes, key=lambda x: x['composite_score'], reverse=True)
    
    def detect_communities(self) -> List[Dict]:
        """
        Détecte les communautés dans le graphe (clusters de fournisseurs)
        """
        if self.graph.number_of_nodes() < 2:
            return []
        
        # Matrice d'adjacence — symétriser pour le clustering spectral
        adj_matrix = nx.adjacency_matrix(self.graph).todense()
        adj_matrix = (adj_matrix + adj_matrix.T) / 2.0  # Symétrisé pour affinity='precomputed'
        
        # Clustering spectral
        n_clusters = min(5, self.graph.number_of_nodes())
        clustering = SpectralClustering(n_clusters=n_clusters, affinity='precomputed')
        labels = clustering.fit_predict(adj_matrix)
        
        communities = {}
        for node, label in zip(self.graph.nodes(), labels):
            if label not in communities:
                communities[label] = []
            communities[label].append(node)
        
        result = []
        for label, nodes in communities.items():
            # Calcul du risque moyen de la communauté
            avg_risk = np.mean([self.node_risks.get(n, 0) for n in nodes])
            
            result.append({
                'community_id': label,
                'size': len(nodes),
                'nodes': nodes,
                'avg_risk': avg_risk,
                'critical_nodes': [n for n in nodes if self.node_risks.get(n, 0) > 70]
            })
        
        return result
    
    def find_critical_paths(self) -> List[Dict]:
        """
        Trouve les chemins critiques dans le graphe
        """
        critical_paths = []
        
        # Trouver les sources et puits
        sources = [n for n in self.graph.nodes() if self.graph.in_degree(n) == 0]
        sinks = [n for n in self.graph.nodes() if self.graph.out_degree(n) == 0]
        
        for source in sources:
            for sink in sinks:
                try:
                    paths = list(nx.all_simple_paths(self.graph, source, sink, cutoff=5))
                    for path in paths:
                        path_risk = np.mean([self.node_risks.get(n, 0) for n in path])
                        if path_risk > 50:
                            critical_paths.append({
                                'path': path,
                                'length': len(path),
                                'risk': path_risk,
                                'nodes': [self.graph.nodes[n].get('name', str(n)) for n in path]
                            })
                except nx.NetworkXNoPath:
                    continue
        
        return sorted(critical_paths, key=lambda x: x['risk'], reverse=True)[:10]