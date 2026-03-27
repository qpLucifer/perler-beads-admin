import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  Space,
  Typography,
  Image,
  Popconfirm,
  Button,
  message,
  Tag,
  Alert,
} from 'antd';
import { SearchOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { artworksAPI } from '../api';
import { useListState } from '../hooks/useListState';
import { applyAndNotifyAppliedFilters } from '../utils/appliedFilters';
import { scrollAndFlashFocusField } from '../utils/focusField';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const Artworks = () => {
  const [searchParams] = useSearchParams();
  const focusField = searchParams.get('focus_field') || '';
  const [loading, setLoading] = useState(false);
  const [artworks, setArtworks] = useState([]);
  const { pagination, setPagination, filters, setFilters, setFilter, resetListState } = useListState({
    storageKey: 'admin:list:artworks',
    defaults: { keyword: '', sort_by: 'created_at', sort_order: 'desc' }
  });
  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const appliedFilterNoticeRef = useRef('');

  useEffect(() => {
    fetchArtworks();
  }, [pagination.current, pagination.pageSize, filters.keyword, filters.sort_by, filters.sort_order]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusField) return;
    return scrollAndFlashFocusField(focusField);
  }, [focusField]);

  const fetchArtworks = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        keyword: filters.keyword || undefined,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
      };
      const res = await artworksAPI.getList(params);
      const requestedFilters = {
        keyword: filters.keyword,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order
      };
      applyAndNotifyAppliedFilters({
        label: '作品列表',
        requested: requestedFilters,
        applied: res.data?.applied_filters,
        lastSignatureRef: appliedFilterNoticeRef,
        setFilters,
        setKeywordInput
      });
      setArtworks(res.data.artworks);
      setPagination({
        current: res.data.pagination.page,
        pageSize: res.data.pagination.limit,
        total: res.data.pagination.total,
      });
    } catch (error) {
      console.error('获取作品列表失败:', error);
      message.error('获取作品列表失败');
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

  const handleDelete = async (artworkId) => {
    try {
      await artworksAPI.delete(artworkId);
      message.success('删除成功');
      fetchArtworks();
    } catch (error) {
      console.error('删除作品失败:', error);
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
      title: '作品预览',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 100,
      render: (url) => (
        <Image
          src={url || 'https://via.placeholder.com/80'}
          width={60}
          height={60}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          fallback="https://via.placeholder.com/80"
        />
      ),
    },
    {
      title: '作品名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '作者',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (text, record) => text || record.username,
    },
    {
      title: '尺寸',
      key: 'size',
      render: (_, record) => `${record.width || 32} x ${record.height || 32}`,
    },
    {
      title: '拼豆数',
      dataIndex: 'bead_count',
      key: 'bead_count',
    },
    {
      title: '是否公开',
      dataIndex: 'is_public',
      key: 'is_public',
      render: (isPublic) => (
        <Tag color={isPublic === 1 ? 'green' : 'default'}>
          {isPublic === 1 ? '公开' : '私有'}
        </Tag>
      ),
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
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => window.open(record.image_url, '_blank')}
          >
            查看
          </Button>
          <Popconfirm
            title="确定删除该作品吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>🎨 作品管理</Title>

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
            placeholder="搜索作品名称/用户名"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            data-focus-field="keyword"
          />
          <Select
            value={filters.sort_by}
            onChange={(v) => setFilter('sort_by', v)}
            style={{ width: 140 }}
            status={focusField === 'sort_by' ? 'warning' : undefined}
            data-focus-field="sort_by"
          >
            <Option value="created_at">按创建时间</Option>
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
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleResetFilters}>重置筛选</Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={artworks}
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

export default Artworks;
