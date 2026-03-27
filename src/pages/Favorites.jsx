import React, { useState, useEffect } from 'react';
import { Card, List, Button, Space, Typography, Image, Empty, Tag, message, Spin } from 'antd';
import { HeartFilled, ShoppingCartOutlined, EyeOutlined } from '@ant-design/icons';
import { favoritesAPI, cartAPI } from '../api';

const { Title, Text } = Typography;

const Favorites = () => {
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  useEffect(() => {
    fetchFavorites();
  }, [pagination.current]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const res = await favoritesAPI.getList({ page: pagination.current });
      setFavorites(res.data.favorites);
      setPagination({
        current: res.data.pagination.page,
        pageSize: res.data.pagination.limit,
        total: res.data.pagination.total,
      });
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      message.error('获取收藏列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (productId) => {
    try {
      await favoritesAPI.remove(productId);
      message.success('已取消收藏');
      fetchFavorites();
    } catch (error) {
      console.error('取消收藏失败:', error);
      message.error('取消收藏失败');
    }
  };

  const handleAddToCart = async (productId) => {
    try {
      await cartAPI.addItem(productId, 1);
      message.success('已添加到购物车');
    } catch (error) {
      console.error('添加到购物车失败:', error);
      message.error('添加到购物车失败');
    }
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>❤️ 我的收藏</Title>

      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : favorites.length === 0 ? (
          <Empty description="暂无收藏商品" />
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4, xxl: 4 }}
            dataSource={favorites}
            pagination={{
              ...pagination,
              onChange: (page) => {
                setPagination({ ...pagination, current: page });
              },
              showTotal: (total) => `共 ${total} 个`,
            }}
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  cover={
                    <Image
                      src={item.image_url || 'https://via.placeholder.com/200'}
                      height={160}
                      style={{ objectFit: 'cover' }}
                      fallback="https://via.placeholder.com/200"
                    />
                  }
                  actions={[
                    <ShoppingCartOutlined 
                      key="cart" 
                      onClick={() => handleAddToCart(item.product_id)}
                      title="加入购物车"
                    />,
                    <EyeOutlined 
                      key="view" 
                      onClick={() => window.open(`/products/${item.product_id}`, '_blank')}
                      title="查看详情"
                    />,
                    <HeartFilled 
                      key="favorite" 
                      style={{ color: '#ff4d4f' }}
                      onClick={() => handleRemoveFavorite(item.product_id)}
                      title="取消收藏"
                    />,
                  ]}
                >
                  <Card.Meta
                    title={
                      <Text ellipsis style={{ maxWidth: 200 }}>
                        {item.name}
                      </Text>
                    }
                    description={
                      <div>
                        <Text type="danger" strong>¥{item.price}</Text>
                        <div style={{ marginTop: 8 }}>
                          <Tag color={item.stock > 0 ? 'green' : 'red'}>
                            {item.stock > 0 ? `库存${item.stock}` : '缺货'}
                          </Tag>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default Favorites;
