import React, { useState, useEffect, useRef } from 'react';
import {
  Table, Card, Button, Input, Select, Space, Modal, Typography, Tag, Descriptions, message, Divider, Empty, Alert,
} from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { ordersAPI } from '../api';
import { useListState } from '../hooks/useListState';
import { applyAndNotifyAppliedFilters } from '../utils/appliedFilters';
import { scrollAndFlashFocusField } from '../utils/focusField';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const Orders = () => {
  const [searchParams] = useSearchParams();
  const focusField = searchParams.get('focus_field') || '';
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const { pagination, setPagination, filters, setFilters, setFilter, resetListState } = useListState({
    storageKey: 'admin:list:orders',
    defaults: { keyword: '', status: '', sort_by: 'created_at', sort_order: 'desc' }
  });
  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const appliedFilterNoticeRef = useRef('');

  useEffect(() => {
    fetchOrders();
  }, [pagination.current, pagination.pageSize, filters.keyword, filters.status, filters.sort_by, filters.sort_order]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusField) return;
    return scrollAndFlashFocusField(focusField);
  }, [focusField]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        keyword: filters.keyword || undefined,
        status: filters.status || undefined,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
      };
      const res = await ordersAPI.getList(params);
      const requestedFilters = {
        keyword: filters.keyword,
        status: filters.status,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order
      };
      applyAndNotifyAppliedFilters({
        label: '订单列表',
        requested: requestedFilters,
        applied: res.data?.applied_filters,
        lastSignatureRef: appliedFilterNoticeRef,
        setFilters,
        setKeywordInput
      });
      setOrders(res.data.orders);
      setPagination({
        current: res.data.pagination.page,
        pageSize: res.data.pagination.limit,
        total: res.data.pagination.total,
      });
    } catch (error) {
      console.error('获取订单列表失败:', error);
      message.error('获取订单列表失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setFilter('keyword', keywordInput.trim());
  };

  const handleResetFilters = () => {
    setKeywordInput('');
    resetListState();
  };

  const handleViewDetail = async (orderId) => {
    try {
      const res = await ordersAPI.getById(orderId);
      setSelectedOrder(res.data.order);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('获取订单详情失败:', error);
      message.error('获取订单详情失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await ordersAPI.updateStatus(orderId, { status });
      message.success('订单状态更新成功');
      fetchOrders();
    } catch (error) {
      console.error('更新订单状态失败:', error);
      message.error('更新失败：' + (error.response?.data?.message || error.message));
    }
  };

  const statusMap = {
    pending: { text: '待支付', color: '#faad14' },
    paid: { text: '已支付', color: '#52c41a' },
    shipped: { text: '已发货', color: '#1890ff' },
    completed: { text: '已完成', color: '#8c8c8c' },
    cancelled: { text: '已取消', color: '#ff4d4f' },
  };

  const columns = [
    { title: '订单号', dataIndex: 'order_no', key: 'order_no', ellipsis: true },
    {
      title: '用户',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (text, record) => text || record.username,
    },
    {
      title: '金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (value) => `¥${Number(value || 0).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const { text, color } = statusMap[status] || { text: status, color: '#666' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_, record) => (
        <Space size="small" direction="vertical" style={{ width: '100%' }}>
          <Space size="small" wrap>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)}>
              查看详情
            </Button>
          </Space>
          <Space size="small" wrap>
            {record.status === 'pending' && (
              <Button type="link" size="small" onClick={() => handleUpdateStatus(record.id, 'paid')}>
                标记为已支付
              </Button>
            )}
            {record.status === 'paid' && (
              <Button type="link" size="small" onClick={() => handleUpdateStatus(record.id, 'shipped')}>
                标记为已发货
              </Button>
            )}
            {record.status === 'shipped' && (
              <Button type="link" size="small" onClick={() => handleUpdateStatus(record.id, 'completed')}>
                标记为已完成
              </Button>
            )}
          </Space>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>📦 订单管理</Title>

      <Card style={{ marginBottom: 16 }}>
        {focusField && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`当前关注字段：${focusField}`}
          />
        )}
        <Space>
          <Input
            placeholder="搜索订单号/用户名"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
            data-focus-field="keyword"
          />
          <Select
            placeholder="状态筛选"
            value={filters.status}
            onChange={(v) => setFilter('status', v || '')}
            style={{ width: 120 }}
            allowClear
            status={focusField === 'status' ? 'warning' : undefined}
            data-focus-field="status"
          >
            <Option value="pending">待支付</Option>
            <Option value="paid">已支付</Option>
            <Option value="shipped">已发货</Option>
            <Option value="completed">已完成</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
          <Select
            value={filters.sort_by}
            onChange={(v) => setFilter('sort_by', v)}
            style={{ width: 140 }}
            status={focusField === 'sort_by' ? 'warning' : undefined}
            data-focus-field="sort_by"
          >
            <Option value="created_at">按创建时间</Option>
            <Option value="total_amount">按金额</Option>
            <Option value="id">按ID</Option>
          </Select>
          <Select
            value={filters.sort_order}
            onChange={(v) => setFilter('sort_order', v)}
            style={{ width: 110 }}
            status={focusField === 'sort_order' ? 'warning' : undefined}
            data-focus-field="sort_order"
          >
            <Option value="desc">降序</Option>
            <Option value="asc">升序</Option>
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
          <Button onClick={handleResetFilters}>重置筛选</Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="暂无订单数据" /> }}
          pagination={{
            ...pagination,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
            },
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="订单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Descriptions title="订单信息" bordered column={2} size="small">
              <Descriptions.Item label="订单号">{selectedOrder.order_no}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[selectedOrder.status]?.color}>
                  {statusMap[selectedOrder.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="用户">{selectedOrder.nickname || selectedOrder.username}</Descriptions.Item>
              <Descriptions.Item label="手机号">{selectedOrder.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="订单金额">¥{Number(selectedOrder.total_amount || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="支付金额">¥{Number(selectedOrder.paid_amount || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs(selectedOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{selectedOrder.remark || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider>收货地址</Divider>
            {selectedOrder.address ? (
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="收件人">{selectedOrder.address.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="手机号">{selectedOrder.address.phone || '-'}</Descriptions.Item>
                <Descriptions.Item label="地址" span={2}>
                  {selectedOrder.address.province || ''}{selectedOrder.address.city || ''}{selectedOrder.address.district || ''}
                  {selectedOrder.address.detail || ''}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <p>无收货地址</p>
            )}

            <Divider>商品清单</Divider>
            <Table
              dataSource={selectedOrder.items || []}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: '商品',
                  key: 'name',
                  render: (_, record) => record.product_name || record.artwork_title || record.name || '商品'
                },
                {
                  title: '单价',
                  dataIndex: 'price',
                  key: 'price',
                  render: (value) => `¥${Number(value || 0).toFixed(2)}`,
                },
                { title: '数量', dataIndex: 'quantity', key: 'quantity' },
                {
                  title: '小计',
                  key: 'subtotal',
                  render: (_, record) => `¥${(Number(record.price || 0) * Number(record.quantity || 1)).toFixed(2)}`,
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
