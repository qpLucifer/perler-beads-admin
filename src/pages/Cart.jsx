import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Popconfirm, Empty } from 'antd';
import { DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import { getCartList, clearCart, deleteCartItem } from '@/api';

const CartManagement = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // 加载购物车数据
  const loadCart = async () => {
    setLoading(true);
    try {
      const res = await getCartList();
      if (res.success) {
        setCartItems(res.data.cartItems || []);
      }
    } catch (error) {
      console.error('加载购物车失败:', error);
      message.error('加载购物车失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  // 删除购物车项目
  const handleDelete = async (id) => {
    try {
      const res = await deleteCartItem(id);
      if (res.success) {
        message.success('删除成功');
        loadCart();
      }
    } catch {
      message.error('删除失败');
    }
  };

  // 清空购物车
  const handleClear = async () => {
    try {
      const res = await clearCart();
      if (res.success) {
        message.success('购物车已清空');
        loadCart();
      }
    } catch {
      message.error('清空失败');
    }
  };

  // 获取商品类型标签
  const getTypeTag = (type) => {
    const colorMap = {
      artwork: 'blue',
      product: 'green'
    };
    const textMap = {
      artwork: '定制作品',
      product: '商品'
    };
    return <Tag color={colorMap[type]}>{textMap[type]}</Tag>;
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => getTypeTag(type)
    },
    {
      title: '名称',
      key: 'name',
      width: 200,
      render: (_, record) => record.artwork?.name || record.product?.name || '-'
    },
    {
      title: '描述',
      key: 'description',
      width: 250,
      render: (_, record) => {
        if (record.type === 'artwork') {
          return `${record.artwork?.width || 32}x${record.artwork?.height || 32} 拼豆作品`;
        }
        return record.product?.description || '-';
      }
    },
    {
      title: '价格',
      key: 'price',
      width: 100,
      render: (_, record) => {
        const price = record.type === 'artwork' 
          ? record.artwork?.price || 23.00 
          : record.product?.price || 0;
        return `¥${price.toFixed(2)}`;
      }
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80
    },
    {
      title: '用户',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 80
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date) => date ? new Date(date).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="确定要删除吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card
      title="🛒 购物车管理"
      extra={
        <Space>
          <Button onClick={loadCart}>刷新</Button>
          <Popconfirm
            title="确定要清空所有购物车吗？"
            onConfirm={handleClear}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<ClearOutlined />}>
              清空购物车
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      {cartItems.length === 0 ? (
        <Empty description="购物车为空" />
      ) : (
        <Table
          columns={columns}
          dataSource={cartItems}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`
          }}
        />
      )}
    </Card>
  );
};

export default CartManagement;
