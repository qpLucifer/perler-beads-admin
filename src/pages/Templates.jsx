import React, { useState, useEffect, useRef } from 'react';
import {
  Table, Card, Button, Input, Select, Space, Modal, Form, message, Popconfirm, Tag, Typography, InputNumber, Empty, Alert,
} from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { templatesAPI } from '../api';
import { useListState } from '../hooks/useListState';
import { applyAndNotifyAppliedFilters } from '../utils/appliedFilters';
import { scrollAndFlashFocusField } from '../utils/focusField';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const safeParseJson = (value) => {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
};

// 拼豆颜色映射（与小程序一致）
const BEAD_COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  red: '#FF0000',
  orange: '#FFA500',
  yellow: '#FFFF00',
  green: '#008000',
  blue: '#0000FF',
  purple: '#800080',
  pink: '#FFC0CB',
  brown: '#8B4513',
  gray: '#808080',
  cyan: '#00FFFF',
  darkblue: '#00008B',
  darkgreen: '#006400',
  gold: '#FFD700',
  silver: '#C0C0C0',
  transparent: '#E0E0E0',
  neonred: '#FF1493',
  neongreen: '#00FF7F',
  neonblue: '#1E90FF',
};

// 从 bead_data 渲染预览图
const BeadPreview = ({ beadData, width = 32, height = 32 }) => {
  const normalizeCells = () => {
    if (!beadData) return null;
    // New format: { cells: [{row,col,color}], width, height }
    if (beadData.cells && Array.isArray(beadData.cells)) {
      return beadData.cells;
    }
    // Compatible format: 2D canvas matrix from mini-program upload.
    if (Array.isArray(beadData) && Array.isArray(beadData[0])) {
      const cells = [];
      for (let r = 0; r < beadData.length; r++) {
        for (let c = 0; c < beadData[r].length; c++) {
          const v = beadData[r][c];
          if (v) {
            const color = typeof v === 'string' ? v : (v.color || v.hex || v.name || 'black');
            cells.push({ row: r, col: c, color });
          }
        }
      }
      return cells;
    }
    return null;
  };

  const cells = normalizeCells();
  if (!cells || cells.length === 0) {
    return <div style={{ width: 60, height: 60, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>无图案</div>;
  }
  const cellSize = 3; // 每个拼豆 3px

  return (
    <div style={{ 
      width: width * cellSize, 
      height: height * cellSize, 
      background: '#fff',
      border: '1px solid #e0e0e0',
      display: 'grid',
      gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
      gridTemplateRows: `repeat(${height}, ${cellSize}px)`,
    }}>
      {Array.from({ length: width * height }).map((_, index) => {
        const row = Math.floor(index / width);
        const col = index % width;
        const cell = cells.find(c => c.row === row && c.col === col);
        const color = cell ? BEAD_COLORS[cell.color] || cell.color : 'transparent';
        return (
          <div
            key={index}
            style={{
              width: cellSize,
              height: cellSize,
              background: color,
              border: '1px solid rgba(0,0,0,0.1)',
              boxSizing: 'border-box',
            }}
          />
        );
      })}
    </div>
  );
};

const Templates = () => {
  const [searchParams] = useSearchParams();
  const focusField = searchParams.get('focus_field') || '';
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const { pagination, setPagination, filters, setFilters, setFilter, resetListState } = useListState({
    storageKey: 'admin:list:templates',
    defaults: {
      keyword: '',
      is_official: undefined,
      category: '',
      difficulty: '',
      sort_by: 'created_at',
      sort_order: 'desc'
    },
    numberFields: ['is_official']
  });
  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const appliedFilterNoticeRef = useRef('');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTemplates();
  }, [pagination.current, pagination.pageSize, filters.keyword, filters.is_official, filters.category, filters.difficulty, filters.sort_by, filters.sort_order]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusField) return;
    return scrollAndFlashFocusField(focusField);
  }, [focusField]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        keyword: filters.keyword || undefined,
        is_official: filters.is_official,
        category: filters.category || undefined,
        difficulty: filters.difficulty || undefined,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order
      };
      const res = await templatesAPI.getList(params);
      const requestedFilters = {
        keyword: filters.keyword,
        is_official: filters.is_official,
        category: filters.category,
        difficulty: filters.difficulty,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order
      };
      applyAndNotifyAppliedFilters({
        label: '模板列表',
        requested: requestedFilters,
        applied: res.data?.applied_filters,
        lastSignatureRef: appliedFilterNoticeRef,
        setFilters,
        setKeywordInput
      });
      setTemplates(res.data.templates);
      setPagination({
        current: res.data.pagination.page,
        pageSize: res.data.pagination.limit,
        total: res.data.pagination.total,
      });
    } catch (error) {
      console.error('获取模板列表失败:', error);
      message.error('获取模板列表失败：' + (error.response?.data?.message || error.message));
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
    setSelectedRowKeys([]);
    resetListState();
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({ width: 32, height: 32, is_official: false, category: '图案', difficulty: '简单' });
    setModalVisible(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    let beadData = template.bead_data;
    let beadDataStr = '';
    
    // 将 JSON 对象转换为字符串显示
    if (typeof beadData === 'string') {
      try { 
        const parsed = JSON.parse(beadData);
        beadDataStr = JSON.stringify(parsed, null, 2);
      } catch { 
        beadDataStr = beadData;
      }
    } else if (beadData && typeof beadData === 'object') {
      beadDataStr = JSON.stringify(beadData, null, 2);
    }
    
    form.setFieldsValue({
      ...template,
      is_official: template.is_official === 1,
      bead_data: beadDataStr,
    });
    setModalVisible(true);
  };

  const handleDelete = async (templateId) => {
    try {
      await templatesAPI.delete(templateId);
      message.success('删除成功');
      fetchTemplates();
    } catch (error) {
      console.error('删除模板失败:', error);
      message.error('删除失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await templatesAPI.batchDelete(selectedRowKeys);
      message.success('批量删除成功');
      setSelectedRowKeys([]);
      fetchTemplates();
    } catch (error) {
      message.error('批量删除失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleBatchType = async (isOfficial) => {
    if (!selectedRowKeys.length) return;
    try {
      await templatesAPI.batchUpdateType(selectedRowKeys, isOfficial ? 1 : 0);
      message.success('批量更新类型成功');
      setSelectedRowKeys([]);
      fetchTemplates();
    } catch (error) {
      message.error('批量更新失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handlePreview = (template) => {
    let beadData = template.bead_data;
    if (typeof beadData === 'string') {
      try { beadData = JSON.parse(beadData); } catch { beadData = null; }
    }
    setPreviewData({ ...beadData, width: template.width, height: template.height });
    setPreviewVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (values.bead_data && typeof values.bead_data === 'string') {
        try {
          values.bead_data = JSON.parse(values.bead_data);
        } catch {
          message.error('图案数据 JSON 格式不正确');
          return;
        }
      }
      if (editingTemplate) {
        await templatesAPI.update(editingTemplate.id, values);
        message.success('更新成功');
      } else {
        await templatesAPI.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchTemplates();
    } catch (error) {
      console.error('保存模板失败:', error);
      message.error('保存失败：' + (error.response?.data?.message || error.message));
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: '预览',
      key: 'preview',
      width: 100,
      render: (_, record) => (
        <div onClick={() => handlePreview(record)} style={{ cursor: 'pointer' }}>
          <BeadPreview beadData={safeParseJson(record.bead_data)} width={record.width} height={record.height} />
        </div>
      ),
    },
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (v) => v || '图案'
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (v) => v || '简单'
    },
    {
      title: '类型',
      dataIndex: 'is_official',
      key: 'is_official',
      render: (isOfficial) => (
        <Tag color={isOfficial === 1 ? 'red' : 'blue'}>
          {isOfficial === 1 ? '官方' : '用户'}
        </Tag>
      ),
    },
    { title: '尺寸', key: 'size', render: (_, record) => `${record.width || 32} x ${record.height || 32}` },
    { title: '使用次数', dataIndex: 'download_count', key: 'download_count' },
    { title: '点赞数', dataIndex: 'like_count', key: 'like_count' },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>预览</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除该模板吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>📚 模板管理</Title>

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
            placeholder="搜索模板名称/描述"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            data-focus-field="keyword"
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
          <Button onClick={handleResetFilters}>重置筛选</Button>
          <Select
            placeholder="类型"
            value={filters.is_official}
            onChange={(v) => setFilter('is_official', v)}
            allowClear
            style={{ width: 120 }}
            status={focusField === 'is_official' ? 'warning' : undefined}
            data-focus-field="is_official"
          >
            <Option value={1}>官方</Option>
            <Option value={0}>用户</Option>
          </Select>
          <Select
            placeholder="分类"
            value={filters.category || undefined}
            onChange={(v) => setFilter('category', v || '')}
            allowClear
            style={{ width: 130 }}
            status={focusField === 'category' ? 'warning' : undefined}
            data-focus-field="category"
          >
            <Option value="图案">图案</Option>
            <Option value="动物">动物</Option>
            <Option value="卡通">卡通</Option>
            <Option value="其他">其他</Option>
          </Select>
          <Select
            placeholder="难度"
            value={filters.difficulty || undefined}
            onChange={(v) => setFilter('difficulty', v || '')}
            allowClear
            style={{ width: 120 }}
            status={focusField === 'difficulty' ? 'warning' : undefined}
            data-focus-field="difficulty"
          >
            <Option value="简单">简单</Option>
            <Option value="中等">中等</Option>
            <Option value="困难">困难</Option>
          </Select>
          <Select
            value={filters.sort_by}
            onChange={(v) => setFilter('sort_by', v)}
            style={{ width: 150 }}
            status={focusField === 'sort_by' ? 'warning' : undefined}
            data-focus-field="sort_by"
          >
            <Option value="created_at">按创建时间</Option>
            <Option value="download_count">按使用次数</Option>
            <Option value="like_count">按点赞数</Option>
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
          <Button disabled={!selectedRowKeys.length} onClick={() => handleBatchType(true)}>
            批量设为官方
          </Button>
          <Button disabled={!selectedRowKeys.length} onClick={() => handleBatchType(false)}>
            批量设为用户
          </Button>
          <Popconfirm
            title={`确定删除选中的 ${selectedRowKeys.length} 个模板吗？`}
            onConfirm={handleBatchDelete}
            okText="确定"
            cancelText="取消"
            disabled={!selectedRowKeys.length}
          >
            <Button danger disabled={!selectedRowKeys.length}>批量删除</Button>
          </Popconfirm>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加模板</Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={templates}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys)
          }}
          locale={{ emptyText: <Empty description="暂无模板数据" /> }}
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

      <Modal
        title={editingTemplate ? '编辑模板' : '添加模板'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select>
              <Option value="图案">图案</Option>
              <Option value="动物">动物</Option>
              <Option value="卡通">卡通</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="difficulty" label="难度" rules={[{ required: true, message: '请选择难度' }]}>
            <Select>
              <Option value="简单">简单</Option>
              <Option value="中等">中等</Option>
              <Option value="困难">困难</Option>
            </Select>
          </Form.Item>
          <Form.Item name="width" label="宽度">
            <InputNumber min={8} max={64} />
          </Form.Item>
          <Form.Item name="height" label="高度">
            <InputNumber min={8} max={64} />
          </Form.Item>
          <Form.Item name="bead_data" label="图案数据 (JSON)">
            <TextArea rows={6} placeholder='{"cells": [{"row": 0, "col": 0, "color": "red"}]}' />
          </Form.Item>
          <Form.Item name="is_official" label="类型" initialValue={false}>
            <Select>
              <Option value={false}>用户模板</Option>
              <Option value={true}>官方模板</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="模板预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width="auto"
      >
        {previewData && (
          <div style={{ textAlign: 'center' }}>
            <BeadPreview beadData={previewData} width={previewData.width} height={previewData.height} />
            <div style={{ marginTop: 16, color: '#666' }}>
              尺寸：{previewData.width || 32} x {previewData.height || 32}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Templates;
