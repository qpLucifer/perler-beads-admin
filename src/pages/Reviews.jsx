import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Input,
  Space,
  Typography,
  Rate,
  Tag,
  Button,
  Popconfirm,
  message,
  Avatar,
} from 'antd';
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { reviewsAPI } from '../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Reviews = () => {
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [pagination.current, pagination.pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
      };
      const res = await reviewsAPI.getList(params);
      setReviews(res.data.reviews);
      setPagination({
        current: res.data.pagination.page,
        pageSize: res.data.pagination.limit,
        total: res.data.pagination.total,
      });
    } catch (error) {
      console.error('获取评价列表失败:', error);
      message.error('获取评价列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId) => {
    try {
      await reviewsAPI.delete(reviewId);
      message.success('删除成功');
      fetchReviews();
    } catch (error) {
      console.error('删除评价失败:', error);
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar>{record.nickname?.[0] || record.username?.[0] || 'U'}</Avatar>
          <Text>{record.nickname || record.username}</Text>
        </Space>
      ),
    },
    {
      title: '商品',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => <Rate disabled defaultValue={rating} />,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '评价时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="确定删除该评价吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>💬 评价管理</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="搜索商品名称/用户名"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => {
              setPagination({ ...pagination, current: 1 });
              fetchReviews();
            }}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          <Button 
            type="primary" 
            icon={<SearchOutlined />} 
            onClick={() => {
              setPagination({ ...pagination, current: 1 });
              fetchReviews();
            }}
          >
            搜索
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={reviews}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
            },
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default Reviews;
