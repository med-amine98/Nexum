import React from 'react';
import { Card, Table, Button, Space, Tag } from 'antd';

const SaleOrders = () => {
  const columns = [
    { title: 'N° Commande', dataIndex: 'name', key: 'name' },
    { title: 'Client', dataIndex: 'client', key: 'client' },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Montant', dataIndex: 'amount', key: 'amount' },
    { 
      title: 'Statut', 
      dataIndex: 'status', 
      key: 'status',
      render: status => <Tag color="blue">{status}</Tag>
    },
  ];

  return (
    <Card title="Toutes les commandes">
      <Table columns={columns} dataSource={[]} />
    </Card>
  );
};

export default SaleOrders;