import React, { useState, useEffect, useRef } from 'react';
import {
  Table, Card, Button, Input, Select, Space, Modal, Form, message, Popconfirm, Tag, Typography, Image, InputNumber, Alert,
} from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { productsAPI } from '../api';
import { useListState } from '../hooks/useListState';
import { applyAndNotifyAppliedFilters } from '../utils/appliedFilters';
import { scrollAndFlashFocusField } from '../utils/focusField';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Products = () => {
  const [searchParams] = useSearchParams();
  const focusField = searchParams.get('focus_field') || '';
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const { pagination, setPagination, filters, setFilters, setFilter, resetListState } = useListState({
    storageKey: 'admin:list:products',
    defaults: { keyword: '', category: '', sort_by: 'created_at', sort_order: 'desc' }
  });
  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const appliedFilterNoticeRef = useRef('');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchProducts();
  }, [pagination.current, pagination.pageSize, filters.keyword, filters.category, filters.sort_by, filters.sort_order]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusField) return;
    return scrollAndFlashFocusField(focusField);
  }, [focusField]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        keyword: filters.keyword || undefined,
        category: filters.category || undefined,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
      };
      const res = await productsAPI.getList(params);
      const requestedFilters = {
        keyword: filters.keyword,
        category: filters.category,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order
      };
      applyAndNotifyAppliedFilters({
        label: '商品列表',
        requested: requestedFilters,
        applied: res.data?.applied_filters,
        lastSignatureRef: appliedFilterNoticeRef,
        setFilters,
        setKeywordInput
      });
      setProducts(res.data.products);
      setPagination({
        current: res.data.pagination.page,
        pageSize: res.data.pagination.limit,
        total: res.data.pagination.total,
      });
    } catch (error) {
      console.error('获取商品列表失败:', error);
      message.error('获取商品列表失败：' + (error.response?.data?.message || error.message));
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

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    form.setFieldsValue({ is_on_sale: true });
    setModalVisible(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    form.setFieldsValue({
      ...product,
      is_on_sale: product.is_on_sale === 1,
    });
    setModalVisible(true);
  };

  const handleDelete = async (productId) => {
    try {
      await productsAPI.delete(productId);
      message.success('删除成功');
      fetchProducts();
    } catch (error) {
      console.error('删除商品失败:', error);
      message.error('删除失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, values);
        message.success('更新成功');
      } else {
        await productsAPI.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchProducts();
    } catch (error) {
      console.error('保存商品失败:', error);
      message.error('保存失败：' + (error.response?.data?.message || error.message));
    }
  };

  const categoryMap = {
    set: { text: '套装', color: 'blue' },
    board: { text: '底板', color: 'green' },
    tool: { text: '工具', color: 'orange' },
    bead: { text: '拼豆', color: 'purple' },
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: '图片',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 80,
      render: (url) => (
        <Image
          src={url || 'https://via.placeholder.com/60'}
          width={50}
          height={50}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          fallback="https://via.placeholder.com/60"
        />
      ),
    },
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      render: (category) => {
        const { text, color } = categoryMap[category] || { text: category, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (value) => `¥${Number(value || 0).toFixed(2)}`,
    },
    {
      title: '原价',
      dataIndex: 'original_price',
      key: 'original_price',
      render: (value) => value ? `¥${Number(value).toFixed(2)}` : '-',
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock) => (
        <Tag color={stock > 0 ? 'green' : 'red'}>{stock > 0 ? stock : '缺货'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_on_sale',
      key: 'is_on_sale',
      render: (isOnSale) => (
        <Tag color={isOnSale === 1 ? 'green' : 'default'}>{isOnSale === 1 ? '上架' : '下架'}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除该商品吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>🛒 商品管理</Title>

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
            placeholder="搜索商品名称/描述"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
            data-focus-field="keyword"
          />
          <Select
            placeholder="类别筛选"
            value={filters.category}
            onChange={(v) => setFilter('category', v || '')}
            style={{ width: 120 }}
            allowClear
            status={focusField === 'category' ? 'warning' : undefined}
            data-focus-field="category"
          >
            <Option value="set">套装</Option>
            <Option value="board">底板</Option>
            <Option value="tool">工具</Option>
            <Option value="bead">拼豆</Option>
          </Select>
          <Select
            value={filters.sort_by}
            onChange={(v) => setFilter('sort_by', v)}
            style={{ width: 130 }}
            status={focusField === 'sort_by' ? 'warning' : undefined}
            data-focus-field="sort_by"
          >
            <Option value="created_at">按创建时间</Option>
            <Option value="price">按价格</Option>
            <Option value="stock">按库存</Option>
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加商品</Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={products}
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

      <Modal
        title={editingProduct ? '编辑商品' : '添加商品'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="商品描述">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="category" label="类别" rules={[{ required: true, message: '请选择类别' }]}>
            <Select>
              <Option value="set">套装</Option>
              <Option value="board">底板</Option>
              <Option value="tool">工具</Option>
              <Option value="bead">拼豆</Option>
            </Select>
          </Form.Item>
          <Form.Item name="price" label="售价" rules={[{ required: true, message: '请输入售价' }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
          </Form.Item>
          <Form.Item name="original_price" label="原价">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
          </Form.Item>
          <Form.Item name="stock" label="库存" rules={[{ required: true, message: '请输入库存' }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="image_url" label="商品图片 URL">
            <Input />
          </Form.Item>
          <Form.Item name="is_on_sale" label="状态" valuePropName="checked" initialValue={true}>
            <Select>
              <Option value={true}>上架</Option>
              <Option value={false}>下架</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;
