import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Typography, Spin, message, Button, Space, Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { dashboardAPI } from '../api';
import { getAppliedFilterCorrectionStats, clearAppliedFilterCorrectionStats } from '../utils/appliedFilters';
import dayjs from 'dayjs';

const { Title } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [filterCorrectionStats, setFilterCorrectionStats] = useState(getAppliedFilterCorrectionStats());
  const [statsRange, setStatsRange] = useState('all');

  const routeByLabel = {
    用户列表: '/users',
    商品列表: '/products',
    订单列表: '/orders',
    作品列表: '/artworks',
    模板列表: '/templates'
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRecentOrders(),
      ]);
      setStats(statsRes.data);
      setRecentOrders(ordersRes.data.orders || []);
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
      let errorMsg = '获取数据失败';
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMsg = '请求超时，请检查网络连接';
      } else if (error.response?.status === 401) {
        errorMsg = '登录已过期，请重新登录';
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const refreshCorrectionStats = () => {
    setFilterCorrectionStats(getAppliedFilterCorrectionStats());
  };

  const handleClearCorrectionStats = () => {
    clearAppliedFilterCorrectionStats();
    refreshCorrectionStats();
    message.success('筛选修正统计已清空');
  };

  const handleExportCorrectionStats = () => {
    try {
      const data = getAppliedFilterCorrectionStats();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `filter-correction-stats-${dayjs().format('YYYYMMDD-HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      message.success('统计导出成功');
    } catch {
      message.error('统计导出失败');
    }
  };

  const sortedLabelStats = Object.entries(filterCorrectionStats?.byLabel || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const sortedFieldStats = Object.entries(filterCorrectionStats?.byField || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  const jumpToEventSource = (evt) => {
    const target = routeByLabel[evt?.label];
    if (!target) {
      message.warning('未找到对应列表页');
      return;
    }
    const firstField = evt?.fields?.[0];
    const params = new URLSearchParams();
    params.set('page', '1');
    if (firstField) {
      params.set('focus_field', firstField);
      // Preseed common fields to shorten troubleshooting path.
      if (firstField === 'sort_by') params.set('sort_by', 'created_at');
      if (firstField === 'sort_order') params.set('sort_order', 'desc');
      if (firstField === 'status' && target.includes('/orders')) params.set('status', 'pending');
    }
    navigate(`${target}?${params.toString()}`);
  };

  const buildRangeStats = () => {
    if (statsRange === 'all') {
      return {
        total: filterCorrectionStats?.total || 0,
        byLabel: sortedLabelStats,
        byField: sortedFieldStats,
        events: (Array.isArray(filterCorrectionStats?.events) ? [...filterCorrectionStats.events] : [])
          .sort((a, b) => dayjs(b.ts).valueOf() - dayjs(a.ts).valueOf())
      };
    }
    const since = dayjs().subtract(7, 'day');
    const events = Array.isArray(filterCorrectionStats?.events) ? filterCorrectionStats.events : [];
    const scoped = events.filter((e) => dayjs(e.ts).isAfter(since));
    const labelMap = {};
    const fieldMap = {};
    scoped.forEach((e) => {
      labelMap[e.label] = Number(labelMap[e.label] || 0) + 1;
      (e.fields || []).forEach((f) => {
        fieldMap[f] = Number(fieldMap[f] || 0) + 1;
      });
    });
    return {
      total: scoped.length,
      byLabel: Object.entries(labelMap).sort((a, b) => Number(b[1]) - Number(a[1])),
      byField: Object.entries(fieldMap).sort((a, b) => Number(b[1]) - Number(a[1])),
      events: scoped.sort((a, b) => dayjs(b.ts).valueOf() - dayjs(a.ts).valueOf())
    };
  };

  const rangeStats = buildRangeStats();

  const formatMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0.00';
    return n.toFixed(2);
  };

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
    },
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
      render: (value) => `¥${formatMoney(value)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          pending: { text: '待支付', color: '#faad14' },
          paid: { text: '已支付', color: '#52c41a' },
          shipped: { text: '已发货', color: '#1890ff' },
          completed: { text: '已完成', color: '#8c8c8c' },
          cancelled: { text: '已取消', color: '#ff4d4f' },
        };
        const { text, color } = statusMap[status] || { text: status, color: '#666' };
        return <span style={{ color }}>{text}</span>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>📊 仪表盘</Title>
      
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats?.users?.total || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              今日新增：{stats?.users?.today || 0} | 活跃：{stats?.users?.active || 0}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={stats?.orders?.total || 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              待支付：{stats?.orders?.pending || 0} | 已支付：{stats?.orders?.paid || 0}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总收入"
              value={stats?.orders?.revenue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              商品总数：{stats?.products?.total || 0} | 库存：{stats?.products?.total_stock || 0}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="作品总数"
              value={stats?.artworks?.total || 0}
              prefix={<PictureOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              缺货商品：{stats?.products?.out_of_stock || 0}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 最近订单 */}
      <Card title="📦 最近订单">
        <Table
          columns={orderColumns}
          dataSource={recentOrders}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      <Card
        title="🧭 筛选修正统计"
        style={{ marginTop: 16 }}
        extra={(
          <Space>
            <Segmented
              size="small"
              value={statsRange}
              onChange={setStatsRange}
              options={[
                { label: '全部', value: 'all' },
                { label: '近7天', value: '7d' }
              ]}
            />
            <Button size="small" onClick={refreshCorrectionStats}>刷新</Button>
            <Button size="small" onClick={handleExportCorrectionStats}>导出 JSON</Button>
            <Button size="small" danger onClick={handleClearCorrectionStats}>清空统计</Button>
          </Space>
        )}
      >
        <div style={{ marginBottom: 8 }}>
          总修正次数：<b>{rangeStats.total || 0}</b>
          <span style={{ marginLeft: 12, color: '#666' }}>
            最后更新：{filterCorrectionStats?.updated_at ? dayjs(filterCorrectionStats.updated_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </span>
        </div>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card size="small" title="按页面">
              {rangeStats.byLabel.length === 0 ? (
                <div style={{ color: '#999' }}>暂无数据</div>
              ) : (
                rangeStats.byLabel.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{k}</span><b>{v}</b>
                  </div>
                ))
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="按字段">
              {rangeStats.byField.length === 0 ? (
                <div style={{ color: '#999' }}>暂无数据</div>
              ) : (
                rangeStats.byField.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{k}</span><b>{v}</b>
                  </div>
                ))
              )}
            </Card>
          </Col>
        </Row>
        <Card size="small" title="最近修正事件（最新10条）" style={{ marginTop: 12 }}>
          {(rangeStats.events || []).length === 0 ? (
            <div style={{ color: '#999' }}>暂无数据</div>
          ) : (
            (rangeStats.events || []).slice(0, 10).map((evt, idx) => (
              <div
                key={`${evt.ts}-${idx}`}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}
              >
                <span style={{ flex: 1 }}>
                  {evt.label}：{(evt.fields || []).join('、') || '-'}
                </span>
                <Space size={8}>
                  <span style={{ color: '#666' }}>{dayjs(evt.ts).format('YYYY-MM-DD HH:mm:ss')}</span>
                  <Button size="small" type="link" onClick={() => jumpToEventSource(evt)}>前往</Button>
                </Space>
              </div>
            ))
          )}
        </Card>
      </Card>
    </div>
  );
};

export default Dashboard;
